import { z } from 'zod'
import { tarifarioValorInputSchema } from '../tarifas/tarifas.schema.js'

// ============================================================================
// Tarifas de venta — Docs/reglas-negocio.md §4 bis (RN-TVE-01..06).
// Mismos valores polimórficos que el tarifario de proveedor (RN-TAR-01), pero
// sin suplemento single (RN-TVE-01): es un dato del costo del proveedor.
// ============================================================================

const tarifaVentaValorInputSchema = tarifarioValorInputSchema.superRefine((v, ctx) => {
  if (v.suplementoSingle != null) {
    ctx.addIssue({ code: 'custom', path: ['suplementoSingle'], message: 'La tarifa de venta no lleva suplemento single (RN-TVE-01)' })
  }
})

type ValorInput = z.infer<typeof tarifaVentaValorInputSchema>

/** Mismas invariantes de conjunto que el tarifario de proveedor: un único
 * modelo, UNITARIO_PAX con una sola fila y sin acomodaciones repetidas. */
function validarConsistenciaValores(valores: ValorInput[], ctx: z.RefinementCtx) {
  const modelos = new Set(valores.map((v) => v.modelo))
  if (modelos.size > 1) {
    ctx.addIssue({ code: 'custom', path: ['valores'], message: 'Todas las filas de valores deben compartir el mismo modelo' })
    return
  }
  const modelo = valores[0]!.modelo
  if (modelo === 'UNITARIO_PAX' && valores.length > 1) {
    ctx.addIssue({ code: 'custom', path: ['valores'], message: 'UNITARIO_PAX admite un único valor por tarifa' })
  }
  if (modelo === 'ACOMODACION') {
    const vistas = new Set<string>()
    for (const v of valores) {
      if (v.acomodacion && vistas.has(v.acomodacion)) {
        ctx.addIssue({ code: 'custom', path: ['valores'], message: `La acomodación ${v.acomodacion} está repetida en la tarifa` })
      }
      if (v.acomodacion) vistas.add(v.acomodacion)
    }
  }
}

function validarRangoVigencia(data: { vigenciaDesde: Date; vigenciaHasta?: Date }, ctx: z.RefinementCtx) {
  if (data.vigenciaHasta && data.vigenciaHasta < data.vigenciaDesde) {
    ctx.addIssue({ code: 'custom', path: ['vigenciaHasta'], message: 'La vigencia hasta no puede ser anterior a la vigencia desde' })
  }
}

const valoresSchema = z.array(tarifaVentaValorInputSchema).min(1, 'Debe haber al menos un valor')

export const tarifaVentaCreateSchema = z
  .object({
    servicioId: z.coerce.number().int().positive('El servicio es requerido'),
    moneda: z.enum(['CLP', 'USD']),
    vigenciaDesde: z.coerce.date(),
    vigenciaHasta: z.coerce.date().optional(),
    valores: valoresSchema,
  })
  .superRefine((data, ctx) => {
    validarConsistenciaValores(data.valores, ctx)
    validarRangoVigencia(data, ctx)
  })

// Nueva versión y edición en el lugar comparten forma: servicio y moneda se
// heredan (la cadena pertenece a servicio+moneda, RN-TVE-03); vigencia y
// valores se reemplazan por completo.
export const tarifaVentaCambioSchema = z
  .object({
    vigenciaDesde: z.coerce.date(),
    vigenciaHasta: z.coerce.date().optional(),
    valores: valoresSchema,
  })
  .superRefine((data, ctx) => {
    validarConsistenciaValores(data.valores, ctx)
    validarRangoVigencia(data, ctx)
  })

export const tarifaVentaIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const ESTADOS_TARIFA_VENTA = ['VIGENTE', 'PROGRAMADA', 'VENCIDA', 'SIN_TARIFA'] as const

export const serviciosConTarifaQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
  q: z.string().trim().optional(),
  estado: z.enum(ESTADOS_TARIFA_VENTA).optional(),
})

export const tarifasVentaListQuerySchema = z.object({
  servicioId: z.coerce.number().int().positive(),
})

export type TarifaVentaValorInput = ValorInput
export type TarifaVentaCreateInput = z.infer<typeof tarifaVentaCreateSchema>
export type TarifaVentaCambioInput = z.infer<typeof tarifaVentaCambioSchema>
export type ServiciosConTarifaQuery = z.infer<typeof serviciosConTarifaQuerySchema>
export type EstadoTarifaVenta = (typeof ESTADOS_TARIFA_VENTA)[number]
