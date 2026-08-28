import { prisma } from '../../../lib/prisma.js'
import { idsPorTexto } from '../../../shared/busqueda.js'
import type { TipoServicioCreateInput, TipoServicioUpdateInput } from './tipos-servicio.schema.js'

export async function findAllTiposServicio(page: number, limit: number, q?: string) {
  const idsTexto = q ? await idsPorTexto('tipo_servicio', ['codigo', 'nombre'], q) : null
  const where = {
    eliminadoEn: null,
    ...(idsTexto ? { id: { in: idsTexto } } : {}),
  }

  const [data, total] = await Promise.all([
    prisma.tipoServicio.findMany({
      where,
      orderBy: { codigo: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { _count: { select: { servicios: true, proveedores: true } } },
    }),
    prisma.tipoServicio.count({ where }),
  ])
  return { data, total }
}

// RN-MAN-05: un tipo de servicio eliminado sigue siendo accesible por id.
export async function findTipoServicioById(id: number) {
  return prisma.tipoServicio.findFirst({ where: { id } })
}

export async function findTipoServicioByCodigo(codigo: string, excluirId?: number) {
  return prisma.tipoServicio.findFirst({
    where: { codigo, eliminadoEn: null, ...(excluirId ? { id: { not: excluirId } } : {}) },
  })
}

export async function contarReferenciasActivas(id: number) {
  const [servicios, proveedores] = await Promise.all([
    prisma.servicio.count({ where: { tipoServicioId: id, eliminadoEn: null } }),
    prisma.proveedor.count({ where: { tipoServicioId: id, eliminadoEn: null } }),
  ])
  return { servicios, proveedores }
}

export async function createTipoServicio(data: TipoServicioCreateInput, creadoPor: string) {
  return prisma.tipoServicio.create({ data: { ...data, creadoPor } })
}

export async function updateTipoServicio(id: number, data: TipoServicioUpdateInput, actualizadoPor: string) {
  return prisma.tipoServicio.update({ where: { id }, data: { ...data, actualizadoPor } })
}

export async function softDeleteTipoServicio(id: number, eliminadoPor: string) {
  return prisma.tipoServicio.update({ where: { id }, data: { eliminadoEn: new Date(), eliminadoPor } })
}
