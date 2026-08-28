import { z } from 'zod'

export const aliasInputSchema = z.object({
  alias: z.string().min(1, 'El alias es requerido').max(150).trim(),
})

export const cuentaInputSchema = z.object({
  banco: z.string().min(1, 'El banco es requerido').max(80).trim(),
  tipoCuenta: z.string().max(40).trim().optional(),
  numeroCuenta: z.string().min(1, 'El número de cuenta es requerido').max(40).trim(),
  titular: z.string().max(150).trim().optional(),
  rutTitular: z.string().max(12).trim().optional(),
})

export const cuentaUpdateSchema = cuentaInputSchema.partial()

export const contactoInputSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(120).trim(),
  email: z.string().email('Email inválido').max(120).trim().optional(),
  telefono: z.string().max(40).trim().optional(),
  cargo: z.string().max(80).trim().optional(),
})

export const contactoUpdateSchema = contactoInputSchema.partial()

export const proveedorCreateSchema = z.object({
  codigo: z.string().min(1, 'El código es requerido').max(20).trim(),
  razonSocial: z.string().min(1, 'La razón social es requerida').max(150).trim(),
  rut: z.string().min(1, 'El RUT es requerido').max(12).trim(),
  nombreComercial: z.string().max(150).trim().optional(),
  tipoServicioId: z.coerce.number().int().positive('El tipo de servicio es requerido'),
  // RN-PRV-05: un proveedor puede operar en varias zonas a la vez (N:N).
  zonas: z.array(z.coerce.number().int().positive()).optional(),
  condicionesPago: z.string().optional(),
  politicaCancelacion: z.string().optional(),
  email: z.string().email('Email inválido').max(120).trim().optional(),
  telefono: z.string().max(40).trim().optional(),
  // RN-API-02: subtablas aceptadas en el mismo payload de alta.
  alias: z.array(aliasInputSchema).optional(),
  cuentas: z.array(cuentaInputSchema).optional(),
  contactos: z.array(contactoInputSchema).optional(),
})

export const proveedorUpdateSchema = proveedorCreateSchema
  .omit({ codigo: true, alias: true, cuentas: true, contactos: true })
  .partial()

export const proveedorIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const proveedorSubrecursoParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  sid: z.coerce.number().int().positive(),
})

export const proveedorListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
  q: z.string().optional(),
  tipoServicioId: z.coerce.number().int().positive().optional(),
  zonaId: z.coerce.number().int().positive().optional(),
})

export type AliasInput = z.infer<typeof aliasInputSchema>
export type CuentaInput = z.infer<typeof cuentaInputSchema>
export type CuentaUpdateInput = z.infer<typeof cuentaUpdateSchema>
export type ContactoInput = z.infer<typeof contactoInputSchema>
export type ContactoUpdateInput = z.infer<typeof contactoUpdateSchema>
export type ProveedorCreateInput = z.infer<typeof proveedorCreateSchema>
export type ProveedorUpdateInput = z.infer<typeof proveedorUpdateSchema>
