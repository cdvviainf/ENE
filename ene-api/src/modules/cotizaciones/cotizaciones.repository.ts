import { Prisma } from '@prisma/client'
import type { EstadoCotizacion } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import type { LineaResuelta, TotalesVersion } from './cotizaciones.types.js'

// ============================================================================
// Repository de Cotización — solo queries Prisma (CLAUDE.md §4: controller
// thin, lógica en service, Prisma solo acá). El versionado en sí lo maneja
// shared/versionado a través del adaptador cotizacionVersionable; este repo
// cubre la cabecera, las líneas y las lecturas.
// ============================================================================

const lineaOrderBy: Prisma.CotizacionLineaOrderByWithRelationInput[] = [{ dia: 'asc' }, { bloque: 'asc' }, { orden: 'asc' }]

const versionVigenteInclude = {
  versionVigente: {
    include: {
      lineas: {
        orderBy: lineaOrderBy,
        include: {
          servicio: { select: { id: true, codigo: true, nombre: true, nombreEn: true } },
          proveedor: { select: { id: true, codigo: true, razonSocial: true } },
        },
      },
    },
  },
} satisfies Prisma.CotizacionInclude

export async function findAllCotizaciones(
  page: number,
  limit: number,
  filtros: { estado?: EstadoCotizacion; clienteId?: number; q?: string },
) {
  const where: Prisma.CotizacionWhereInput = {
    eliminadoEn: null,
    ...(filtros.estado ? { estado: filtros.estado } : {}),
    ...(filtros.clienteId ? { clienteId: filtros.clienteId } : {}),
    ...(filtros.q
      ? {
          OR: [
            { numero: { contains: filtros.q, mode: 'insensitive' } },
            { grupo: { apellido: { contains: filtros.q, mode: 'insensitive' } } },
            { cliente: { razonSocial: { contains: filtros.q, mode: 'insensitive' } } },
          ],
        }
      : {}),
  }

  const [data, total] = await Promise.all([
    prisma.cotizacion.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { creadoEn: 'desc' },
      include: {
        cliente: { select: { id: true, codigo: true, razonSocial: true } },
        grupo: { select: { id: true, codigo: true, apellido: true } },
        versionVigente: { select: { version: true, costoTotal: true, margenTotal: true, ventaTotal: true } },
      },
    }),
    prisma.cotizacion.count({ where }),
  ])
  return { data, total }
}

/** RN-MAN-05: accesible por id aunque esté eliminada. */
export function findCotizacionById(id: number) {
  return prisma.cotizacion.findUnique({
    where: { id },
    include: {
      cliente: { select: { id: true, codigo: true, razonSocial: true, rut: true } },
      grupo: { select: { id: true, codigo: true, apellido: true, cantidadPax: true } },
      ejecutivo: { select: { id: true, nombre: true, email: true } },
      zona: { select: { id: true, codigo: true, nombre: true, nombreEn: true } },
      ...versionVigenteInclude,
    },
  })
}

export function crearCabeceraTx(
  tx: Prisma.TransactionClient,
  data: Omit<Prisma.CotizacionUncheckedCreateInput, 'numero' | 'creadoPor'>,
  numero: string,
  creadoPor: string,
) {
  return tx.cotizacion.create({ data: { ...data, numero, creadoPor } })
}

/** Reconcilia las líneas de una versión con el conjunto entrante y actualiza sus
 * totales. Hace un diff en vez de borrar y recrear, para que las líneas
 * conservadas MANTENGAN SU ID entre guardados (RN-COS-06): así el frontend
 * puede volver a referenciarlas y su costo congelado no se re-resuelve por un
 * id que cambió. Las entrantes con `id` existente se actualizan en su lugar;
 * las nuevas se crean; las que ya no vienen se borran. Solo debe llamarse sobre
 * la versión vigente y editable (RN-VER-08). */
export async function reemplazarLineasTx(
  tx: Prisma.TransactionClient,
  versionId: number,
  lineas: LineaResuelta[],
  totales: TotalesVersion,
) {
  const existentes = await tx.cotizacionLinea.findMany({ where: { cotizacionVersionId: versionId }, select: { id: true } })
  const existentesIds = new Set(existentes.map((e) => e.id))
  const conservarIds = new Set(lineas.filter((l) => l.id != null && existentesIds.has(l.id)).map((l) => l.id!))

  const aBorrar = [...existentesIds].filter((id) => !conservarIds.has(id))
  if (aBorrar.length > 0) {
    await tx.cotizacionLinea.deleteMany({ where: { id: { in: aBorrar } } })
  }

  const datosDe = (l: LineaResuelta) => ({
    dia: l.dia,
    bloque: l.bloque,
    orden: l.orden,
    tipoLinea: l.tipoLinea,
    servicioId: l.servicioId,
    proveedorId: l.proveedorId,
    tarifarioValorId: l.tarifarioValorId,
    descripcion: l.descripcion,
    descripcionEn: l.descripcionEn,
    cantidadPax: l.cantidadPax,
    acomodacion: l.acomodacion,
    costoUnitario: l.costoUnitario,
    costoTotal: l.costoTotal,
    margenPct: l.margenPct,
    ventaTotal: l.ventaTotal,
    // RN-COS-06: base tarifaria congelada (SQL NULL en OTRO).
    tarifarioSnapshot: (l.tarifarioSnapshot ?? Prisma.DbNull) as Prisma.InputJsonValue | typeof Prisma.DbNull,
  })

  for (const l of lineas) {
    if (l.id != null && existentesIds.has(l.id)) {
      await tx.cotizacionLinea.update({ where: { id: l.id }, data: datosDe(l) })
    } else {
      await tx.cotizacionLinea.create({ data: { cotizacionVersionId: versionId, ...datosDe(l) } })
    }
  }

  await tx.cotizacionVersion.update({
    where: { id: versionId },
    data: { costoTotal: totales.costoTotal, margenTotal: totales.margenTotal, ventaTotal: totales.ventaTotal },
  })
}

/** RN-VER-09: una versión histórica se devuelve tal como quedó guardada, con
 * sus líneas y montos de ese momento — nunca reconstruida desde los maestros. */
export function findVersionConLineas(cotizacionId: number, version: number) {
  return prisma.cotizacionVersion.findUnique({
    where: { cotizacionId_version: { cotizacionId, version } },
    include: {
      lineas: {
        orderBy: lineaOrderBy,
        include: {
          servicio: { select: { id: true, codigo: true, nombre: true, nombreEn: true } },
          proveedor: { select: { id: true, codigo: true, razonSocial: true } },
        },
      },
    },
  })
}

export function listVersiones(cotizacionId: number) {
  return prisma.cotizacionVersion.findMany({
    where: { cotizacionId },
    orderBy: { version: 'asc' },
    select: { id: true, version: true, motivo: true, costoTotal: true, margenTotal: true, ventaTotal: true, creadoEn: true, creadoPor: true },
  })
}
