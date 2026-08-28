import { Prisma } from '@prisma/client'
import type { Prisma as PrismaNS } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import type { GrupoCreateInput, GrupoUpdateInput, PasajeroInput, PasajeroUpdateInput } from './grupos.schema.js'

interface GrupoFiltros {
  q?: string
  clienteId?: number
}

// RN-GRP-02: la búsqueda cubre apellido/código del grupo Y el nombre de sus
// pasajeros en una sola pasada — join explícito porque el pasajero no es
// campo propio de `grupo` (idsPorTexto genérico no cubre joins).
async function idsGrupoPorTexto(q: string): Promise<number[]> {
  const patron = `%${q}%`
  const filas = await prisma.$queryRaw<{ id: number }[]>(
    Prisma.sql`
      SELECT DISTINCT g."id" FROM "grupo" g
      LEFT JOIN "pasajero" p ON p."grupoId" = g."id" AND p."eliminadoEn" IS NULL
      WHERE unaccent(lower(g."codigo")) LIKE unaccent(lower(${patron}))
         OR unaccent(lower(g."apellido")) LIKE unaccent(lower(${patron}))
         OR unaccent(lower(p."nombre")) LIKE unaccent(lower(${patron}))
    `,
  )
  return filas.map((f) => f.id)
}

export async function findAllGrupos(page: number, limit: number, filtros: GrupoFiltros) {
  const idsTexto = filtros.q ? await idsGrupoPorTexto(filtros.q) : null

  const where: PrismaNS.GrupoWhereInput = {
    eliminadoEn: null,
    ...(idsTexto ? { id: { in: idsTexto } } : {}),
    ...(filtros.clienteId ? { clienteId: filtros.clienteId } : {}),
  }

  const [data, total] = await Promise.all([
    prisma.grupo.findMany({
      where,
      // Docs/mantenedores.md §4: orden por defecto apellido ascendente.
      orderBy: { apellido: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { cliente: { select: { id: true, codigo: true, razonSocial: true } } },
    }),
    prisma.grupo.count({ where }),
  ])
  return { data, total }
}

/// Próxima fecha de operación por grupo (cotización u OT futura, la que
/// venga primero) — RN-GRP-02 exige mostrarla en el listado.
export async function findProximasOperaciones(grupoIds: number[]): Promise<Map<number, Date>> {
  if (grupoIds.length === 0) return new Map()
  const ahora = new Date()

  const [cotizaciones, ordenes] = await Promise.all([
    prisma.cotizacion.groupBy({
      by: ['grupoId'],
      where: { grupoId: { in: grupoIds }, fechaOperacion: { gte: ahora } },
      _min: { fechaOperacion: true },
    }),
    prisma.ordenTrabajo.groupBy({
      by: ['grupoId'],
      where: { grupoId: { in: grupoIds }, fechaOperacion: { gte: ahora } },
      _min: { fechaOperacion: true },
    }),
  ])

  const proximas = new Map<number, Date>()
  for (const c of cotizaciones) {
    if (c._min.fechaOperacion) proximas.set(c.grupoId, c._min.fechaOperacion)
  }
  for (const o of ordenes) {
    if (!o._min.fechaOperacion) continue
    const actual = proximas.get(o.grupoId)
    if (!actual || o._min.fechaOperacion < actual) proximas.set(o.grupoId, o._min.fechaOperacion)
  }
  return proximas
}

// RN-MAN-05: un grupo eliminado sigue siendo accesible por id.
export async function findGrupoById(id: number) {
  return prisma.grupo.findFirst({
    where: { id },
    include: {
      cliente: { select: { id: true, codigo: true, razonSocial: true } },
      pasajeros: { where: { eliminadoEn: null }, orderBy: { nombre: 'asc' } },
    },
  })
}

export async function findGrupoByCodigo(
  codigo: string,
  excluirId?: number,
  db: PrismaNS.TransactionClient | typeof prisma = prisma,
) {
  return db.grupo.findFirst({
    where: { codigo, eliminadoEn: null, ...(excluirId ? { id: { not: excluirId } } : {}) },
  })
}

export async function createGrupo(
  tx: PrismaNS.TransactionClient,
  data: Omit<GrupoCreateInput, 'pasajeros' | 'codigo'> & { codigo: string },
  pasajeros: PasajeroInput[] | undefined,
  creadoPor: string,
) {
  return tx.grupo.create({
    data: {
      ...data,
      creadoPor,
      pasajeros: pasajeros?.length ? { create: pasajeros.map((p) => ({ ...p, creadoPor })) } : undefined,
    },
    include: { pasajeros: true },
  })
}

export async function updateGrupo(id: number, data: GrupoUpdateInput, actualizadoPor: string) {
  return prisma.grupo.update({ where: { id }, data: { ...data, actualizadoPor } })
}

export async function softDeleteGrupo(id: number, eliminadoPor: string) {
  return prisma.grupo.update({ where: { id }, data: { eliminadoEn: new Date(), eliminadoPor } })
}

// ─── Pasajeros (subtabla, RN-GRP-04) ────────────────────────────────────────

export async function findPasajeroById(grupoId: number, pasajeroId: number) {
  return prisma.pasajero.findFirst({ where: { id: pasajeroId, grupoId, eliminadoEn: null } })
}

export async function createPasajero(grupoId: number, data: PasajeroInput, creadoPor: string) {
  return prisma.pasajero.create({ data: { ...data, grupoId, creadoPor } })
}

export async function updatePasajero(pasajeroId: number, data: PasajeroUpdateInput, actualizadoPor: string) {
  return prisma.pasajero.update({ where: { id: pasajeroId }, data: { ...data, actualizadoPor } })
}

export async function softDeletePasajero(pasajeroId: number, eliminadoPor: string) {
  await prisma.pasajero.update({ where: { id: pasajeroId }, data: { eliminadoEn: new Date(), eliminadoPor } })
}
