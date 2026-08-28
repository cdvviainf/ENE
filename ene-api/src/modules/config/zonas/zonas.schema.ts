import { z } from 'zod'

// Zona: código manual (Docs/mantenedores.md §1), sin correlativo. Mayúsculas y
// sin espacios (RN-MAN validación del maestro).
export const zonaCreateSchema = z.object({
  codigo: z
    .string()
    .min(1, 'El código es requerido')
    .max(10)
    .trim()
    .toUpperCase()
    .regex(/^\S+$/, 'El código no puede tener espacios'),
  nombre: z.string().min(1, 'El nombre es requerido').max(80).trim(),
  nombreEn: z.string().max(80).trim().optional(),
})

export const zonaUpdateSchema = zonaCreateSchema.partial()

export const zonaIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const zonaListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
  q: z.string().optional(),
})

export type ZonaCreateInput = z.infer<typeof zonaCreateSchema>
export type ZonaUpdateInput = z.infer<typeof zonaUpdateSchema>
export type ZonaListQuery = z.infer<typeof zonaListQuerySchema>
