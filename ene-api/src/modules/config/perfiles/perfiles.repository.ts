import { prisma } from '../../../lib/prisma.js'
import type { AccesoInput } from './perfiles.schema.js'

const itemMenuSelect = {
  id: true,
  codigo: true,
  nombre: true,
  modulo: true,
  ruta: true,
  esAccion: true,
  orden: true,
} as const

export async function findAllPerfiles(page: number, limit: number, q?: string) {
  const where = {
    eliminadoEn: null,
    ...(q
      ? {
          OR: [
            { codigo: { contains: q, mode: 'insensitive' as const } },
            { nombre: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  const [data, total] = await Promise.all([
    prisma.perfil.findMany({
      where,
      select: {
        id: true,
        codigo: true,
        nombre: true,
        descripcion: true,
        creadoEn: true,
        _count: { select: { usuarios: { where: { eliminadoEn: null } } } },
      },
      orderBy: { codigo: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.perfil.count({ where }),
  ])

  return { data, total }
}

export async function findPerfilById(id: number) {
  return prisma.perfil.findFirst({
    where: { id, eliminadoEn: null },
    include: { accesos: { include: { itemMenu: { select: itemMenuSelect } } } },
  })
}

export async function findPerfilByCodigo(codigo: string, excludeId?: number) {
  return prisma.perfil.findFirst({
    where: { codigo, eliminadoEn: null, ...(excludeId ? { id: { not: excludeId } } : {}) },
  })
}

export async function countUsuariosActivosByPerfilId(perfilId: number) {
  return prisma.usuario.count({ where: { perfilId, eliminadoEn: null } })
}

export async function findAllItemsMenu() {
  return prisma.itemMenu.findMany({
    where: { activo: true },
    orderBy: [{ modulo: 'asc' }, { orden: 'asc' }],
  })
}

async function reemplazarAccesos(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  perfilId: number,
  accesos: AccesoInput[],
) {
  await tx.perfilItemMenu.deleteMany({ where: { perfilId } })
  const conAcceso = accesos.filter((a) => a.nivel !== 'SIN_ACCESO')
  if (conAcceso.length > 0) {
    await tx.perfilItemMenu.createMany({
      data: conAcceso.map((a) => ({ perfilId, itemMenuId: a.itemMenuId, nivel: a.nivel })),
    })
  }
}

export async function createPerfil(
  data: { codigo: string; nombre: string; descripcion?: string; creadoPor: string },
  accesos: AccesoInput[],
) {
  return prisma.$transaction(async (tx) => {
    const perfil = await tx.perfil.create({
      data: {
        codigo: data.codigo,
        nombre: data.nombre,
        descripcion: data.descripcion ?? null,
        creadoPor: data.creadoPor,
      },
    })
    await reemplazarAccesos(tx, perfil.id, accesos)
    return tx.perfil.findFirst({
      where: { id: perfil.id },
      include: { accesos: { include: { itemMenu: { select: itemMenuSelect } } } },
    })
  })
}

export async function updatePerfil(
  id: number,
  data: { codigo?: string; nombre?: string; descripcion?: string; actualizadoPor: string },
  accesos?: AccesoInput[],
) {
  return prisma.$transaction(async (tx) => {
    await tx.perfil.update({
      where: { id },
      data: {
        ...(data.codigo !== undefined ? { codigo: data.codigo } : {}),
        ...(data.nombre !== undefined ? { nombre: data.nombre } : {}),
        ...(data.descripcion !== undefined ? { descripcion: data.descripcion } : {}),
        actualizadoPor: data.actualizadoPor,
      },
    })
    if (accesos !== undefined) await reemplazarAccesos(tx, id, accesos)
    return tx.perfil.findFirst({
      where: { id },
      include: { accesos: { include: { itemMenu: { select: itemMenuSelect } } } },
    })
  })
}

export async function softDeletePerfil(id: number, eliminadoPor: string) {
  return prisma.perfil.update({
    where: { id },
    data: { eliminadoEn: new Date(), eliminadoPor },
  })
}
