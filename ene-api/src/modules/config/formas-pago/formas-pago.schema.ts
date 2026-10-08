import { z } from 'zod'

// FormaPago: código manual, sin correlativo (RN-PAG-01).
export const formaPagoCreateSchema = z.object({
  codigo: z
    .string()
    .min(1, 'El código es requerido')
    .max(20)
    .trim()
    .toUpperCase()
    .regex(/^\S+$/, 'El código no puede tener espacios'),
  nombre: z.string().min(1, 'El nombre es requerido').max(80).trim(),
  // RN-COS-08: recargo operacional (0.03 = 3%). Se suma a la propuesta como
  // pass-through sobre la venta. Máx 4 decimales, entre 0 y 1 (100%).
  porcentajeAdicional: z
    .number()
    .min(0, 'No puede ser negativo')
    .max(1, 'No puede superar 100%')
    .default(0),
})

export const formaPagoUpdateSchema = formaPagoCreateSchema.partial()

export const formaPagoIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const formaPagoListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
  q: z.string().optional(),
})

export type FormaPagoCreateInput = z.infer<typeof formaPagoCreateSchema>
export type FormaPagoUpdateInput = z.infer<typeof formaPagoUpdateSchema>
