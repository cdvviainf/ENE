import type { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import type { TarifarioValorInput } from './tarifas.schema.js'

interface TarifarioFiltros {
  proveedorId?: number
  servicioId?: number
  vigenteA?: Date
  soloActivos?: boolean
}

const INCLUYE_RELACIONES = {
  proveedor: { select: { id: true, codigo: true, razonSocial: true } },
  servicio: { select: { id: true, codigo: true, nombre: true, modeloTarifa: true } },
  valores: true,
} satisfies Prisma.TarifarioInclude

export async function findAllTarifarios(page: number, limit: number, filtros: TarifarioFiltros) {
  const where: Prisma.TarifarioWhereInput = {
    eliminadoEn: null,
    ...(filtros.proveedorId ? { proveedorId: filtros.proveedorId } : {}),
    ...(filtros.servicioId ? { servicioId: filtros.servicioId } : {}),
    ...(filtros.soloActivos ? { activo: true } : {}),
    ...(filtros.vigenteA
      ? {
          vigenciaDesde: { lte: filtros.vigenteA },
          OR: [{ vigenciaHasta: null }, { vigenciaHasta: { gte: filtros.vigenteA } }],
        }
      : {}),
  }

  const [data, total] = await Promise.all([
    prisma.tarifario.findMany({
      where,
      orderBy: [{ proveedorId: 'asc' }, { servicioId: 'asc' }, { version: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: INCLUYE_RELACIONES,
    }),
    prisma.tarifario.count({ where }),
  ])
  return { data, total }
}

// RN-MAN-05 (mismo criterio que el resto de los maestros): un tarifario
// eliminado sigue siendo accesible por id.
export async function findTarifarioById(id: number, db: Prisma.TransactionClient | typeof prisma = prisma) {
  return db.tarifario.findFirst({
    where: { id },
    include: INCLUYE_RELACIONES,
  })
}

// RN-TAR-07: candidatos para el chequeo de solape de vigencias — solo
// activos y no eliminados del mismo proveedor+servicio. La comparación de
// rangos se hace en tarifas.service.ts (seSolapanVigencias), no acá: un
// rango con vigenciaHasta null no se expresa bien en un WHERE de Prisma.
export async function tarifariosActivosSolapados(tx: Prisma.TransactionClient, proveedorId: number, servicioId: number) {
  return tx.tarifario.findMany({
    where: { proveedorId, servicioId, activo: true, eliminadoEn: null },
    select: { id: true, version: true, vigenciaDesde: true, vigenciaHasta: true },
  })
}

interface CrearTarifarioData {
  proveedorId: number
  servicioId: number
  moneda: 'CLP' | 'USD'
  vigenciaDesde: Date
  vigenciaHasta?: Date
  valores: TarifarioValorInput[]
}

export async function createTarifarioTx(
  tx: Prisma.TransactionClient,
  data: CrearTarifarioData,
  creadoPor: string,
  version: number,
) {
  return tx.tarifario.create({
    data: {
      proveedorId: data.proveedorId,
      servicioId: data.servicioId,
      moneda: data.moneda,
      vigenciaDesde: data.vigenciaDesde,
      vigenciaHasta: data.vigenciaHasta ?? null,
      version,
      creadoPor,
      valores: {
        create: data.valores.map((v) => ({
          modelo: v.modelo,
          paxDesde: v.paxDesde ?? null,
          paxHasta: v.paxHasta ?? null,
          acomodacion: v.acomodacion ?? null,
          valor: v.valor,
          suplementoSingle: v.suplementoSingle ?? null,
        })),
      },
    },
    include: INCLUYE_RELACIONES,
  })
}

export async function desactivarTarifario(tx: Prisma.TransactionClient, id: number) {
  return tx.tarifario.update({ where: { id }, data: { activo: false } })
}
