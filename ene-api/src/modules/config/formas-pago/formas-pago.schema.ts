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
