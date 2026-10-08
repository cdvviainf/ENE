import { prisma } from '../../../lib/prisma.js'
import type { EmpresaUpdateInput } from './empresa.schema.js'

// RN-EMP-01: singleton. La fila única se garantiza por el seed; si faltara
// (ambiente sin seed) se crea al vuelo con el nombre por defecto.
export async function findEmpresa() {
  return prisma.empresa.findFirst({ orderBy: { id: 'asc' } })
}

export async function ensureEmpresa(creadoPor: string) {
  const existente = await findEmpresa()
  if (existente) return existente
  return prisma.empresa.create({ data: { nombre: 'Extremo Norte Expediciones', creadoPor } })
}

export async function updateEmpresa(id: number, data: EmpresaUpdateInput, actualizadoPor: string) {
  return prisma.empresa.update({ where: { id }, data: { ...data, actualizadoPor } })
}

export async function updateLogo(id: number, logoStorageKey: string, logoMimeType: string, actualizadoPor: string) {
  return prisma.empresa.update({ where: { id }, data: { logoStorageKey, logoMimeType, actualizadoPor } })
}
