import { z } from 'zod'

// RN-DIN-01: margenSugerido es un monto/ratio, nunca number — viaja como
// string decimal (Docs/mantenedores.md §6: `0.5000` = 50%).
const decimalString = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/, 'Debe ser un decimal válido, ej. 0.5000')

export const servicioCreateSchema = z.object({
  codigo: z.string().min(1, 'El código es requerido').max(20).trim(),
  nombre: z.string().min(1, 'El nombre es requerido').max(150).trim(),
  nombreEn: z.string().max(150).trim().optional(),
  descripcion: z.string().optional(),
  descripcionEn: z.string().optional(),
  zonaId: z.coerce.number().int().positive().optional(),
  tipoServicioId: z.coerce.number().int().positive('El tipo de servicio es requerido'),
  // RN-SRV-01: se precarga desde TipoServicio.modeloTarifaDefault en el
  // frontend; el backend siempre recibe el valor final, editable o no.
  modeloTarifa: z.enum(['TRAMO_PAX', 'ACOMODACION', 'UNITARIO_PAX']),
  margenSugerido: decimalString.default('0'),
  duracionDias: z.coerce.number().int().positive().optional(),
})

export const servicioUpdateSchema = servicioCreateSchema.omit({ codigo: true }).partial()

export const servicioIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const servicioListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
  q: z.string().optional(),
  zonaId: z.coerce.number().int().positive().optional(),
  tipoServicioId: z.coerce.number().int().positive().optional(),
  modeloTarifa: z.enum(['TRAMO_PAX', 'ACOMODACION', 'UNITARIO_PAX']).optional(),
})

export type ServicioCreateInput = z.infer<typeof servicioCreateSchema>
export type ServicioUpdateInput = z.infer<typeof servicioUpdateSchema>
