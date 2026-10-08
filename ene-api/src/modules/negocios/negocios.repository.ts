import { Prisma } from '@prisma/client'
import type { Prisma as PrismaNS } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import type { NegocioCreateInput, NegocioUpdateInput, PasajeroInput, PasajeroUpdateInput } from './negocios.schema.js'

interface NegocioFiltros {
  q?: string
  clienteId?: number
}

// RN-GRP-02: la búsqueda cubre apellido/código del negocio Y el nombre de sus
// pasajeros en una sola pasada — join explícito porque el pasajero no es
// campo propio de `negocio` (idsPorTexto genérico no cubre joins).
async function idsNegocioPorTexto(q: string): Promise<number[]> {
  const patron = `%${q}%`
  const filas = await prisma.$queryRaw<{ id: number }[]>(
    Prisma.sql`
      SELECT DISTINCT g."id" FROM "negocio" g
      LEFT JOIN "pasajero" p ON p."negocioId" = g."id" AND p."eliminadoEn" IS NULL
      WHERE unaccent(lower(g."codigo")) LIKE unaccent(lower(${patron}))
         OR unaccent(lower(g."apellido")) LIKE unaccent(lower(${patron}))
         OR unaccent(lower(p."nombre")) LIKE unaccent(lower(${patron}))
    `,
  )
  return filas.map((f) => f.id)
}

export async function findAllNegocios(page: number, limit: number, filtros: NegocioFiltros) {
  const idsTexto = filtros.q ? await idsNegocioPorTexto(filtros.q) : null

  const where: PrismaNS.NegocioWhereInput = {
    eliminadoEn: null,
    ...(idsTexto ? { id: { in: idsTexto } } : {}),
    ...(filtros.clienteId ? { clienteId: filtros.clienteId } : {}),
  }

  const [data, total] = await Promise.all([
    prisma.negocio.findMany({
      where,
      // Docs/mantenedores.md §4: orden por defecto apellido ascendente.
      orderBy: { apellido: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { cliente: { select: { id: true, codigo: true, razonSocial: true } } },
    }),
    prisma.negocio.count({ where }),
  ])
  return { data, total }
}

/// Próxima fecha de operación por negocio (cotización u OT futura, la que
/// venga primero) — RN-GRP-02 exige mostrarla en el listado.
export async function findProximasOperaciones(negocioIds: number[]): Promise<Map<number, Date>> {
  if (negocioIds.length === 0) return new Map()
  const ahora = new Date()

  const [cotizaciones, ordenes] = await Promise.all([
    prisma.cotizacion.groupBy({
      by: ['negocioId'],
      where: { negocioId: { in: negocioIds }, fechaOperacion: { gte: ahora } },
      _min: { fechaOperacion: true },
    }),
    prisma.ordenTrabajo.groupBy({
      by: ['negocioId'],
      where: { negocioId: { in: negocioIds }, fechaOperacion: { gte: ahora } },
      _min: { fechaOperacion: true },
    }),
  ])

  const proximas = new Map<number, Date>()
  for (const c of cotizaciones) {
    if (c._min.fechaOperacion) proximas.set(c.negocioId, c._min.fechaOperacion)
  }
  for (const o of ordenes) {
    if (!o._min.fechaOperacion) continue
    const actual = proximas.get(o.negocioId)
    if (!actual || o._min.fechaOperacion < actual) proximas.set(o.negocioId, o._min.fechaOperacion)
  }
  return proximas
}

// RN-MAN-05: un negocio eliminado sigue siendo accesible por id.
export async function findNegocioById(id: number) {
  return prisma.negocio.findFirst({
    where: { id },
    include: {
      cliente: { select: { id: true, codigo: true, razonSocial: true } },
      pasajeros: { where: { eliminadoEn: null }, orderBy: { nombre: 'asc' } },
    },
  })
}

export async function findNegocioByCodigo(
  codigo: string,
  excluirId?: number,
  db: PrismaNS.TransactionClient | typeof prisma = prisma,
) {
  return db.negocio.findFirst({
    where: { codigo, eliminadoEn: null, ...(excluirId ? { id: { not: excluirId } } : {}) },
  })
}

export async function createNegocio(
  tx: PrismaNS.TransactionClient,
  data: Omit<NegocioCreateInput, 'pasajeros' | 'codigo'> & { codigo: string },
  pasajeros: PasajeroInput[] | undefined,
  creadoPor: string,
) {
  return tx.negocio.create({
    data: {
      ...data,
      creadoPor,
      pasajeros: pasajeros?.length ? { create: pasajeros.map((p) => ({ ...p, creadoPor })) } : undefined,
    },
    include: { pasajeros: true },
  })
}

export async function updateNegocio(id: number, data: NegocioUpdateInput, actualizadoPor: string) {
  return prisma.negocio.update({ where: { id }, data: { ...data, actualizadoPor } })
}

export async function softDeleteNegocio(id: number, eliminadoPor: string) {
  return prisma.negocio.update({ where: { id }, data: { eliminadoEn: new Date(), eliminadoPor } })
}

// ─── Pasajeros (subtabla, RN-GRP-04) ────────────────────────────────────────

export async function findPasajeroById(negocioId: number, pasajeroId: number) {
  return prisma.pasajero.findFirst({ where: { id: pasajeroId, negocioId, eliminadoEn: null } })
}

export async function createPasajero(negocioId: number, data: PasajeroInput, creadoPor: string) {
  return prisma.pasajero.create({ data: { ...data, negocioId, creadoPor } })
}

export async function updatePasajero(pasajeroId: number, data: PasajeroUpdateInput, actualizadoPor: string) {
  return prisma.pasajero.update({ where: { id: pasajeroId }, data: { ...data, actualizadoPor } })
}

export async function softDeletePasajero(pasajeroId: number, eliminadoPor: string) {
  await prisma.pasajero.update({ where: { id: pasajeroId }, data: { eliminadoEn: new Date(), eliminadoPor } })
}
