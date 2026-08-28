import { prisma } from '../../../lib/prisma.js'
import { idsPorTexto } from '../../../shared/busqueda.js'
import type { ZonaCreateInput, ZonaUpdateInput } from './zonas.schema.js'

export async function findAllZonas(page: number, limit: number, q?: string) {
  const idsTexto = q ? await idsPorTexto('zona', ['codigo', 'nombre', 'nombreEn'], q) : null
  const where = {
    eliminadoEn: null,
    ...(idsTexto ? { id: { in: idsTexto } } : {}),
  }

  const [data, total] = await Promise.all([
    prisma.zona.findMany({
      where,
      orderBy: { codigo: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { _count: { select: { servicios: true } } },
    }),
    prisma.zona.count({ where }),
  ])
  return { data, total }
}

// RN-MAN-05: una zona eliminada sigue siendo accesible por id.
export async function findZonaById(id: number) {
  return prisma.zona.findFirst({ where: { id } })
}

export async function findZonaByCodigo(codigo: string, excluirId?: number) {
  return prisma.zona.findFirst({
    where: { codigo, eliminadoEn: null, ...(excluirId ? { id: { not: excluirId } } : {}) },
  })
}

export async function createZona(data: ZonaCreateInput, creadoPor: string) {
  return prisma.zona.create({ data: { ...data, creadoPor } })
}

export async function updateZona(id: number, data: ZonaUpdateInput, actualizadoPor: string) {
  return prisma.zona.update({ where: { id }, data: { ...data, actualizadoPor } })
}

export async function softDeleteZona(id: number, eliminadoPor: string) {
  return prisma.zona.update({ where: { id }, data: { eliminadoEn: new Date(), eliminadoPor } })
}
