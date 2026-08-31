import { prisma } from '../../../lib/prisma.js'
import { idsPorTexto } from '../../../shared/busqueda.js'
import type { CondicionPagoCreateInput, CondicionPagoUpdateInput } from './condiciones-pago.schema.js'

const includeCuotas = { cuotas: { orderBy: { numeroCuota: 'asc' } } } as const

export async function findAllCondicionesPago(page: number, limit: number, q?: string) {
  const idsTexto = q ? await idsPorTexto('condicion_pago', ['codigo', 'nombre'], q) : null
  const where = {
    eliminadoEn: null,
    ...(idsTexto ? { id: { in: idsTexto } } : {}),
  }

  const [data, total] = await Promise.all([
    prisma.condicionPago.findMany({
      where,
      orderBy: { nombre: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      include: includeCuotas,
    }),
    prisma.condicionPago.count({ where }),
  ])
  return { data, total }
}

// RN-MAN-05: una condición de pago eliminada sigue siendo accesible por id.
export async function findCondicionPagoById(id: number) {
  return prisma.condicionPago.findFirst({ where: { id }, include: includeCuotas })
}

export async function findCondicionPagoByCodigo(codigo: string, excluirId?: number) {
  return prisma.condicionPago.findFirst({
    where: { codigo, eliminadoEn: null, ...(excluirId ? { id: { not: excluirId } } : {}) },
  })
}

export async function contarReferenciasActivas(id: number) {
  const [clientes, proveedores] = await Promise.all([
    prisma.cliente.count({ where: { condicionPagoId: id, eliminadoEn: null } }),
    prisma.proveedor.count({ where: { condicionPagoId: id, eliminadoEn: null } }),
  ])
  return { clientes, proveedores }
}

export async function createCondicionPago(data: CondicionPagoCreateInput, creadoPor: string) {
  const { cuotas, ...cabecera } = data
  return prisma.condicionPago.create({
    data: {
      ...cabecera,
      creadoPor,
      cuotas: { create: cuotas.map((c, i) => ({ ...c, numeroCuota: i + 1 })) },
    },
    include: includeCuotas,
  })
}

// Las cuotas no se editan una a una: cada update reemplaza el set completo
// dentro de una transacción, igual que el patrón portado de FAS.
export async function updateCondicionPago(id: number, data: CondicionPagoUpdateInput, actualizadoPor: string) {
  const { cuotas, ...cabecera } = data
  return prisma.$transaction(async (tx) => {
    if (cuotas !== undefined) {
      await tx.condicionPagoCuota.deleteMany({ where: { condicionPagoId: id } })
      await tx.condicionPagoCuota.createMany({
        data: cuotas.map((c, i) => ({ condicionPagoId: id, ...c, numeroCuota: i + 1 })),
      })
    }
    return tx.condicionPago.update({
      where: { id },
      data: { ...cabecera, actualizadoPor },
      include: includeCuotas,
    })
  })
}

export async function softDeleteCondicionPago(id: number, eliminadoPor: string) {
  return prisma.condicionPago.update({ where: { id }, data: { eliminadoEn: new Date(), eliminadoPor } })
}
