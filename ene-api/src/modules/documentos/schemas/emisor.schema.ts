import { z } from 'zod'

// RN-EMP-01: datos de la empresa emisora (ENE) que encabezan TODOS los PDF del
// catálogo. El logo viaja como data URI para que el documento sea autocontenido
// (shared/pdf/render usa setContent, sin acceso a red). `null` = sin logo.
export const emisorPdfSchema = z.object({
  nombre: z.string(),
  rut: z.string().nullable(),
  direccion: z.string().nullable(),
  email: z.string().nullable(),
  web: z.string().nullable(),
  telefono: z.string().nullable(),
  logoDataUri: z.string().nullable(),
})

export type EmisorPdf = z.infer<typeof emisorPdfSchema>
