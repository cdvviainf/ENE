import { z } from 'zod'

// Region: código manual (numeración romana chilena, ej. "I", "XV"), sin correlativo.
export const regionCreateSchema = z.object({
  codigo: z
    .string()
    .min(1, 'El código es requerido')
    .max(10)
    .trim()
    .toUpperCase()
    .regex(/^\S+$/, 'El código no puede tener espacios'),
  nombre: z.string().min(1, 'El nombre es requerido').max(80).trim(),
})

export const regionUpdateSchema = regionCreateSchema.partial()

export const regionIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const regionListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
  q: z.string().optional(),
})

export type RegionCreateInput = z.infer<typeof regionCreateSchema>
export type RegionUpdateInput = z.infer<typeof regionUpdateSchema>
