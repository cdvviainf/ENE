import { z } from 'zod'

// Payload ya resuelto de la cotización para el PDF. Los montos viajan como
// string decimal (RN-DIN-01). El resolver ya eligió los textos de dominio
// según el idioma; la modalidad decide qué muestra la plantilla (RN-COT-06/07).

const decimalString = z.string().regex(/^-?\d+(\.\d+)?$/)

export const cotizacionLineaPdfSchema = z.object({
  descripcion: z.string(),
  cantidadPax: z.number().int(),
  ventaTotal: decimalString,
})

export const cotizacionBloquePdfSchema = z.object({
  bloque: z.enum(['AM', 'PM']),
  lineas: z.array(cotizacionLineaPdfSchema),
})

export const cotizacionDiaPdfSchema = z.object({
  dia: z.number().int().min(1),
  fecha: z.string(),
  bloques: z.array(cotizacionBloquePdfSchema),
})

export const cotizacionPdfPayloadSchema = z.object({
  numero: z.string(),
  emisor: z.object({
    nombre: z.string(),
    rut: z.string().nullable(),
    email: z.string().nullable(),
    web: z.string().nullable(),
  }),
  cliente: z.object({
    razonSocial: z.string(),
    rut: z.string().nullable(),
  }),
  grupoApellido: z.string(),
  areaNegocio: z.enum(['RECEPTIVO', 'EVENTOS']),
  fechaOperacion: z.string(),
  cantidadPax: z.number().int(),
  moneda: z.enum(['CLP', 'USD']),
  zona: z.string().nullable(),
  dias: z.array(cotizacionDiaPdfSchema),
  totalVenta: decimalString,
  idioma: z.enum(['es', 'en']),
  modalidad: z.enum(['total', 'desglosado']),
})

export type CotizacionPdfPayload = z.infer<typeof cotizacionPdfPayloadSchema>
