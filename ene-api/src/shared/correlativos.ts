import type { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { tomarLockPorTexto, LOCK_MAESTRO_CODIGO_CORRELATIVO } from './advisory-locks.js'
import { conflicto } from './errors.js'

// Entidades con correlativo real (RN-COR-01): a diferencia de PERFIL/USUARIO
// (sugerencia en vivo sin lock, ver config/prefijos-codigo), estas cuatro
// consumen `PrefijoCodigo.ultimoValor` dentro de un advisory lock al crear.
export const ENTIDADES_CORRELATIVO_MAESTRO = ['CLIENTE', 'PROVEEDOR', 'GRUPO', 'SERVICIO'] as const
export type EntidadCorrelativoMaestro = (typeof ENTIDADES_CORRELATIVO_MAESTRO)[number]

// Sin guión: Docs/mantenedores.md §1-6 muestra los ejemplos así (CL0001,
// PR0001, GR00001, SV0001) — a diferencia de la sugerencia en vivo de
// PERFIL/USUARIO, que sí lleva guión.
function formatearCodigo(prefijo: string, digitos: number, numero: number): string {
  return `${prefijo}${String(numero).padStart(digitos, '0')}`
}

/**
 * Sugerencia de solo lectura para precargar el formulario de alta
 * (RN-MAN-02). No reserva nada ni toma lock: el valor real se recalcula
 * dentro del lock en `resolverCodigo`, así que dos sugerencias concurrentes
 * pueden mostrar el mismo número sin que eso sea un problema.
 */
export async function peekSiguienteCodigo(entidad: EntidadCorrelativoMaestro): Promise<string | null> {
  const prefijo = await prisma.prefijoCodigo.findUnique({ where: { entidad } })
  if (!prefijo) return null
  return formatearCodigo(prefijo.prefijo, prefijo.digitos, prefijo.ultimoValor + 1)
}

/**
 * Resuelve el código definitivo dentro de la transacción de creación
 * (RN-COR-01, RN-MAN-02). Debe llamarse ANTES del `create` de la entidad,
 * dentro del mismo `tx`.
 *
 * - Si `codigoEnviado` coincide con el sugerido recalculado dentro del lock,
 *   se consume: incrementa `ultimoValor` y lo devuelve tal cual.
 * - Si el usuario lo cambió, NO incrementa `ultimoValor` — evita huecos en la
 *   numeración —; la unicidad del código editado la garantiza la restricción
 *   `@unique` de la tabla del maestro (el `create` posterior falla con
 *   P2002 si choca, y el servicio de cada módulo lo traduce a CONFLICT).
 */
export async function resolverCodigo(
  tx: Prisma.TransactionClient,
  entidad: EntidadCorrelativoMaestro,
  codigoEnviado: string,
): Promise<string> {
  await tomarLockPorTexto(tx, LOCK_MAESTRO_CODIGO_CORRELATIVO, entidad)

  const prefijo = await tx.prefijoCodigo.findUnique({ where: { entidad } })
  if (!prefijo) throw conflicto(`No hay prefijo de código configurado para la entidad ${entidad}`)

  const sugerido = formatearCodigo(prefijo.prefijo, prefijo.digitos, prefijo.ultimoValor + 1)

  if (codigoEnviado === sugerido) {
    await tx.prefijoCodigo.update({ where: { entidad }, data: { ultimoValor: prefijo.ultimoValor + 1 } })
  }

  return codigoEnviado
}

// ─── Correlativo anual de documentos (Cotización, OT, OC) ───────────────────
// A diferencia de los maestros, el número del documento NO lo digita el
// usuario: lo asigna el sistema, es correlativo por año y con guión
// (COT-2026-0001). RN-COT-03/RN-OT-01: solo lo consume quien realmente crea el
// documento (una cotización perdida no consume número de OT). El lock lo pasa
// el módulo llamador (491001 Cotización, 491002 OT, 491003 OC).

/** Reserva y devuelve el siguiente número correlativo anual para `entidad`
 * (que debe tener `incluyeAnio = true` en `PrefijoCodigo`). Debe llamarse
 * DENTRO de la transacción que crea el documento y DESPUÉS de tomar el
 * advisory lock del correlativo — así dos altas concurrentes del mismo año no
 * pueden reservar el mismo número (CLAUDE.md §7). Al cambiar de año reinicia
 * `ultimoValor` a 0 y actualiza `anio`, para que el primer documento del año
 * nuevo sea el 0001. */
export async function generarNumeroAnual(
  tx: Prisma.TransactionClient,
  entidad: string,
  anio: number,
): Promise<string> {
  const prefijo = await tx.prefijoCodigo.findUnique({ where: { entidad } })
  if (!prefijo) throw conflicto(`No hay prefijo de código configurado para la entidad ${entidad}`)
  if (!prefijo.incluyeAnio) {
    throw conflicto(`El prefijo de ${entidad} no incluye año; use resolverCodigo (RN-COR-01)`)
  }

  // Reinicio de año: si el contador quedó de un año anterior, arranca en 0.
  const base = prefijo.anio === anio ? prefijo.ultimoValor : 0
  const siguiente = base + 1

  await tx.prefijoCodigo.update({
    where: { entidad },
    data: { ultimoValor: siguiente, anio },
  })

  return `${prefijo.prefijo}-${anio}-${String(siguiente).padStart(prefijo.digitos, '0')}`
}
