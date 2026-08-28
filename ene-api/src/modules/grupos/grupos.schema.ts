import { z } from 'zod'

export const pasajeroInputSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(120).trim(),
  edad: z.coerce.number().int().min(0).max(120).optional(),
  nacionalidad: z.string().max(60).trim().optional(),
  documento: z.string().max(40).trim().optional(),
  restricciones: z.string().optional(),
})

export const pasajeroUpdateSchema = pasajeroInputSchema.partial()

export const grupoCreateSchema = z.object({
  codigo: z.string().min(1, 'El código es requerido').max(20).trim(),
  // RN-OT-03: identificador operativo de la reserva, obligatorio.
  apellido: z.string().min(1, 'El apellido es requerido').max(80).trim(),
  clienteId: z.coerce.number().int().positive('El cliente es requerido'),
  nacionalidad: z.string().max(60).trim().optional(),
  paisOrigen: z.string().max(60).trim().optional(),
  idioma: z.string().max(30).trim().optional(),
  cantidadPax: z.coerce.number().int().min(1).default(1),
  observaciones: z.string().optional(),
  // RN-API-02: subtabla opcional en el mismo payload de alta. RN-GRP-04: el
  // detalle de pasajeros nunca es obligatorio.
  pasajeros: z.array(pasajeroInputSchema).optional(),
})

export const grupoUpdateSchema = grupoCreateSchema.omit({ codigo: true, pasajeros: true }).partial()

export const grupoIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const grupoPasajeroParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  pid: z.coerce.number().int().positive(),
})

export const grupoListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
  q: z.string().optional(),
  clienteId: z.coerce.number().int().positive().optional(),
})

export type PasajeroInput = z.infer<typeof pasajeroInputSchema>
export type PasajeroUpdateInput = z.infer<typeof pasajeroUpdateSchema>
export type GrupoCreateInput = z.infer<typeof grupoCreateSchema>
export type GrupoUpdateInput = z.infer<typeof grupoUpdateSchema>
