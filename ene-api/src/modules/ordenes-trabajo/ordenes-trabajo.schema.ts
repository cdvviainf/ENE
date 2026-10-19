import { z } from 'zod'
import { paginacionSchema } from '../../shared/pagination.js'

/** GET /api/ordenes-trabajo — filtros por estado, rango de fecha de operación y
 * búsqueda libre (número, apellido del negocio, razón social del cliente). */
export const ordenTrabajoListQuerySchema = paginacionSchema.extend({
  estado: z
    .enum([
      'CONFIRMADA',
      'EN_ESPERA',
      'EN_PREPARACION',
      'EN_OPERACION',
      'EJECUTADA',
      'CERRADA',
      'CANCELADA',
      'NO_SHOW',
    ])
    .optional(),
  desde: z.coerce.date().optional(),
  hasta: z.coerce.date().optional(),
  q: z.string().trim().optional(),
})

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() })

export const lineaParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  lid: z.coerce.number().int().positive(),
})

export const versionParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  version: z.coerce.number().int().positive(),
})

/** PATCH /estado — destino de la transición (RN-OT-04). CONFIRMADA no entra: es
 * solo el estado inicial al generarse la OT. */
export const cambioEstadoSchema = z.object({
  estado: z.enum([
    'EN_ESPERA',
    'EN_PREPARACION',
    'EN_OPERACION',
    'EJECUTADA',
    'CERRADA',
    'CANCELADA',
    'NO_SHOW',
  ]),
})

/** PATCH /lineas/:lid/estado-servicio — estado operativo de la línea. */
export const estadoServicioSchema = z.object({
  estadoServicio: z.enum(['PENDIENTE', 'TENTATIVO', 'CONFIRMADO', 'RECHAZADO', 'CANCELADO']),
})

// ── POST /versiones ─────────────────────────────────────────────────────────
const decimalString = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/, 'Debe ser un decimal válido, ej. 95000.0000')

/** Una línea de una versión nueva de OT. A diferencia de la cotización, el costo
 * SÍ se digita: la línea llega YA valorizada (decisión de usuario), la OT no
 * re-cotiza desde el tarifario (RN-COS: el costo queda plasmado). La venta se
 * deriva de `ventaObjetivo` (RN-COT-11) o de `margenPct` (RN-COS-02); exactamente
 * uno de los dos. */
export const lineaVersionSchema = z
  .object({
    dia: z.coerce.number().int().min(1),
    bloque: z.enum(['AM', 'PM']),
    orden: z.coerce.number().int().min(0).default(0),
    tipoLinea: z.enum(['ESTANDAR', 'OTRO']),
    servicioId: z.coerce.number().int().positive().optional(),
    proveedorId: z.coerce.number().int().positive().optional(),
    acomodacion: z.enum(['SINGLE', 'DOBLE', 'TWIN', 'TRIPLE']).optional(),
    cantidadPax: z.coerce.number().int().positive(),
    descripcion: z.string().trim().min(1),
    descripcionEn: z.string().trim().min(1).optional(),
    costoTeorico: decimalString,
    margenPct: decimalString.optional(),
    ventaObjetivo: decimalString.optional(),
    estadoServicio: z
      .enum(['PENDIENTE', 'TENTATIVO', 'CONFIRMADO', 'RECHAZADO', 'CANCELADO'])
      .default('PENDIENTE'),
  })
  .superRefine((l, ctx) => {
    if (l.margenPct == null && l.ventaObjetivo == null) {
      ctx.addIssue({
        code: 'custom',
        path: ['margenPct'],
        message: 'Indique margenPct o ventaObjetivo para valorizar la línea (RN-COS-02 / RN-COT-11)',
      })
    }
    if (l.tipoLinea === 'ESTANDAR') {
      if (l.servicioId == null)
        ctx.addIssue({ code: 'custom', path: ['servicioId'], message: 'servicioId es requerido para una línea ESTANDAR' })
      if (l.proveedorId == null)
        ctx.addIssue({ code: 'custom', path: ['proveedorId'], message: 'proveedorId es requerido para una línea ESTANDAR' })
    } else if (l.servicioId != null || l.proveedorId != null || l.acomodacion != null) {
      ctx.addIssue({
        code: 'custom',
        path: ['tipoLinea'],
        message: 'una línea OTRO no referencia servicio, proveedor ni acomodación (RN-COS-05)',
      })
    }
  })

/** POST /ordenes-trabajo/:id/versiones — nueva versión de OT (RN-VER-02/10). Un
 * ALCANCE recotiza la venta y exige aprobación del cliente; una CORRECCION no
 * puede cambiar venta ni costo (lo valida el adaptador). */
export const nuevaVersionSchema = z.object({
  tipoCambio: z.enum(['ALCANCE', 'CORRECCION']),
  motivo: z.string().trim().min(1, 'El motivo es obligatorio a partir de la versión 2 (RN-VER-06)'),
  aprobadoPorCliente: z.boolean().optional().default(false),
  aprobacionReferencia: z.string().trim().min(1).optional(),
  lineas: z.array(lineaVersionSchema).min(1, 'Una versión nueva debe tener al menos una línea'),
})

export type NuevaVersionOTInput = z.infer<typeof nuevaVersionSchema>
export type OrdenTrabajoListQuery = z.infer<typeof ordenTrabajoListQuerySchema>
