import { prisma } from '../../../lib/prisma.js'
import { idsPorTexto } from '../../../shared/busqueda.js'
import type { PaisCreateInput, PaisUpdateInput } from './paises.schema.js'

export async function findAllPaises(page: number, limit: number, q?: string) {
  const idsTexto = q ? await idsPorTexto('pais', ['codigo', 'nombre'], q) : null
  const where = {
    eliminadoEn: null,
    ...(idsTexto ? { id: { in: idsTexto } } : {}),
  }

  const [data, total] = await Promise.all([
    prisma.pais.findMany({
      where,
      orderBy: { nombre: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.pais.count({ where }),
  ])
  return { data, total }
}

// RN-MAN-05: un país eliminado sigue siendo accesible por id.
export async function findPaisById(id: number) {
  return prisma.pais.findFirst({ where: { id } })
}

export async function findPaisByCodigo(codigo: string, excluirId?: number) {
  return prisma.pais.findFirst({
    where: { codigo, eliminadoEn: null, ...(excluirId ? { id: { not: excluirId } } : {}) },
  })
}

export async function contarReferenciasActivas(id: number) {
  const [direccionesCliente, direccionesProveedor] = await Promise.all([
    prisma.clienteDireccion.count({ where: { paisId: id, eliminadoEn: null } }),
    prisma.proveedorDireccion.count({ where: { paisId: id, eliminadoEn: null } }),
  ])
  return { direccionesCliente, direccionesProveedor }
}

export async function createPais(data: PaisCreateInput, creadoPor: string) {
  return prisma.pais.create({ data: { ...data, creadoPor } })
}

export async function updatePais(id: number, data: PaisUpdateInput, actualizadoPor: string) {
  return prisma.pais.update({ where: { id }, data: { ...data, actualizadoPor } })
}

export async function softDeletePais(id: number, eliminadoPor: string) {
  return prisma.pais.update({ where: { id }, data: { eliminadoEn: new Date(), eliminadoPor } })
}
