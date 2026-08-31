import { z } from 'zod'

// Pais: código manual (ISO corto, ej. "CL", "AR"), sin correlativo.
// RN-GEO-02 [BLOQUEA]: `esPaisNacional` identifica un hecho estructural (qué
// país exige la jerarquía Región→Provincia→Comuna), no un atributo editable
// del mantenedor — no se acepta en alta ni en edición. Queda fijo por el seed
// (Chile es el único con esPaisNacional=true); el campo default=false de
// Prisma cubre cualquier país nuevo creado desde acá.
export const paisCreateSchema = z.object({
  codigo: z
    .string()
    .min(1, 'El código es requerido')
    .max(10)
    .trim()
    .toUpperCase()
    .regex(/^\S+$/, 'El código no puede tener espacios'),
  nombre: z.string().min(1, 'El nombre es requerido').max(80).trim(),
})

export const paisUpdateSchema = paisCreateSchema.partial()

export const paisIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const paisListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(300).default(20),
  q: z.string().optional(),
})

export type PaisCreateInput = z.infer<typeof paisCreateSchema>
export type PaisUpdateInput = z.infer<typeof paisUpdateSchema>
