import { promises as fs } from 'node:fs'
import { dirname, join } from 'node:path'
import { env } from '../../config/env.js'

// Storage de archivos en el filesystem del VPS (CLAUDE.md §5). Nunca se expone
// el path directo: la API sirve el contenido con control de permiso. Por ahora
// solo lo usa el logo de la empresa (RN-EMP-01); el patrón sirve para Adjuntos.

const EXT_POR_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/gif': 'gif',
}

export function extensionDeMime(mime: string): string | null {
  return EXT_POR_MIME[mime.toLowerCase()] ?? null
}

function rutaAbsoluta(storageKey: string): string {
  return join(env.ADJUNTOS_PATH, storageKey)
}

/** Guarda un buffer bajo `storageKey` (relativo a ADJUNTOS_PATH), creando
 * directorios. Devuelve el storageKey. */
export async function guardarArchivo(storageKey: string, buffer: Buffer): Promise<string> {
  const abs = rutaAbsoluta(storageKey)
  await fs.mkdir(dirname(abs), { recursive: true })
  await fs.writeFile(abs, buffer)
  return storageKey
}

export async function leerArchivo(storageKey: string): Promise<Buffer> {
  return fs.readFile(rutaAbsoluta(storageKey))
}

/** Lee un archivo y lo devuelve como data URI (para incrustar en el PDF, que
 * es autocontenido y se renderiza con setContent sin red). */
export async function leerComoDataUri(storageKey: string, mime: string): Promise<string> {
  const buffer = await leerArchivo(storageKey)
  return `data:${mime};base64,${buffer.toString('base64')}`
}
