import { z } from 'zod'

// Payload ya resuelto de la cotización para el PDF. Los montos viajan como
// string decimal (RN-DIN-01). El resolver ya eligió los textos de dominio
// según el idioma; la modalidad decide qué muestra la plantilla (RN-COT-06/07/12).

const decimalString = z.string().regex(/^-?\d+(\.\d+)?$/)

export const cotizacionLineaPdfSchema = z.object({
  descripcion: z.string(),
  // RN-COT-10: observación por línea (ya localizada), sale en el PDF.
  observacion: z.string().nullable(),
  cantidadPax: z.number().int(),
  ventaTotal: decimalString,
  // RN-COT-12: venta por pasajero (ventaTotal / cantidadPax), para la modalidad
  // "detallado por pasajero".
  ventaPorPax: decimalString,
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
  version: z.number().int().min(1),
  // RN-EMP-01: datos de la empresa emisora + logo (data URI, opcional).
  empresa: z.object({
    nombre: z.string(),
    rut: z.string().nullable(),
    direccion: z.string().nullable(),
    email: z.string().nullable(),
    web: z.string().nullable(),
    telefono: z.string().nullable(),
    logoDataUri: z.string().nullable(),
  }),
  cliente: z.object({
    razonSocial: z.string(),
    rut: z.string().nullable(),
  }),
  // Ejecutivo del cliente (nombre + email) para el PDF.
  ejecutivo: z
    .object({ nombre: z.string(), email: z.string().nullable() })
    .nullable(),
  negocioApellido: z.string(),
  areaNegocio: z.enum(['RECEPTIVO', 'EVENTOS']),
  fechaOperacion: z.string(),
  // RN-COT-09: fecha de emisión (de la versión) y vigencia de la oferta.
  fechaCotizacion: z.string(),
  fechaVigencia: z.string().nullable(),
  cantidadPax: z.number().int(),
  moneda: z.enum(['CLP', 'USD']),
  // RN-COT-08: múltiples zonas (ya localizadas).
  zonas: z.array(z.string()),
  // RN-COT-10: comentarios de encabezado (ya localizados).
  incluidos: z.string().nullable(),
  noIncluidos: z.string().nullable(),
  notasImportantes: z.string().nullable(),
  dias: z.array(cotizacionDiaPdfSchema),
  totalVenta: decimalString,
  // RN-COS-08: recargo pass-through de la forma de pago.
  recargoFormaPago: z.string().nullable(),
  recargoTotal: decimalString,
  totalConRecargo: decimalString,
  idioma: z.enum(['es', 'en']),
  modalidad: z.enum(['total', 'desglosado', 'desglosado_pax']),
})

export type CotizacionPdfPayload = z.infer<typeof cotizacionPdfPayloadSchema>
