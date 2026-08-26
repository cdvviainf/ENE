import { prisma } from '../../../lib/prisma.js'

const usuarioSelect = {
  id: true,
  codigo: true,
  nombre: true,
  email: true,
  perfilId: true,
  activo: true,
  creadoEn: true,
  actualizadoEn: true,
  perfil: { select: { id: true, codigo: true, nombre: true } },
} as const

export async function findAllUsuarios(page: number, limit: number, q?: string, perfilId?: number) {
  const where = {
    eliminadoEn: null,
    ...(perfilId ? { perfilId } : {}),
    ...(q
      ? {
          OR: [
            { nombre: { contains: q, mode: 'insensitive' as const } },
            { email: { contains: q, mode: 'insensitive' as const } },
            { codigo: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  const [data, total] = await Promise.all([
    prisma.usuario.findMany({
      where,
      select: usuarioSelect,
      orderBy: { nombre: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.usuario.count({ where }),
  ])

  return { data, total }
}

export async function findUsuarioById(id: number) {
  return prisma.usuario.findFirst({ where: { id, eliminadoEn: null }, select: usuarioSelect })
}

/** Incluye authUserId — para operaciones sobre la credencial (cambio de contraseña). */
export async function findUsuarioAuthById(id: number) {
  return prisma.usuario.findFirst({
    where: { id, eliminadoEn: null },
    select: { id: true, authUserId: true },
  })
}

export async function findUsuarioByEmail(email: string, excludeId?: number) {
  return prisma.usuario.findFirst({
    where: { email, eliminadoEn: null, ...(excludeId ? { id: { not: excludeId } } : {}) },
  })
}

export async function findUsuarioByCodigo(codigo: string, excludeId?: number) {
  return prisma.usuario.findFirst({
    where: { codigo, eliminadoEn: null, ...(excludeId ? { id: { not: excludeId } } : {}) },
  })
}

export async function createUsuario(data: {
  codigo: string
  nombre: string
  email: string
  perfilId: number
  authUserId: string
  creadoPor: string
}) {
  return prisma.usuario.create({
    data: {
      codigo: data.codigo,
      nombre: data.nombre,
      email: data.email,
      perfilId: data.perfilId,
      authUserId: data.authUserId,
      creadoPor: data.creadoPor,
    },
    select: usuarioSelect,
  })
}

export async function updateUsuario(
  id: number,
  data: { codigo?: string; nombre?: string; perfilId?: number; activo?: boolean; actualizadoPor: string },
) {
  return prisma.usuario.update({
    where: { id },
    data: {
      ...(data.codigo !== undefined ? { codigo: data.codigo } : {}),
      ...(data.nombre !== undefined ? { nombre: data.nombre } : {}),
      ...(data.perfilId !== undefined ? { perfilId: data.perfilId } : {}),
      ...(data.activo !== undefined ? { activo: data.activo } : {}),
      actualizadoPor: data.actualizadoPor,
    },
    select: usuarioSelect,
  })
}

export async function softDeleteUsuario(id: number, eliminadoPor: string) {
  return prisma.usuario.update({
    where: { id },
    data: { eliminadoEn: new Date(), eliminadoPor },
  })
}

/** Registra el actor de una mutación indirecta (ej. cambio de contraseña). */
export async function touchUsuario(id: number, actualizadoPor: string) {
  return prisma.usuario.update({ where: { id }, data: { actualizadoPor } })
}
