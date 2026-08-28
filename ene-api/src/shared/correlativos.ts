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
