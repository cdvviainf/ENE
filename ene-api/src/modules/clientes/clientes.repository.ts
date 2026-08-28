import type { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { idsPorTexto } from '../../shared/busqueda.js'
import type { ClienteCreateInput, ClienteUpdateInput, EjecutivoInput, EjecutivoUpdateInput } from './clientes.schema.js'

interface ClienteFiltros {
  q?: string
  tipo?: 'AGENCIA' | 'EMPRESA'
  pais?: string
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
    ...(filtros.pais ? { pais: filtros.pais } : {}),
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
    include: { ejecutivos: { where: { eliminadoEn: null }, orderBy: { nombre: 'asc' } } },
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
  return prisma.clienteEjecutivo.create({ data: { ...data, clienteId, creadoPor } })
}

export async function updateEjecutivo(ejecutivoId: number, data: EjecutivoUpdateInput, actualizadoPor: string) {
  return prisma.clienteEjecutivo.update({ where: { id: ejecutivoId }, data: { ...data, actualizadoPor } })
}

export async function softDeleteEjecutivo(ejecutivoId: number, eliminadoPor: string) {
  await prisma.clienteEjecutivo.update({
    where: { id: ejecutivoId },
    data: { eliminadoEn: new Date(), eliminadoPor },
  })
}
