import { prisma } from '../../../lib/prisma.js'
import type { IndicadoresUpdateInput } from './indicadores.schema.js'

// RN-IMP-01: singleton. La fila la garantiza el seed/la migración; si faltara
// (ambiente sin seed) se crea al vuelo con las tasas por defecto.
export async function findIndicadores() {
  return prisma.indicadores.findFirst({ orderBy: { id: 'asc' } })
}

export async function ensureIndicadores(creadoPor: string) {
  const existente = await findIndicadores()
  if (existente) return existente
  return prisma.indicadores.create({ data: { creadoPor } })
}

export async function updateIndicadores(id: number, data: IndicadoresUpdateInput, actualizadoPor: string) {
  return prisma.indicadores.update({ where: { id }, data: { ...data, actualizadoPor } })
}
