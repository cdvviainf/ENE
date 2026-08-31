import { z } from 'zod'

export const ejecutivoInputSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(120).trim(),
  email: z.string().email('Email inválido').max(120).trim().optional(),
  telefono: z.string().max(40).trim().optional(),
  cargo: z.string().max(80).trim().optional(),
  activo: z.boolean().default(true),
})

export const ejecutivoUpdateSchema = ejecutivoInputSchema.partial()

// RN-GEO-02: comunaId es obligatorio si el país es Chile — se valida en el
// service (requiere consultar Pais.esPaisNacional), no acá.
export const direccionInputSchema = z.object({
  etiqueta: z.string().min(1, 'La etiqueta es requerida').max(80).trim(),
  paisId: z.coerce.number().int().positive('El país es requerido'),
  comunaId: z.coerce.number().int().positive().optional(),
  direccion: z.string().min(1, 'La dirección es requerida').max(200).trim(),
  esPorDefecto: z.boolean().default(false),
})

export const direccionUpdateSchema = direccionInputSchema.partial()

// RN-CLI-01 (rut obligatorio si tipo=EMPRESA) se valida en el service, no acá:
// depende de otro campo del mismo payload y, en edición, del estado ya
// guardado en la fila si el campo no viene en el PATCH.
export const clienteCreateSchema = z.object({
  codigo: z.string().min(1, 'El código es requerido').max(20).trim(),
  tipo: z.enum(['AGENCIA', 'EMPRESA']),
  razonSocial: z.string().min(1, 'La razón social es requerida').max(150).trim(),
  rut: z.string().max(12).trim().optional(),
  nombreComercial: z.string().max(150).trim().optional(),
  paisId: z.coerce.number().int().positive('El país es requerido'),
  monedaHabitual: z.enum(['CLP', 'USD']).optional(),
  formaPagoId: z.coerce.number().int().positive().optional(),
  condicionPagoId: z.coerce.number().int().positive().optional(),
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

export const clienteDireccionParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  did: z.coerce.number().int().positive(),
})

export const clienteListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
  q: z.string().optional(),
  tipo: z.enum(['AGENCIA', 'EMPRESA']).optional(),
  paisId: z.coerce.number().int().positive().optional(),
  monedaHabitual: z.enum(['CLP', 'USD']).optional(),
})

export type EjecutivoInput = z.infer<typeof ejecutivoInputSchema>
export type EjecutivoUpdateInput = z.infer<typeof ejecutivoUpdateSchema>
export type DireccionInput = z.infer<typeof direccionInputSchema>
export type DireccionUpdateInput = z.infer<typeof direccionUpdateSchema>
export type ClienteCreateInput = z.infer<typeof clienteCreateSchema>
export type ClienteUpdateInput = z.infer<typeof clienteUpdateSchema>
export type ClienteListQuery = z.infer<typeof clienteListQuerySchema>
