import { randomUUID } from 'node:crypto'
import { extname } from 'node:path'
import type { EntidadAdjunto, NivelAcceso } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { noEncontrado, noAutorizado, validacion } from '../../shared/errors.js'
import { guardarArchivo, leerArchivo } from '../../shared/storage/archivos.js'

// ============================================================================
// Adjuntos — Docs/reglas-negocio.md §7 (RN-OT-08) y §(RN-ADJ). Almacenamiento
// polimórfico: cualquier entidad (OT, OC, cotización, factura, pago) cuelga sus
// respaldos. El permiso es el de la entidad dueña y el path NUNCA se expone
// (RN-ADJ-02): la API entrega el contenido con control de acceso.
// ============================================================================

type Accesos = Map<string, NivelAcceso> | undefined

// Ítem de menú que gobierna el permiso sobre los adjuntos de cada entidad dueña.
const ITEM_POR_ENTIDAD: Record<EntidadAdjunto, string> = {
  ORDEN_TRABAJO: 'ORDENES_TRABAJO',
  ORDEN_COMPRA: 'ORDENES_COMPRA',
  COTIZACION: 'COTIZACIONES',
  FACTURA_PROVEEDOR: 'FACTURACION',
  PAGO_PROVEEDOR: 'COBROS',
}

// Campos públicos del adjunto. Omite `storageKey` a propósito (RN-ADJ-02).
const adjuntoPublico = {
  id: true,
  entidad: true,
  entidadId: true,
  nombreArchivo: true,
  mimeType: true,
  tamanoBytes: true,
  creadoEn: true,
  creadoPor: true,
} as const

/** El permiso del adjunto es el de su entidad dueña: LECTURA para ver/descargar,
 * TOTAL para subir o eliminar. 403 si el perfil no alcanza (RN-OT-08 / RN-ADJ-02). */
function exigirAcceso(accesos: Accesos, entidad: EntidadAdjunto, minLevel: 'LECTURA' | 'TOTAL') {
  const item = ITEM_POR_ENTIDAD[entidad]
  const nivel = accesos?.get(item) ?? 'SIN_ACCESO'
  const ok = minLevel === 'LECTURA' ? nivel !== 'SIN_ACCESO' : nivel === 'TOTAL'
  if (!ok) throw noAutorizado('No tiene acceso a los adjuntos de esta entidad.')
}

async function entidadExiste(entidad: EntidadAdjunto, entidadId: number): Promise<boolean> {
  switch (entidad) {
    case 'ORDEN_TRABAJO':
      return (await prisma.ordenTrabajo.count({ where: { id: entidadId, eliminadoEn: null } })) > 0
    case 'ORDEN_COMPRA':
      return (await prisma.ordenCompra.count({ where: { id: entidadId, eliminadoEn: null } })) > 0
    case 'COTIZACION':
      return (await prisma.cotizacion.count({ where: { id: entidadId, eliminadoEn: null } })) > 0
    case 'FACTURA_PROVEEDOR':
      return (await prisma.facturaProveedor.count({ where: { id: entidadId } })) > 0
    case 'PAGO_PROVEEDOR':
      return (await prisma.pagoProveedor.count({ where: { id: entidadId } })) > 0
  }
}

export interface SubirAdjuntoInput {
  entidad: EntidadAdjunto
  entidadId: number
  nombreArchivo: string
  mimeType: string
  buffer: Buffer
}

export async function subirAdjunto(input: SubirAdjuntoInput, accesos: Accesos, usuario: string) {
  exigirAcceso(accesos, input.entidad, 'TOTAL')
  if (!(await entidadExiste(input.entidad, input.entidadId))) {
    throw noEncontrado(`${input.entidad} dueña del adjunto`, input.entidadId)
  }
  if (input.buffer.length === 0) throw validacion('El archivo está vacío.')

  // La extensión se toma del nombre original; el nombre real en disco es un UUID
  // (evita colisiones y cualquier traversal por el filename del cliente).
  const ext = extname(input.nombreArchivo)
  const storageKey = `${input.entidad}/${input.entidadId}/${randomUUID()}${ext}`
  await guardarArchivo(storageKey, input.buffer)

  return prisma.adjunto.create({
    data: {
      entidad: input.entidad,
      entidadId: input.entidadId,
      nombreArchivo: input.nombreArchivo,
      mimeType: input.mimeType,
      tamanoBytes: input.buffer.length,
      storageKey,
      creadoPor: usuario,
    },
    select: adjuntoPublico,
  })
}

export async function listarAdjuntos(entidad: EntidadAdjunto, entidadId: number, accesos: Accesos) {
  exigirAcceso(accesos, entidad, 'LECTURA')
  return prisma.adjunto.findMany({
    where: { entidad, entidadId, eliminadoEn: null },
    orderBy: { creadoEn: 'desc' },
    select: adjuntoPublico,
  })
}

/** Devuelve el contenido del archivo con su nombre y tipo. Nunca el storageKey. */
export async function descargarAdjunto(id: number, accesos: Accesos) {
  const adj = await prisma.adjunto.findFirst({ where: { id, eliminadoEn: null } })
  if (!adj) throw noEncontrado('Adjunto', id)
  exigirAcceso(accesos, adj.entidad, 'LECTURA') // RN-OT-08: permiso sobre la entidad dueña.
  const buffer = await leerArchivo(adj.storageKey)
  return { nombreArchivo: adj.nombreArchivo, mimeType: adj.mimeType, buffer }
}

export async function eliminarAdjunto(id: number, accesos: Accesos, usuario: string) {
  const adj = await prisma.adjunto.findFirst({ where: { id, eliminadoEn: null } })
  if (!adj) throw noEncontrado('Adjunto', id)
  exigirAcceso(accesos, adj.entidad, 'TOTAL')
  await prisma.adjunto.update({
    where: { id },
    data: { eliminadoEn: new Date(), eliminadoPor: usuario },
  })
}
