import type { Moneda, Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { idsPorTexto } from '../../shared/busqueda.js'
import type { TarifaVentaValorInput } from './tarifas-venta.schema.js'

type Db = Prisma.TransactionClient | typeof prisma

const INCLUYE_RELACIONES = {
  servicio: { select: { id: true, codigo: true, nombre: true, modeloTarifa: true } },
  valores: { orderBy: [{ paxDesde: 'asc' }, { acomodacion: 'asc' }] },
} satisfies Prisma.TarifaVentaInclude

/** Servicios vigentes (filtrados por texto) con sus tarifas de venta ACTIVAS.
 * Sin paginar: el estado de cada servicio (RN-TVE-04) se calcula en el service
 * y el filtro por estado necesita el conjunto completo antes de paginar. */
export async function serviciosConTarifasActivas(q?: string) {
  const idsTexto = q ? await idsPorTexto('servicio', ['codigo', 'nombre', 'nombreEn'], q) : null
  return prisma.servicio.findMany({
    where: { eliminadoEn: null, ...(idsTexto ? { id: { in: idsTexto } } : {}) },
    orderBy: { codigo: 'asc' },
    select: {
      id: true,
      codigo: true,
      nombre: true,
      modeloTarifa: true,
      zona: { select: { id: true, nombre: true } },
      tipoServicio: { select: { id: true, nombre: true } },
      tarifasVenta: {
        where: { activo: true, eliminadoEn: null },
        select: { id: true, moneda: true, vigenciaDesde: true, vigenciaHasta: true, version: true },
      },
    },
  })
}

/** Historial completo (activas e inactivas) de un servicio. */
export async function findTarifasDeServicio(servicioId: number) {
  return prisma.tarifaVenta.findMany({
    where: { servicioId, eliminadoEn: null },
    orderBy: [{ moneda: 'asc' }, { vigenciaDesde: 'desc' }, { version: 'desc' }],
    include: INCLUYE_RELACIONES,
  })
}

// RN-MAN-05: accesible por id aunque esté eliminada.
export async function findTarifaVentaById(id: number, db: Db = prisma) {
  return db.tarifaVenta.findFirst({ where: { id }, include: INCLUYE_RELACIONES })
}

/** RN-TVE-03: candidatas para el chequeo de solape (activas del mismo servicio
 * y moneda). La comparación de rangos la hace `seSolapanVigencias`. */
export async function tarifasActivasDe(db: Db, servicioId: number, moneda: Moneda) {
  return db.tarifaVenta.findMany({
    where: { servicioId, moneda, activo: true, eliminadoEn: null },
    select: { id: true, version: true, vigenciaDesde: true, vigenciaHasta: true },
  })
}

/** Activas de un servicio en cualquier moneda, con valores — para resolver la
 * tarifa aplicable a una fecha (OT directa, RN-TVE-06). */
export async function tarifasActivasConValores(servicioId: number, db: Db = prisma) {
  return db.tarifaVenta.findMany({
    where: { servicioId, activo: true, eliminadoEn: null },
    include: { valores: true },
  })
}

function valoresCreate(valores: TarifaVentaValorInput[]) {
  return valores.map((v) => ({
    modelo: v.modelo,
    paxDesde: v.paxDesde ?? null,
    paxHasta: v.paxHasta ?? null,
    acomodacion: v.acomodacion ?? null,
    valor: v.valor,
  }))
}

export async function createTarifaVentaTx(
  tx: Prisma.TransactionClient,
  data: { servicioId: number; moneda: Moneda; vigenciaDesde: Date; vigenciaHasta?: Date; valores: TarifaVentaValorInput[] },
  creadoPor: string,
  version: number,
) {
  return tx.tarifaVenta.create({
    data: {
      servicioId: data.servicioId,
      moneda: data.moneda,
      vigenciaDesde: data.vigenciaDesde,
      vigenciaHasta: data.vigenciaHasta ?? null,
      version,
      creadoPor,
      valores: { create: valoresCreate(data.valores) },
    },
    include: INCLUYE_RELACIONES,
  })
}

export async function desactivarTarifaVenta(tx: Prisma.TransactionClient, id: number, actualizadoPor: string) {
  return tx.tarifaVenta.update({ where: { id }, data: { activo: false, actualizadoPor } })
}

/** Edición en el lugar (RN-TVE-05): reemplaza vigencia y el set completo de
 * valores de la misma versión. Ninguna línea de OT referencia los valores (la
 * venta queda copiada en la línea), así que borrarlos es seguro. */
export async function actualizarTarifaVentaTx(
  tx: Prisma.TransactionClient,
  id: number,
  data: { vigenciaDesde: Date; vigenciaHasta?: Date; valores: TarifaVentaValorInput[] },
  actualizadoPor: string,
) {
  await tx.tarifaVentaValor.deleteMany({ where: { tarifaVentaId: id } })
  return tx.tarifaVenta.update({
    where: { id },
    data: {
      vigenciaDesde: data.vigenciaDesde,
      vigenciaHasta: data.vigenciaHasta ?? null,
      actualizadoPor,
      valores: { create: valoresCreate(data.valores) },
    },
    include: INCLUYE_RELACIONES,
  })
}
