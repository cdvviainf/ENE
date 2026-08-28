import { prisma } from '../../../lib/prisma.js'
import type { PrefijoCodigoUpdateInput } from './prefijos-codigo.schema.js'
import type { EntidadSugerenciaViva } from './prefijos-codigo.schema.js'

export async function findAllPrefijos() {
  return prisma.prefijoCodigo.findMany({ orderBy: { entidad: 'asc' } })
}

export async function findPrefijoById(id: number) {
  return prisma.prefijoCodigo.findUnique({ where: { id } })
}

export async function findPrefijoByEntidad(entidad: string) {
  return prisma.prefijoCodigo.findUnique({ where: { entidad } })
}

export async function updatePrefijo(id: number, data: PrefijoCodigoUpdateInput, actualizadoPor: string) {
  return prisma.prefijoCodigo.update({ where: { id }, data: { ...data, actualizadoPor } })
}

// Delegado Prisma y campo `codigo` por entidad con sugerencia en vivo. Ambos
// modelos ya exponen `codigo: String @unique` (CLAUDE.md §0).
const DELEGADO: Record<EntidadSugerenciaViva, () => Promise<{ codigo: string }[]>> = {
  PERFIL: () => prisma.perfil.findMany({ select: { codigo: true } }),
  USUARIO: () => prisma.usuario.findMany({ select: { codigo: true } }),
}

/**
 * Sugerencia en vivo: máximo sufijo numérico entre los códigos existentes que
 * empiezan con el prefijo configurado, + 1. No reserva ni persiste nada — a
 * diferencia del correlativo transaccional (RN-COR-01), es solo un punto de
 * partida editable (RN-PER-07).
 */
export async function calcularSiguienteCodigo(entidad: EntidadSugerenciaViva): Promise<string | null> {
  const prefijoCfg = await findPrefijoByEntidad(entidad)
  if (!prefijoCfg) return null

  const registros = await DELEGADO[entidad]()
  const prefijoUpper = prefijoCfg.prefijo.toUpperCase()

  let maximo = 0
  for (const { codigo } of registros) {
    if (!codigo.toUpperCase().startsWith(prefijoUpper)) continue
    const resto = codigo.slice(prefijoCfg.prefijo.length).replace(/^-/, '')
    const numero = Number.parseInt(resto, 10)
    if (Number.isFinite(numero) && numero > maximo) maximo = numero
  }

  return `${prefijoCfg.prefijo}-${String(maximo + 1).padStart(prefijoCfg.digitos, '0')}`
}
