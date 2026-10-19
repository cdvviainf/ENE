import { z } from 'zod'

export const entidadAdjuntoEnum = z.enum([
  'ORDEN_TRABAJO',
  'ORDEN_COMPRA',
  'COTIZACION',
  'FACTURA_PROVEEDOR',
  'PAGO_PROVEEDOR',
])

/** POST /api/adjuntos — entidad dueña del adjunto (llega como campos multipart,
 * antes del archivo). */
export const adjuntoCrearSchema = z.object({
  entidad: entidadAdjuntoEnum,
  entidadId: z.coerce.number().int().positive(),
})

/** GET /api/adjuntos?entidad=&entidadId= — adjuntos de una entidad. */
export const adjuntoListQuerySchema = z.object({
  entidad: entidadAdjuntoEnum,
  entidadId: z.coerce.number().int().positive(),
})

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() })
