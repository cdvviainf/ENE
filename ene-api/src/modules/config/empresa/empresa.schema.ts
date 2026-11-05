import { z } from 'zod'

// RN-EMP-01: datos de la empresa emisora (singleton). El logo se sube aparte
// (multipart). Los campos de texto vacíos se guardan como null.
const opcional = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((v) => (v === '' || v == null ? null : v))

export const empresaUpdateSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(200).trim(),
  rut: opcional,
  direccion: z.string().trim().max(300).optional().transform((v) => (v === '' || v == null ? null : v)),
  email: z
    .string()
    .trim()
    .email('Email inválido')
    .max(200)
    .optional()
    .or(z.literal(''))
    .transform((v) => (v === '' || v == null ? null : v)),
  web: opcional,
  telefono: opcional,
})

export type EmpresaUpdateInput = z.infer<typeof empresaUpdateSchema>

// Formatos de logo aceptados (RN-CFG-01): solo raster. SVG se excluyó a
// propósito (QA-CFG-004): puede llevar scripts y sanitizarlo bien exigiría una
// dependencia nueva; para la cabecera de un PDF basta un PNG.
export type MimeLogo = 'image/png' | 'image/jpeg' | 'image/webp'

/** Detecta el formato por la FIRMA BINARIA del archivo, no por el Content-Type
 * que declara el cliente (QA-CFG-004). `null` si no es PNG, JPEG ni WEBP. */
export function detectarMimeLogo(buf: Buffer): MimeLogo | null {
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png'
  }
  // JPEG: FF D8 FF
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'
  // WEBP: "RIFF" ···· "WEBP"
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp'
  }
  return null
}

// Tope del logo: se guarda en la BD y se incrusta en base64 en cada PDF.
export const LOGO_MAX_BYTES = 2 * 1024 * 1024
