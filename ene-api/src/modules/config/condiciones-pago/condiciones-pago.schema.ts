import { z } from 'zod'

// RN-PAG-02 [BLOQUEA]: la suma de porcentajes de las cuotas debe ser
// exactamente 100%. `porcentaje` persiste como Decimal(5,2) — sumar con
// `number` de punto flotante y redondear el total (en vez de cada cuota)
// aceptaba casos como 33.333+33.333+33.333 ("=100" en float) que en BD
// terminan guardados como 33.33+33.33+33.33=99.99. Se exige de entrada que
// cada cuota tenga a lo más 2 decimales y se suma en centésimos enteros.
function centesimos(porcentaje: number): number {
  return Math.round(porcentaje * 100)
}

function tieneMasDeDosDecimales(porcentaje: number): boolean {
  const escalado = porcentaje * 100
  return Math.abs(escalado - Math.round(escalado)) > 1e-9
}

function sumaCuotas(cuotas: { porcentaje: number }[]): boolean {
  if (cuotas.length === 0) return false
  const total = cuotas.reduce((acc, c) => acc + centesimos(c.porcentaje), 0)
  return total === 10000
}

const MENSAJE_CUOTAS = 'Las cuotas deben sumar 100% (RN-PAG-02)'
const MENSAJE_DECIMALES = 'El porcentaje admite máximo 2 decimales'

export const condicionPagoCuotaInputSchema = z.object({
  porcentaje: z.coerce
    .number()
    .positive('El porcentaje debe ser mayor a 0')
    .max(100)
    .refine((v) => !tieneMasDeDosDecimales(v), MENSAJE_DECIMALES),
  plazoDias: z.coerce.number().int().min(0, 'El plazo no puede ser negativo'),
})

// CondicionPago: código manual, sin correlativo (RN-PAG-01).
const condicionPagoBaseSchema = z.object({
  codigo: z
    .string()
    .min(1, 'El código es requerido')
    .max(20)
    .trim()
    .toUpperCase()
    .regex(/^\S+$/, 'El código no puede tener espacios'),
  nombre: z.string().min(1, 'El nombre es requerido').max(80).trim(),
})

export const condicionPagoCreateSchema = condicionPagoBaseSchema
  .extend({
    cuotas: z.array(condicionPagoCuotaInputSchema).min(1, 'Debe haber al menos una cuota'),
  })
  .refine((data) => sumaCuotas(data.cuotas), { message: MENSAJE_CUOTAS, path: ['cuotas'] })

export const condicionPagoUpdateSchema = condicionPagoBaseSchema
  .partial()
  .extend({
    cuotas: z.array(condicionPagoCuotaInputSchema).min(1, 'Debe haber al menos una cuota').optional(),
  })
  .refine((data) => data.cuotas === undefined || sumaCuotas(data.cuotas), {
    message: MENSAJE_CUOTAS,
    path: ['cuotas'],
  })

export const condicionPagoIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const condicionPagoListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
  q: z.string().optional(),
})

export type CondicionPagoCuotaInput = z.infer<typeof condicionPagoCuotaInputSchema>
export type CondicionPagoCreateInput = z.infer<typeof condicionPagoCreateSchema>
export type CondicionPagoUpdateInput = z.infer<typeof condicionPagoUpdateSchema>
