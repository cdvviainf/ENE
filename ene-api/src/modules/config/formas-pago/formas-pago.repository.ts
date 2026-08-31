import { prisma } from '../../../lib/prisma.js'
import { idsPorTexto } from '../../../shared/busqueda.js'
import type { FormaPagoCreateInput, FormaPagoUpdateInput } from './formas-pago.schema.js'

export async function findAllFormasPago(page: number, limit: number, q?: string) {
  const idsTexto = q ? await idsPorTexto('forma_pago', ['codigo', 'nombre'], q) : null
  const where = {
    eliminadoEn: null,
    ...(idsTexto ? { id: { in: idsTexto } } : {}),
  }

  const [data, total] = await Promise.all([
    prisma.formaPago.findMany({
      where,
      orderBy: { nombre: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.formaPago.count({ where }),
  ])
  return { data, total }
}

// RN-MAN-05: una forma de pago eliminada sigue siendo accesible por id.
export async function findFormaPagoById(id: number) {
  return prisma.formaPago.findFirst({ where: { id } })
}

export async function findFormaPagoByCodigo(codigo: string, excluirId?: number) {
  return prisma.formaPago.findFirst({
    where: { codigo, eliminadoEn: null, ...(excluirId ? { id: { not: excluirId } } : {}) },
  })
}

export async function contarReferenciasActivas(id: number) {
  const [clientes, proveedores] = await Promise.all([
    prisma.cliente.count({ where: { formaPagoId: id, eliminadoEn: null } }),
    prisma.proveedor.count({ where: { formaPagoId: id, eliminadoEn: null } }),
  ])
  return { clientes, proveedores }
}

export async function createFormaPago(data: FormaPagoCreateInput, creadoPor: string) {
  return prisma.formaPago.create({ data: { ...data, creadoPor } })
}

export async function updateFormaPago(id: number, data: FormaPagoUpdateInput, actualizadoPor: string) {
  return prisma.formaPago.update({ where: { id }, data: { ...data, actualizadoPor } })
}

export async function softDeleteFormaPago(id: number, eliminadoPor: string) {
  return prisma.formaPago.update({ where: { id }, data: { eliminadoEn: new Date(), eliminadoPor } })
}
