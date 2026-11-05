import { z } from 'zod'
import { Decimal } from '../../../shared/dinero/index.js'

// RN-IMP-01: tasas tributarias globales. Se guardan como FRACCIÓN (0.19 = 19%),
// nunca number — string decimal (RN-DIN-01). El frontend las presenta en % y
// convierte. Se acotan a [0, 1).
const tasa = z
  .string()
  .regex(/^\d+(\.\d+)?$/, 'Debe ser una fracción, ej. 0.19')
  // RN-DIN-01: el rango se compara con decimal.js, nunca convirtiendo a number.
  .refine((v) => {
    const t = new Decimal(v)
    return t.gte(0) && t.lt(1)
  }, 'La tasa debe estar entre 0 y 1 (ej. 0.19)')
  // Decimal(7,4): más de 4 decimales se truncaría en silencio al persistir.
  .refine((v) => new Decimal(v).decimalPlaces() <= 4, 'La tasa admite hasta 4 decimales (ej. 0.1475)')

export const indicadoresUpdateSchema = z.object({
  tasaIva: tasa,
  tasaRetencion: tasa,
})

export type IndicadoresUpdateInput = z.infer<typeof indicadoresUpdateSchema>
