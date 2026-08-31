import { z } from 'zod'

// Provincia: código manual, sin correlativo.
export const provinciaCreateSchema = z.object({
  codigo: z
    .string()
    .min(1, 'El código es requerido')
    .max(10)
    .trim()
    .toUpperCase()
    .regex(/^\S+$/, 'El código no puede tener espacios'),
  nombre: z.string().min(1, 'El nombre es requerido').max(80).trim(),
  regionId: z.coerce.number().int().positive('La región es requerida'),
})

export const provinciaUpdateSchema = provinciaCreateSchema.partial()

export const provinciaIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const provinciaListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(300).default(20),
  q: z.string().optional(),
  regionId: z.coerce.number().int().positive().optional(),
})

export type ProvinciaCreateInput = z.infer<typeof provinciaCreateSchema>
export type ProvinciaUpdateInput = z.infer<typeof provinciaUpdateSchema>
