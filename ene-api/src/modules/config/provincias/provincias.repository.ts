import { prisma } from '../../../lib/prisma.js'
import { idsPorTexto } from '../../../shared/busqueda.js'
import type { ProvinciaCreateInput, ProvinciaUpdateInput } from './provincias.schema.js'

interface ProvinciaFiltros {
  q?: string
  regionId?: number
}

export async function findAllProvincias(page: number, limit: number, filtros: ProvinciaFiltros) {
  const idsTexto = filtros.q ? await idsPorTexto('provincia', ['codigo', 'nombre'], filtros.q) : null
  const where = {
    eliminadoEn: null,
    ...(idsTexto ? { id: { in: idsTexto } } : {}),
    ...(filtros.regionId ? { regionId: filtros.regionId } : {}),
  }

  const [data, total] = await Promise.all([
    prisma.provincia.findMany({
      where,
      orderBy: { codigo: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        region: { select: { id: true, codigo: true, nombre: true } },
        _count: { select: { comunas: true } },
      },
    }),
    prisma.provincia.count({ where }),
  ])
  return { data, total }
}

// RN-MAN-05: una provincia eliminada sigue siendo accesible por id.
export async function findProvinciaById(id: number) {
  return prisma.provincia.findFirst({
    where: { id },
    include: { region: { select: { id: true, codigo: true, nombre: true } } },
  })
}

export async function findProvinciaByCodigo(codigo: string, excluirId?: number) {
  return prisma.provincia.findFirst({
    where: { codigo, eliminadoEn: null, ...(excluirId ? { id: { not: excluirId } } : {}) },
  })
}

export async function contarReferenciasActivas(id: number) {
  const comunas = await prisma.comuna.count({ where: { provinciaId: id, eliminadoEn: null } })
  return { comunas }
}

export async function createProvincia(data: ProvinciaCreateInput, creadoPor: string) {
  return prisma.provincia.create({ data: { ...data, creadoPor } })
}

export async function updateProvincia(id: number, data: ProvinciaUpdateInput, actualizadoPor: string) {
  return prisma.provincia.update({ where: { id }, data: { ...data, actualizadoPor } })
}

export async function softDeleteProvincia(id: number, eliminadoPor: string) {
  return prisma.provincia.update({ where: { id }, data: { eliminadoEn: new Date(), eliminadoPor } })
}
