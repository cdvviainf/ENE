import type { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { idsPorTexto } from '../../shared/busqueda.js'
import type {
  ClienteCreateInput,
  ClienteUpdateInput,
  DireccionInput,
  DireccionUpdateInput,
  EjecutivoInput,
  EjecutivoUpdateInput,
} from './clientes.schema.js'

interface ClienteFiltros {
  q?: string
  tipo?: 'AGENCIA' | 'EMPRESA'
  paisId?: number
  monedaHabitual?: 'CLP' | 'USD'
}

// RN-CLI-02: "ya tiene operaciones" es cualquier cotización u OT del cliente,
// sin importar su estado — a diferencia del guard de RN-MAN-04, que solo mira
// las no cerradas. Cotizaciones son operaciones porque ya fijaron una moneda
// desde su creación (aunque terminen perdidas/desistidas).
export async function tieneAlgunaOperacion(clienteId: number): Promise<boolean> {
  const [cotizaciones, ordenes] = await Promise.all([
    prisma.cotizacion.count({ where: { clienteId } }),
    prisma.ordenTrabajo.count({ where: { clienteId } }),
  ])
  return cotizaciones + ordenes > 0
}

export async function findAllClientes(page: number, limit: number, filtros: ClienteFiltros) {
  const idsTexto = filtros.q
    ? await idsPorTexto('cliente', ['codigo', 'razonSocial', 'nombreComercial', 'rut'], filtros.q)
    : null

  const where: Prisma.ClienteWhereInput = {
    eliminadoEn: null,
    ...(idsTexto ? { id: { in: idsTexto } } : {}),
    ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
    ...(filtros.paisId ? { paisId: filtros.paisId } : {}),
    ...(filtros.monedaHabitual ? { monedaHabitual: filtros.monedaHabitual } : {}),
  }

  const [data, total] = await Promise.all([
    prisma.cliente.findMany({
      where,
      // Docs/mantenedores.md §3: orden por defecto razón social ascendente.
      orderBy: { razonSocial: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        pais: { select: { id: true, codigo: true, nombre: true } },
        _count: { select: { ordenes: true, ejecutivos: { where: { eliminadoEn: null } } } },
      },
    }),
    prisma.cliente.count({ where }),
  ])
  return { data, total }
}

// RN-MAN-05: un cliente eliminado sigue siendo accesible por id (se oculta
// solo de listados y selectores, no de la consulta directa).
export async function findClienteById(id: number) {
  return prisma.cliente.findFirst({
    where: { id },
    include: {
      pais: { select: { id: true, codigo: true, nombre: true } },
      ejecutivos: { where: { eliminadoEn: null }, orderBy: { nombre: 'asc' } },
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

export async function findClienteByCodigo(
  codigo: string,
  excluirId?: number,
  db: Prisma.TransactionClient | typeof prisma = prisma,
) {
  return db.cliente.findFirst({
    where: { codigo, eliminadoEn: null, ...(excluirId ? { id: { not: excluirId } } : {}) },
  })
}

export async function createCliente(
  tx: Prisma.TransactionClient,
  data: Omit<ClienteCreateInput, 'ejecutivos' | 'codigo'> & { codigo: string; rut?: string },
  ejecutivos: EjecutivoInput[] | undefined,
  creadoPor: string,
) {
  return tx.cliente.create({
    data: {
      ...data,
      creadoPor,
      ejecutivos: ejecutivos?.length ? { create: ejecutivos.map((e) => ({ ...e, creadoPor })) } : undefined,
    },
    include: { ejecutivos: true },
  })
}

export async function updateCliente(id: number, data: ClienteUpdateInput, actualizadoPor: string) {
  return prisma.cliente.update({ where: { id }, data: { ...data, actualizadoPor } })
}

export async function softDeleteCliente(id: number, eliminadoPor: string) {
  return prisma.cliente.update({ where: { id }, data: { eliminadoEn: new Date(), eliminadoPor } })
}

// ─── Ejecutivos (subtabla, RN-CLI-03) ───────────────────────────────────────

export async function findEjecutivoById(clienteId: number, ejecutivoId: number) {
  return prisma.clienteEjecutivo.findFirst({
    where: { id: ejecutivoId, clienteId, eliminadoEn: null },
  })
}

export async function countEjecutivosActivos(clienteId: number, excluirId?: number) {
  return prisma.clienteEjecutivo.count({
    where: {
      clienteId,
      activo: true,
      eliminadoEn: null,
      ...(excluirId ? { id: { not: excluirId } } : {}),
    },
  })
}

export async function createEjecutivo(clienteId: number, data: EjecutivoInput, creadoPor: string) {
  // RN-CLI-05: al marcar este ejecutivo como representante legal, desmarca
  // los demás del mismo cliente en la misma transacción.
  if (data.esRepresentanteLegal) {
    return prisma.$transaction(async (tx) => {
      await tx.clienteEjecutivo.updateMany({
        where: { clienteId, eliminadoEn: null },
        data: { esRepresentanteLegal: false },
      })
      return tx.clienteEjecutivo.create({ data: { ...data, clienteId, creadoPor } })
    })
  }
  return prisma.clienteEjecutivo.create({ data: { ...data, clienteId, creadoPor } })
}

export async function updateEjecutivo(
  clienteId: number,
  ejecutivoId: number,
  data: EjecutivoUpdateInput,
  actualizadoPor: string,
) {
  // RN-CLI-05: idem createEjecutivo.
  if (data.esRepresentanteLegal) {
    return prisma.$transaction(async (tx) => {
      await tx.clienteEjecutivo.updateMany({
        where: { clienteId, eliminadoEn: null, id: { not: ejecutivoId } },
        data: { esRepresentanteLegal: false },
      })
      return tx.clienteEjecutivo.update({ where: { id: ejecutivoId }, data: { ...data, actualizadoPor } })
    })
  }
  return prisma.clienteEjecutivo.update({ where: { id: ejecutivoId }, data: { ...data, actualizadoPor } })
}

export async function softDeleteEjecutivo(ejecutivoId: number, eliminadoPor: string) {
  await prisma.clienteEjecutivo.update({
    where: { id: ejecutivoId },
    data: { eliminadoEn: new Date(), eliminadoPor },
  })
}

// ─── Direcciones (RN-GEO-02) ─────────────────────────────────────────────────

export async function createDireccion(clienteId: number, data: DireccionInput, creadoPor: string) {
  // RN-GEO-03: al marcar esta dirección como default, desmarca las demás del
  // mismo cliente en la misma transacción.
  if (data.esPorDefecto) {
    return prisma.$transaction(async (tx) => {
      await tx.clienteDireccion.updateMany({
        where: { clienteId, eliminadoEn: null },
        data: { esPorDefecto: false },
      })
      return tx.clienteDireccion.create({ data: { ...data, clienteId, creadoPor } })
    })
  }
  return prisma.clienteDireccion.create({ data: { ...data, clienteId, creadoPor } })
}

export async function findDireccionById(clienteId: number, direccionId: number) {
  return prisma.clienteDireccion.findFirst({ where: { id: direccionId, clienteId, eliminadoEn: null } })
}

export async function updateDireccion(
  clienteId: number,
  direccionId: number,
  data: DireccionUpdateInput,
  actualizadoPor: string,
) {
  // RN-GEO-03: idem createDireccion.
  if (data.esPorDefecto) {
    return prisma.$transaction(async (tx) => {
      await tx.clienteDireccion.updateMany({
        where: { clienteId, eliminadoEn: null, id: { not: direccionId } },
        data: { esPorDefecto: false },
      })
      return tx.clienteDireccion.update({ where: { id: direccionId }, data: { ...data, actualizadoPor } })
    })
  }
  return prisma.clienteDireccion.update({ where: { id: direccionId }, data: { ...data, actualizadoPor } })
}

export async function softDeleteDireccion(direccionId: number, eliminadoPor: string) {
  await prisma.clienteDireccion.update({ where: { id: direccionId }, data: { eliminadoEn: new Date(), eliminadoPor } })
}
