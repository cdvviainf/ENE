import { prisma } from '../../../lib/prisma.js'
import { idsPorTexto } from '../../../shared/busqueda.js'
import type { RegionCreateInput, RegionUpdateInput } from './regiones.schema.js'

export async function findAllRegiones(page: number, limit: number, q?: string) {
  const idsTexto = q ? await idsPorTexto('region', ['codigo', 'nombre'], q) : null
  const where = {
    eliminadoEn: null,
    ...(idsTexto ? { id: { in: idsTexto } } : {}),
  }

  const [data, total] = await Promise.all([
    prisma.region.findMany({
      where,
      orderBy: { codigo: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { _count: { select: { provincias: true } } },
    }),
    prisma.region.count({ where }),
  ])
  return { data, total }
}

// RN-MAN-05: una región eliminada sigue siendo accesible por id.
export async function findRegionById(id: number) {
  return prisma.region.findFirst({ where: { id } })
}

export async function findRegionByCodigo(codigo: string, excluirId?: number) {
  return prisma.region.findFirst({
    where: { codigo, eliminadoEn: null, ...(excluirId ? { id: { not: excluirId } } : {}) },
  })
}

export async function contarReferenciasActivas(id: number) {
  const provincias = await prisma.provincia.count({ where: { regionId: id, eliminadoEn: null } })
  return { provincias }
}

export async function createRegion(data: RegionCreateInput, creadoPor: string) {
  return prisma.region.create({ data: { ...data, creadoPor } })
}

export async function updateRegion(id: number, data: RegionUpdateInput, actualizadoPor: string) {
  return prisma.region.update({ where: { id }, data: { ...data, actualizadoPor } })
}

export async function softDeleteRegion(id: number, eliminadoPor: string) {
  return prisma.region.update({ where: { id }, data: { eliminadoEn: new Date(), eliminadoPor } })
}
