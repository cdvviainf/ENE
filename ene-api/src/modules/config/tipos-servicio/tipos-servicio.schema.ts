import { z } from 'zod'

// TipoServicio: código manual (Docs/mantenedores.md §2), sin correlativo.
export const tipoServicioCreateSchema = z.object({
  codigo: z
    .string()
    .min(1, 'El código es requerido')
    .max(20)
    .trim()
    .toUpperCase()
    .regex(/^\S+$/, 'El código no puede tener espacios'),
  nombre: z.string().min(1, 'El nombre es requerido').max(60).trim(),
  modeloTarifaDefault: z.enum(['TRAMO_PAX', 'ACOMODACION', 'UNITARIO_PAX']),
  ventanaAvisoDias: z.coerce.number().int().min(1).max(365),
})

export const tipoServicioUpdateSchema = tipoServicioCreateSchema.partial()

export const tipoServicioIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const tipoServicioListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
  q: z.string().optional(),
})

export type TipoServicioCreateInput = z.infer<typeof tipoServicioCreateSchema>
export type TipoServicioUpdateInput = z.infer<typeof tipoServicioUpdateSchema>
