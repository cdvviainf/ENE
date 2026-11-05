import { prisma } from '../../../lib/prisma.js'
import type { EmpresaUpdateInput } from './empresa.schema.js'

// RN-EMP-01: singleton. La fila única se garantiza por el seed; si faltara
// (ambiente sin seed) se crea al vuelo con el nombre por defecto.
export async function findEmpresa() {
  return prisma.empresa.findFirst({ orderBy: { id: 'asc' } })
}

/** Datos de la empresa + metadatos del logo, SIN el binario (para la API y la
 * pantalla: saber si hay logo y cuándo cambió, sin arrastrar los bytes). */
export async function findEmpresaConMetaLogo(id: number) {
  return prisma.empresa.findUnique({
    where: { id },
    include: { logo: { select: { mime: true, subidoEn: true, subidoPor: true } } },
  })
}

export async function ensureEmpresa(creadoPor: string) {
  const existente = await findEmpresa()
  if (existente) return existente
  return prisma.empresa.create({ data: { nombre: 'Extremo Norte Expediciones', creadoPor } })
}

export async function updateEmpresa(id: number, data: EmpresaUpdateInput, actualizadoPor: string) {
  return prisma.empresa.update({ where: { id }, data: { ...data, actualizadoPor } })
}

/** RN-EMP-01: un solo logo por empresa; subir otro lo reemplaza. */
export async function upsertLogo(empresaId: number, mime: string, datos: Buffer, subidoPor: string) {
  return prisma.empresaLogo.upsert({
    where: { empresaId },
    update: { mime, datos, subidoPor, subidoEn: new Date() },
    create: { empresaId, mime, datos, subidoPor },
    select: { empresaId: true },
  })
}

export async function findLogo(empresaId: number) {
  return prisma.empresaLogo.findUnique({ where: { empresaId } })
}

export async function deleteLogo(empresaId: number) {
  return prisma.empresaLogo.deleteMany({ where: { empresaId } })
}
