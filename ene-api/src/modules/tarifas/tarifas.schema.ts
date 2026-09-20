import { z } from 'zod'

// RN-DIN-01: valor y suplementoSingle son montos, nunca number — viajan como
// string decimal (mismo patrón que margenSugerido en servicios.schema.ts).
const decimalString = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/, 'Debe ser un decimal válido, ej. 95000.0000')

const modeloTarifaEnum = z.enum(['TRAMO_PAX', 'ACOMODACION', 'UNITARIO_PAX'])
const acomodacionEnum = z.enum(['SINGLE', 'DOBLE', 'TWIN', 'TRIPLE'])

// RN-TAR-01: TarifarioValor es una fila polimórfica — los campos que aplican
// dependen de `modelo`. Los que no aplican deben venir vacíos: evita que un
// payload cargue paxDesde/acomodacion "fantasma" que el resto del código
// nunca lee pero que confundiría a quien mire los datos después.
export const tarifarioValorInputSchema = z
  .object({
    modelo: modeloTarifaEnum,
    paxDesde: z.coerce.number().int().positive().optional(),
    paxHasta: z.coerce.number().int().positive().nullable().optional(),
    acomodacion: acomodacionEnum.optional(),
    valor: decimalString,
    suplementoSingle: decimalString.optional(),
  })
  .superRefine((v, ctx) => {
    if (v.modelo === 'TRAMO_PAX') {
      if (v.paxDesde == null) ctx.addIssue({ code: 'custom', path: ['paxDesde'], message: 'paxDesde es requerido para TRAMO_PAX (RN-TAR-01)' })
      if (v.acomodacion != null) ctx.addIssue({ code: 'custom', path: ['acomodacion'], message: 'acomodacion no aplica a TRAMO_PAX' })
      if (v.suplementoSingle != null) ctx.addIssue({ code: 'custom', path: ['suplementoSingle'], message: 'suplementoSingle no aplica a TRAMO_PAX' })
    }
    if (v.modelo === 'ACOMODACION') {
      if (v.acomodacion == null) ctx.addIssue({ code: 'custom', path: ['acomodacion'], message: 'acomodacion es requerida para ACOMODACION (RN-TAR-01)' })
      if (v.paxDesde != null || v.paxHasta != null) ctx.addIssue({ code: 'custom', path: ['paxDesde'], message: 'paxDesde/paxHasta no aplican a ACOMODACION' })
    }
    if (v.modelo === 'UNITARIO_PAX') {
      if (v.paxDesde != null || v.paxHasta != null || v.acomodacion != null || v.suplementoSingle != null) {
        ctx.addIssue({ code: 'custom', path: ['modelo'], message: 'UNITARIO_PAX solo lleva valor' })
      }
    }
  })

/** Invariantes que cruzan todas las filas de `valores` de un mismo payload
 * (create o nueva-version): un único `modelo`, UNITARIO_PAX con exactamente
 * una fila, y sin acomodaciones repetidas. RN-TAR-02 (solape/hueco de
 * tramos) y RN-TAR-07 (solape de vigencias) NO viven acá porque requieren
 * consultar la BD — se validan en tarifas.service.ts. */
function validarConsistenciaValores(valores: z.infer<typeof tarifarioValorInputSchema>[], ctx: z.RefinementCtx) {
  const modelos = new Set(valores.map((v) => v.modelo))
  if (modelos.size > 1) {
    ctx.addIssue({ code: 'custom', path: ['valores'], message: 'Todas las filas de valores deben compartir el mismo modelo' })
    return
  }
  const modelo = valores[0]!.modelo
  if (modelo === 'UNITARIO_PAX' && valores.length > 1) {
    ctx.addIssue({ code: 'custom', path: ['valores'], message: 'UNITARIO_PAX admite un único valor por tarifario' })
  }
  if (modelo === 'ACOMODACION') {
    const vistas = new Set<string>()
    for (const v of valores) {
      if (v.acomodacion && vistas.has(v.acomodacion)) {
        ctx.addIssue({ code: 'custom', path: ['valores'], message: `La acomodación ${v.acomodacion} está repetida en el tarifario` })
      }
      if (v.acomodacion) vistas.add(v.acomodacion)
    }
  }
}

export const tarifarioCreateSchema = z
  .object({
    proveedorId: z.coerce.number().int().positive('El proveedor es requerido'),
    servicioId: z.coerce.number().int().positive('El servicio es requerido'),
    moneda: z.enum(['CLP', 'USD']),
    vigenciaDesde: z.coerce.date(),
    vigenciaHasta: z.coerce.date().optional(),
    valores: z.array(tarifarioValorInputSchema).min(1, 'Debe haber al menos un valor'),
  })
  .superRefine((data, ctx) => validarConsistenciaValores(data.valores, ctx))

// RN-TAR-06: no reemplaza al tarifario anterior — proveedorId/servicioId se
// heredan (no se reciben acá); vigenciaDesde es obligatoria y nueva, moneda
// es opcional (hereda si se omite), valores reemplaza por completo al set
// anterior (no hay PATCH incremental).
export const tarifarioNuevaVersionSchema = z
  .object({
    moneda: z.enum(['CLP', 'USD']).optional(),
    vigenciaDesde: z.coerce.date(),
    vigenciaHasta: z.coerce.date().optional(),
    valores: z.array(tarifarioValorInputSchema).min(1, 'Debe haber al menos un valor'),
  })
  .superRefine((data, ctx) => validarConsistenciaValores(data.valores, ctx))

export const tarifarioIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const tarifarioListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
  proveedorId: z.coerce.number().int().positive().optional(),
  servicioId: z.coerce.number().int().positive().optional(),
  vigenteA: z.coerce.date().optional(),
  // Enum explícito en vez de z.coerce.boolean(): "false" no debe coercionar a true.
  soloActivos: z.enum(['true', 'false']).optional().transform((v) => (v === undefined ? undefined : v === 'true')),
})

export type TarifarioValorInput = z.infer<typeof tarifarioValorInputSchema>
export type TarifarioCreateInput = z.infer<typeof tarifarioCreateSchema>
export type TarifarioNuevaVersionInput = z.infer<typeof tarifarioNuevaVersionSchema>
export type TarifarioListQuery = z.infer<typeof tarifarioListQuerySchema>
