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

// Formatos de logo aceptados (RN-EMP-01).
export const MIME_LOGO_PERMITIDOS = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']
