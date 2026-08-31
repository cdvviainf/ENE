import { Prisma } from '@prisma/client'
import type { Prisma as PrismaNS } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import type {
  AliasInput,
  ContactoInput,
  ContactoUpdateInput,
  CuentaInput,
  CuentaUpdateInput,
  DireccionInput,
  DireccionUpdateInput,
  ProveedorCreateInput,
  ProveedorUpdateInput,
} from './proveedores.schema.js'

// Sin puntos: formatearRut() normaliza todo RUT antes de guardar (RN-PRV-01),
// así que la forma persistida siempre es esta — coincide con el índice único
// parcial de la migración `fix_rut_generico_formato_normalizado`.
const RUT_GENERICO = '55555555-5'

interface ProveedorFiltros {
  q?: string
  tipoServicioId?: number
  zonaId?: number
}

// RN-PRV-02: la búsqueda debe encontrar por razón social, nombre comercial Y
// cualquiera de sus alias en una sola consulta — join explícito porque el
// alias no es campo propio de `proveedor`.
async function idsProveedorPorTexto(q: string): Promise<number[]> {
  const patron = `%${q}%`
  const filas = await prisma.$queryRaw<{ id: number }[]>(
    Prisma.sql`
      SELECT DISTINCT p."id" FROM "proveedor" p
      LEFT JOIN "proveedor_alias" a ON a."proveedorId" = p."id" AND a."eliminadoEn" IS NULL
      WHERE unaccent(lower(p."codigo")) LIKE unaccent(lower(${patron}))
         OR unaccent(lower(p."razonSocial")) LIKE unaccent(lower(${patron}))
         OR unaccent(lower(coalesce(p."nombreComercial", ''))) LIKE unaccent(lower(${patron}))
         OR unaccent(lower(p."rut")) LIKE unaccent(lower(${patron}))
         OR unaccent(lower(a."alias")) LIKE unaccent(lower(${patron}))
    `,
  )
  return filas.map((f) => f.id)
}

export async function findAllProveedores(page: number, limit: number, filtros: ProveedorFiltros) {
  const idsTexto = filtros.q ? await idsProveedorPorTexto(filtros.q) : null

  const where: PrismaNS.ProveedorWhereInput = {
    eliminadoEn: null,
    ...(idsTexto ? { id: { in: idsTexto } } : {}),
    ...(filtros.tipoServicioId ? { tipoServicioId: filtros.tipoServicioId } : {}),
    ...(filtros.zonaId ? { zonas: { some: { zonaId: filtros.zonaId } } } : {}),
  }

  const [data, total] = await Promise.all([
    prisma.proveedor.findMany({
      where,
      // Docs/mantenedores.md §5: orden por defecto razón social ascendente.
      orderBy: { razonSocial: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        tipoServicio: { select: { id: true, codigo: true, nombre: true } },
        zonas: { include: { zona: { select: { id: true, codigo: true, nombre: true } } } },
      },
    }),
    prisma.proveedor.count({ where }),
  ])
  return { data, total }
}

// RN-MAN-05: un proveedor eliminado sigue siendo accesible por id.
export async function findProveedorById(id: number) {
  return prisma.proveedor.findFirst({
    where: { id },
    include: {
      tipoServicio: { select: { id: true, codigo: true, nombre: true } },
      zonas: { include: { zona: { select: { id: true, codigo: true, nombre: true } } } },
      alias: { where: { eliminadoEn: null }, orderBy: { alias: 'asc' } },
      cuentas: { where: { eliminadoEn: null }, orderBy: { banco: 'asc' } },
      contactos: { where: { eliminadoEn: null }, orderBy: { nombre: 'asc' } },
      direcciones: {
        where: { eliminadoEn: null },
        orderBy: { etiqueta: 'asc' },
        include: {
          pais: { select: { id: true, codigo: true, nombre: true, esPaisNacional: true } },
          comuna: { select: { id: true, codigo: true, nombre: true } },
        },
      },
    },
  })
}

export async function findProveedorByCodigo(
  codigo: string,
  excluirId?: number,
  db: PrismaNS.TransactionClient | typeof prisma = prisma,
) {
  return db.proveedor.findFirst({
    where: { codigo, eliminadoEn: null, ...(excluirId ? { id: { not: excluirId } } : {}) },
  })
}

// RN-PRV-01: el RUT genérico de proveedores extranjeros sin RUT real se
// repite a propósito (índice único parcial en la migración) — nunca se
// prechequea acá, solo los rut reales.
export async function findProveedorByRut(
  rut: string,
  excluirId?: number,
  db: PrismaNS.TransactionClient | typeof prisma = prisma,
) {
  if (rut === RUT_GENERICO) return null
  return db.proveedor.findFirst({
    where: { rut, eliminadoEn: null, ...(excluirId ? { id: { not: excluirId } } : {}) },
  })
}

// RN-PRV-03 [BLOQUEA]: un mismo alias no puede repetirse entre proveedores
// distintos — la unicidad es GLOBAL, insensible a mayúsculas, y la garantiza
// el índice único parcial de la migración (esto es solo el mensaje amigable).
export async function findAliasDuplicado(alias: string, excluirProveedorId?: number) {
  return prisma.proveedorAlias.findFirst({
    where: {
      alias: { equals: alias, mode: 'insensitive' },
      eliminadoEn: null,
      ...(excluirProveedorId ? { proveedorId: { not: excluirProveedorId } } : {}),
    },
  })
}

export async function createProveedor(
  tx: PrismaNS.TransactionClient,
  data: Omit<ProveedorCreateInput, 'codigo' | 'zonas' | 'alias' | 'cuentas' | 'contactos'> & { codigo: string },
  zonas: number[] | undefined,
  alias: AliasInput[] | undefined,
  cuentas: CuentaInput[] | undefined,
  contactos: ContactoInput[] | undefined,
  creadoPor: string,
) {
  return tx.proveedor.create({
    data: {
      ...data,
      creadoPor,
      zonas: zonas?.length ? { create: zonas.map((zonaId) => ({ zonaId })) } : undefined,
      alias: alias?.length ? { create: alias.map((a) => ({ ...a, creadoPor })) } : undefined,
      cuentas: cuentas?.length ? { create: cuentas.map((c) => ({ ...c, creadoPor })) } : undefined,
      contactos: contactos?.length ? { create: contactos.map((c) => ({ ...c, creadoPor })) } : undefined,
    },
    include: { zonas: true, alias: true, cuentas: true, contactos: true },
  })
}

export async function updateProveedor(id: number, data: ProveedorUpdateInput, actualizadoPor: string) {
  const { zonas, ...resto } = data
  return prisma.proveedor.update({
    where: { id },
    data: {
      ...resto,
      actualizadoPor,
      // RN-PRV-05: reemplaza el conjunto completo de zonas (deleteMany + create),
      // más simple y suficiente para el volumen de fase 1.
      ...(zonas
        ? { zonas: { deleteMany: {}, create: zonas.map((zonaId) => ({ zonaId })) } }
        : {}),
    },
  })
}

export async function softDeleteProveedor(id: number, eliminadoPor: string) {
  return prisma.proveedor.update({ where: { id }, data: { eliminadoEn: new Date(), eliminadoPor } })
}

// ─── Alias ───────────────────────────────────────────────────────────────────

export async function createAlias(proveedorId: number, data: AliasInput, creadoPor: string) {
  return prisma.proveedorAlias.create({ data: { ...data, proveedorId, creadoPor } })
}

export async function findAliasById(proveedorId: number, aliasId: number) {
  return prisma.proveedorAlias.findFirst({ where: { id: aliasId, proveedorId, eliminadoEn: null } })
}

export async function softDeleteAlias(aliasId: number, eliminadoPor: string) {
  await prisma.proveedorAlias.update({ where: { id: aliasId }, data: { eliminadoEn: new Date(), eliminadoPor } })
}

// ─── Cuentas bancarias ───────────────────────────────────────────────────────

export async function createCuenta(proveedorId: number, data: CuentaInput, creadoPor: string) {
  return prisma.proveedorCuenta.create({ data: { ...data, proveedorId, creadoPor } })
}

export async function findCuentaById(proveedorId: number, cuentaId: number) {
  return prisma.proveedorCuenta.findFirst({ where: { id: cuentaId, proveedorId, eliminadoEn: null } })
}

export async function updateCuenta(cuentaId: number, data: CuentaUpdateInput, actualizadoPor: string) {
  return prisma.proveedorCuenta.update({ where: { id: cuentaId }, data: { ...data, actualizadoPor } })
}

export async function softDeleteCuenta(cuentaId: number, eliminadoPor: string) {
  await prisma.proveedorCuenta.update({ where: { id: cuentaId }, data: { eliminadoEn: new Date(), eliminadoPor } })
}

// ─── Contactos ───────────────────────────────────────────────────────────────

export async function createContacto(proveedorId: number, data: ContactoInput, creadoPor: string) {
  return prisma.proveedorContacto.create({ data: { ...data, proveedorId, creadoPor } })
}

export async function findContactoById(proveedorId: number, contactoId: number) {
  return prisma.proveedorContacto.findFirst({ where: { id: contactoId, proveedorId, eliminadoEn: null } })
}

export async function updateContacto(contactoId: number, data: ContactoUpdateInput, actualizadoPor: string) {
  return prisma.proveedorContacto.update({ where: { id: contactoId }, data: { ...data, actualizadoPor } })
}

export async function softDeleteContacto(contactoId: number, eliminadoPor: string) {
  await prisma.proveedorContacto.update({ where: { id: contactoId }, data: { eliminadoEn: new Date(), eliminadoPor } })
}

// ─── Direcciones (RN-GEO-02) ─────────────────────────────────────────────────

export async function createDireccion(proveedorId: number, data: DireccionInput, creadoPor: string) {
  // RN-GEO-03: al marcar esta dirección como default, desmarca las demás del
  // mismo proveedor en la misma transacción.
  if (data.esPorDefecto) {
    return prisma.$transaction(async (tx) => {
      await tx.proveedorDireccion.updateMany({
        where: { proveedorId, eliminadoEn: null },
        data: { esPorDefecto: false },
      })
      return tx.proveedorDireccion.create({ data: { ...data, proveedorId, creadoPor } })
    })
  }
  return prisma.proveedorDireccion.create({ data: { ...data, proveedorId, creadoPor } })
}

export async function findDireccionById(proveedorId: number, direccionId: number) {
  return prisma.proveedorDireccion.findFirst({ where: { id: direccionId, proveedorId, eliminadoEn: null } })
}

export async function updateDireccion(
  proveedorId: number,
  direccionId: number,
  data: DireccionUpdateInput,
  actualizadoPor: string,
) {
  // RN-GEO-03: idem createDireccion.
  if (data.esPorDefecto) {
    return prisma.$transaction(async (tx) => {
      await tx.proveedorDireccion.updateMany({
        where: { proveedorId, eliminadoEn: null, id: { not: direccionId } },
        data: { esPorDefecto: false },
      })
      return tx.proveedorDireccion.update({ where: { id: direccionId }, data: { ...data, actualizadoPor } })
    })
  }
  return prisma.proveedorDireccion.update({ where: { id: direccionId }, data: { ...data, actualizadoPor } })
}

export async function softDeleteDireccion(direccionId: number, eliminadoPor: string) {
  await prisma.proveedorDireccion.update({ where: { id: direccionId }, data: { eliminadoEn: new Date(), eliminadoPor } })
}
