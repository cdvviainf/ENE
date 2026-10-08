import { prisma } from '../../../lib/prisma.js'
import { idsPorTexto } from '../../../shared/busqueda.js'
import type { TipoDocumentoCreateInput, TipoDocumentoUpdateInput } from './tipos-documento.schema.js'

export async function findAllTiposDocumento(page: number, limit: number, q?: string) {
  const idsTexto = q ? await idsPorTexto('tipo_documento', ['codigo', 'nombre'], q) : null
  const where = {
    eliminadoEn: null,
    ...(idsTexto ? { id: { in: idsTexto } } : {}),
  }

  const [data, total] = await Promise.all([
    prisma.tipoDocumento.findMany({
      where,
      orderBy: { nombre: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.tipoDocumento.count({ where }),
  ])
  return { data, total }
}

// RN-MAN-05: un tipo de documento eliminado sigue siendo accesible por id.
export async function findTipoDocumentoById(id: number) {
  return prisma.tipoDocumento.findFirst({ where: { id } })
}

export async function findTipoDocumentoByCodigo(codigo: string, excluirId?: number) {
  return prisma.tipoDocumento.findFirst({
    where: { codigo, eliminadoEn: null, ...(excluirId ? { id: { not: excluirId } } : {}) },
  })
}

export async function contarReferenciasActivas(id: number) {
  return prisma.proveedor.count({ where: { tipoDocumentoId: id, eliminadoEn: null } })
}

export async function createTipoDocumento(data: TipoDocumentoCreateInput, creadoPor: string) {
  return prisma.tipoDocumento.create({ data: { ...data, creadoPor } })
}

export async function updateTipoDocumento(id: number, data: TipoDocumentoUpdateInput, actualizadoPor: string) {
  return prisma.tipoDocumento.update({ where: { id }, data: { ...data, actualizadoPor } })
}

export async function softDeleteTipoDocumento(id: number, eliminadoPor: string) {
  return prisma.tipoDocumento.update({ where: { id }, data: { eliminadoEn: new Date(), eliminadoPor } })
}
