import { z } from 'zod'

export const ejecutivoInputSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(120).trim(),
  email: z.string().email('Email inválido').max(120).trim().optional(),
  telefono: z.string().max(40).trim().optional(),
  cargo: z.string().max(80).trim().optional(),
  activo: z.boolean().default(true),
})

export const ejecutivoUpdateSchema = ejecutivoInputSchema.partial()

// RN-CLI-01 (rut obligatorio si tipo=EMPRESA) se valida en el service, no acá:
// depende de otro campo del mismo payload y, en edición, del estado ya
// guardado en la fila si el campo no viene en el PATCH.
export const clienteCreateSchema = z.object({
  codigo: z.string().min(1, 'El código es requerido').max(20).trim(),
  tipo: z.enum(['AGENCIA', 'EMPRESA']),
  razonSocial: z.string().min(1, 'La razón social es requerida').max(150).trim(),
  rut: z.string().max(12).trim().optional(),
  nombreComercial: z.string().max(150).trim().optional(),
  pais: z.string().min(1, 'El país es requerido').max(60).trim(),
  monedaHabitual: z.enum(['CLP', 'USD']).optional(),
  condicionesPago: z.string().optional(),
  email: z.string().email('Email inválido').max(120).trim().optional(),
  telefono: z.string().max(40).trim().optional(),
  // RN-API-02: subtabla aceptada en el mismo payload de alta.
  ejecutivos: z.array(ejecutivoInputSchema).optional(),
})

export const clienteUpdateSchema = clienteCreateSchema
  .omit({ codigo: true, ejecutivos: true })
  .partial()

export const clienteIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const clienteEjecutivoParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  eid: z.coerce.number().int().positive(),
})

export const clienteListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
  q: z.string().optional(),
  tipo: z.enum(['AGENCIA', 'EMPRESA']).optional(),
  pais: z.string().optional(),
  monedaHabitual: z.enum(['CLP', 'USD']).optional(),
})

export type EjecutivoInput = z.infer<typeof ejecutivoInputSchema>
export type EjecutivoUpdateInput = z.infer<typeof ejecutivoUpdateSchema>
export type ClienteCreateInput = z.infer<typeof clienteCreateSchema>
export type ClienteUpdateInput = z.infer<typeof clienteUpdateSchema>
export type ClienteListQuery = z.infer<typeof clienteListQuerySchema>
