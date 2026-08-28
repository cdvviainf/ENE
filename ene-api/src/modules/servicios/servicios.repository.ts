import type { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { idsPorTexto } from '../../shared/busqueda.js'
import type { ServicioCreateInput, ServicioUpdateInput } from './servicios.schema.js'

interface ServicioFiltros {
  q?: string
  zonaId?: number
  tipoServicioId?: number
  modeloTarifa?: 'TRAMO_PAX' | 'ACOMODACION' | 'UNITARIO_PAX'
}

export async function findAllServicios(page: number, limit: number, filtros: ServicioFiltros) {
  const idsTexto = filtros.q ? await idsPorTexto('servicio', ['codigo', 'nombre', 'nombreEn'], filtros.q) : null

  const where: Prisma.ServicioWhereInput = {
    eliminadoEn: null,
    ...(idsTexto ? { id: { in: idsTexto } } : {}),
    ...(filtros.zonaId ? { zonaId: filtros.zonaId } : {}),
    ...(filtros.tipoServicioId ? { tipoServicioId: filtros.tipoServicioId } : {}),
    ...(filtros.modeloTarifa ? { modeloTarifa: filtros.modeloTarifa } : {}),
  }

  const [data, total] = await Promise.all([
    prisma.servicio.findMany({
      where,
      orderBy: { codigo: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        zona: { select: { id: true, codigo: true, nombre: true } },
        tipoServicio: { select: { id: true, codigo: true, nombre: true } },
        _count: { select: { tarifarios: { where: { activo: true } } } },
      },
    }),
    prisma.servicio.count({ where }),
  ])
  return { data, total }
}

// RN-MAN-05: un servicio eliminado sigue siendo accesible por id.
export async function findServicioById(id: number) {
  return prisma.servicio.findFirst({
    where: { id },
    include: {
      zona: { select: { id: true, codigo: true, nombre: true } },
      tipoServicio: { select: { id: true, codigo: true, nombre: true } },
    },
  })
}

export async function findServicioByCodigo(
  codigo: string,
  excluirId?: number,
  db: Prisma.TransactionClient | typeof prisma = prisma,
) {
  return db.servicio.findFirst({
    where: { codigo, eliminadoEn: null, ...(excluirId ? { id: { not: excluirId } } : {}) },
  })
}

// RN-SRV-02 [BLOQUEA]: cuenta cualquier tarifario del servicio, activo o no —
// la regla no da excepción por estado, un tarifario histórico igual queda sin
// interpretación válida si cambia el modeloTarifa.
export async function contarTarifarios(servicioId: number) {
  return prisma.tarifario.count({ where: { servicioId } })
}

export async function createServicio(
  tx: Prisma.TransactionClient,
  data: Omit<ServicioCreateInput, 'codigo'> & { codigo: string },
  creadoPor: string,
) {
  return tx.servicio.create({ data: { ...data, creadoPor } })
}

export async function updateServicio(id: number, data: ServicioUpdateInput, actualizadoPor: string) {
  return prisma.servicio.update({ where: { id }, data: { ...data, actualizadoPor } })
}

export async function softDeleteServicio(id: number, eliminadoPor: string) {
  return prisma.servicio.update({ where: { id }, data: { eliminadoEn: new Date(), eliminadoPor } })
}
