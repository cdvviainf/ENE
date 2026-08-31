import { prisma } from '../../../lib/prisma.js'
import { idsPorTexto } from '../../../shared/busqueda.js'
import type { ComunaCreateInput, ComunaUpdateInput } from './comunas.schema.js'

interface ComunaFiltros {
  q?: string
  provinciaId?: number
}

const includeJerarquia = {
  provincia: {
    select: {
      id: true,
      codigo: true,
      nombre: true,
      region: { select: { id: true, codigo: true, nombre: true } },
    },
  },
} as const

export async function findAllComunas(page: number, limit: number, filtros: ComunaFiltros) {
  const idsTexto = filtros.q ? await idsPorTexto('comuna', ['codigo', 'nombre'], filtros.q) : null
  const where = {
    eliminadoEn: null,
    ...(idsTexto ? { id: { in: idsTexto } } : {}),
    ...(filtros.provinciaId ? { provinciaId: filtros.provinciaId } : {}),
  }

  const [data, total] = await Promise.all([
    prisma.comuna.findMany({
      where,
      orderBy: { codigo: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      include: includeJerarquia,
    }),
    prisma.comuna.count({ where }),
  ])
  return { data, total }
}

// RN-MAN-05: una comuna eliminada sigue siendo accesible por id.
export async function findComunaById(id: number) {
  return prisma.comuna.findFirst({ where: { id }, include: includeJerarquia })
}

export async function findComunaByCodigo(codigo: string, excluirId?: number) {
  return prisma.comuna.findFirst({
    where: { codigo, eliminadoEn: null, ...(excluirId ? { id: { not: excluirId } } : {}) },
  })
}

export async function contarReferenciasActivas(id: number) {
  const [direccionesCliente, direccionesProveedor] = await Promise.all([
    prisma.clienteDireccion.count({ where: { comunaId: id, eliminadoEn: null } }),
    prisma.proveedorDireccion.count({ where: { comunaId: id, eliminadoEn: null } }),
  ])
  return { direccionesCliente, direccionesProveedor }
}

export async function createComuna(data: ComunaCreateInput, creadoPor: string) {
  return prisma.comuna.create({ data: { ...data, creadoPor } })
}

export async function updateComuna(id: number, data: ComunaUpdateInput, actualizadoPor: string) {
  return prisma.comuna.update({ where: { id }, data: { ...data, actualizadoPor } })
}

export async function softDeleteComuna(id: number, eliminadoPor: string) {
  return prisma.comuna.update({ where: { id }, data: { eliminadoEn: new Date(), eliminadoPor } })
}
