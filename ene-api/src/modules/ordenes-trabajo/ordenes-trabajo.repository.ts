import type { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import type { FiltrosOrdenTrabajo } from './ordenes-trabajo.types.js'

// Líneas de la versión vigente, ordenadas por día/bloque/orden (RN-COT-05).
const versionVigenteInclude = {
  versionVigente: {
    include: {
      lineas: {
        orderBy: [{ dia: 'asc' }, { bloque: 'asc' }, { orden: 'asc' }],
        include: {
          servicio: { select: { id: true, codigo: true, nombre: true, nombreEn: true } },
          proveedor: { select: { id: true, codigo: true, razonSocial: true } },
        },
      },
    },
  },
} satisfies Prisma.OrdenTrabajoInclude

export async function findAllOrdenes(page: number, limit: number, filtros: FiltrosOrdenTrabajo) {
  const where: Prisma.OrdenTrabajoWhereInput = {
    eliminadoEn: null,
    ...(filtros.estado ? { estado: filtros.estado } : {}),
    ...(filtros.desde || filtros.hasta
      ? {
          fechaOperacion: {
            ...(filtros.desde ? { gte: filtros.desde } : {}),
            ...(filtros.hasta ? { lte: filtros.hasta } : {}),
          },
        }
      : {}),
    ...(filtros.q
      ? {
          OR: [
            { numero: { contains: filtros.q, mode: 'insensitive' } },
            { apellido: { contains: filtros.q, mode: 'insensitive' } },
            { cliente: { razonSocial: { contains: filtros.q, mode: 'insensitive' } } },
          ],
        }
      : {}),
  }

  const [data, total] = await Promise.all([
    prisma.ordenTrabajo.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { creadoEn: 'desc' },
      include: {
        cliente: { select: { id: true, codigo: true, razonSocial: true } },
        negocio: { select: { id: true, codigo: true, apellido: true } },
        versionVigente: {
          select: { version: true, costoTeoricoTotal: true, margenTotal: true, ventaTotal: true },
        },
      },
    }),
    prisma.ordenTrabajo.count({ where }),
  ])
  return { data, total }
}

/** Detalle con cabecera, zonas, cotización de origen y versión vigente con líneas. */
export function findOrdenById(id: number) {
  return prisma.ordenTrabajo.findUnique({
    where: { id },
    include: {
      cliente: { select: { id: true, codigo: true, razonSocial: true, rut: true } },
      negocio: { select: { id: true, codigo: true, apellido: true, cantidadPax: true } },
      ejecutivo: { select: { id: true, nombre: true, email: true, telefono: true } },
      zonas: { include: { zona: { select: { id: true, codigo: true, nombre: true, nombreEn: true } } } },
      cotizacion: { select: { id: true, numero: true } },
      ...versionVigenteInclude,
    },
  })
}

/** RN-VER-09: una versión histórica concreta tal como quedó guardada —sus líneas,
 * montos y evidencia de aprobación—, sin reconstruir desde los maestros actuales. */
export function findVersionOT(ordenTrabajoId: number, version: number) {
  return prisma.ordenTrabajoVersion.findUnique({
    where: { ordenTrabajoId_version: { ordenTrabajoId, version } },
    include: {
      lineas: {
        orderBy: [{ dia: 'asc' }, { bloque: 'asc' }, { orden: 'asc' }],
        include: {
          servicio: { select: { id: true, codigo: true, nombre: true, nombreEn: true } },
          proveedor: { select: { id: true, codigo: true, razonSocial: true } },
        },
      },
    },
  })
}

/** Historial completo de versiones (RN-VER-09). La versión 1 es la línea base. */
export function listVersionesOT(ordenTrabajoId: number) {
  return prisma.ordenTrabajoVersion.findMany({
    where: { ordenTrabajoId },
    orderBy: { version: 'asc' },
    select: {
      id: true,
      version: true,
      tipoCambio: true,
      motivo: true,
      costoTeoricoTotal: true,
      margenTotal: true,
      ventaTotal: true,
      aprobadoPorCliente: true,
      aprobacionReferencia: true,
      aprobacionEn: true,
      creadoEn: true,
      creadoPor: true,
    },
  })
}
