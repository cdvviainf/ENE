import { z } from 'zod'

// Comuna: código manual, sin correlativo.
export const comunaCreateSchema = z.object({
  codigo: z
    .string()
    .min(1, 'El código es requerido')
    .max(10)
    .trim()
    .toUpperCase()
    .regex(/^\S+$/, 'El código no puede tener espacios'),
  nombre: z.string().min(1, 'El nombre es requerido').max(80).trim(),
  provinciaId: z.coerce.number().int().positive('La provincia es requerida'),
})

export const comunaUpdateSchema = comunaCreateSchema.partial()

export const comunaIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const comunaListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(400).default(20),
  q: z.string().optional(),
  provinciaId: z.coerce.number().int().positive().optional(),
})

export type ComunaCreateInput = z.infer<typeof comunaCreateSchema>
export type ComunaUpdateInput = z.infer<typeof comunaUpdateSchema>
