import { z } from 'zod'
import { paginacionSchema } from '../../shared/pagination.js'

// ============================================================================
// Cotización — Docs/reglas-negocio.md §6 (RN-COT-01 a RN-COT-07) y §3
// (RN-COS-*). El itinerario se organiza por día y bloque AM/PM (RN-COT-05);
// una línea es ESTANDAR (trae su costo del tarifario) u OTRO (costo digitado,
// RN-COS-05). Los montos viajan como string decimal, nunca number (RN-DIN-01).
// ============================================================================

const decimalString = z.string().regex(/^-?\d+(\.\d+)?$/, 'Debe ser un decimal válido, ej. 95000.0000')

const bloqueEnum = z.enum(['AM', 'PM'])
const tipoLineaEnum = z.enum(['ESTANDAR', 'OTRO'])
const acomodacionEnum = z.enum(['SINGLE', 'DOBLE', 'TWIN', 'TRIPLE'])
const monedaEnum = z.enum(['CLP', 'USD'])
const areaNegocioEnum = z.enum(['RECEPTIVO', 'EVENTOS'])
const idiomaEnum = z.enum(['es', 'en'])

/** Una línea del itinerario tal como la envía el frontend. Para ESTANDAR el
 * costo NO se digita: lo resuelve el motor desde el tarifario vigente
 * (RN-COS-06). Para OTRO el costo es obligatorio y se digita en la moneda de
 * la cotización (RN-COS-05). `descripcion` es opcional en ESTANDAR (se toma de
 * Servicio.nombre/nombreEn cuando falta) y obligatoria en OTRO. */
export const lineaInputSchema = z
  .object({
    // Identidad de una línea ya persistida (RN-COS-06): si viene y su
    // servicio/proveedor/acomodación no cambian, se conserva su costo congelado
    // en vez de re-resolver el maestro. Ausente en líneas nuevas.
    id: z.coerce.number().int().positive().optional(),
    dia: z.coerce.number().int().min(1),
    bloque: bloqueEnum,
    orden: z.coerce.number().int().min(0).default(0),
    tipoLinea: tipoLineaEnum,
    servicioId: z.coerce.number().int().positive().optional(),
    proveedorId: z.coerce.number().int().positive().optional(),
    acomodacion: acomodacionEnum.optional(),
    cantidadPax: z.coerce.number().int().positive().optional(),
    descripcion: z.string().trim().min(1).optional(),
    descripcionEn: z.string().trim().min(1).optional(),
    // RN-COT-10: observación libre por línea (bilingüe), sale en el PDF.
    observacion: z.string().trim().min(1).optional(),
    observacionEn: z.string().trim().min(1).optional(),
    costoTotal: decimalString.optional(),
    margenPct: decimalString.optional(),
    // RN-COT-11: venta objetivo. Si viene, el margen se DERIVA de la venta
    // digitada (venta/costo − 1). Habilitado para ESTANDAR y OTRO por igual.
    ventaObjetivo: decimalString.optional(),
  })
  .superRefine((l, ctx) => {
    if (l.tipoLinea === 'ESTANDAR') {
      if (l.servicioId == null) ctx.addIssue({ code: 'custom', path: ['servicioId'], message: 'servicioId es requerido para una línea ESTANDAR (RN-COS-05)' })
      if (l.proveedorId == null) ctx.addIssue({ code: 'custom', path: ['proveedorId'], message: 'proveedorId es requerido para una línea ESTANDAR' })
      if (l.costoTotal != null) ctx.addIssue({ code: 'custom', path: ['costoTotal'], message: 'una línea ESTANDAR toma su costo del tarifario, no se digita (RN-COS-06)' })
    } else {
      if (!l.descripcion) ctx.addIssue({ code: 'custom', path: ['descripcion'], message: 'la descripción es obligatoria en una línea OTRO (RN-COS-05)' })
      if (l.costoTotal == null) ctx.addIssue({ code: 'custom', path: ['costoTotal'], message: 'el costo es obligatorio en una línea OTRO' })
      if (l.servicioId != null || l.proveedorId != null || l.acomodacion != null) {
        ctx.addIssue({ code: 'custom', path: ['tipoLinea'], message: 'una línea OTRO no referencia servicio, proveedor ni acomodación (RN-COS-05)' })
      }
    }
  })

export const cotizacionCreateSchema = z.object({
  clienteId: z.coerce.number().int().positive(),
  ejecutivoId: z.coerce.number().int().positive().optional(),
  negocioId: z.coerce.number().int().positive(),
  areaNegocio: areaNegocioEnum,
  // RN-COT-08: una cotización puede abarcar varias zonas (antes era una sola).
  zonaIds: z.array(z.coerce.number().int().positive()).optional().default([]),
  fechaOperacion: z.coerce.date(),
  cantidadPax: z.coerce.number().int().positive(),
  idiomaDocumento: idiomaEnum.default('es'),
  // RN-MON-01 (enmendada): la moneda es libre (USD/CLP), independiente del
  // área. El frontend sugiere un default por área, pero no se fuerza.
  moneda: monedaEnum,
  tipoCambio: decimalString,
})

/** Campos de cabecera editables de una cotización (todos opcionales). Mismo
 * conjunto que acepta el update parcial. RN-COT-08 (zonas). */
export const cotizacionUpdateSchema = cotizacionCreateSchema.partial()

/** RN-COT-09/10/COS-08: contenido de encabezado que viaja con cada versión —
 * vigencia, comentarios bilingües y forma de pago (con su recargo). Compartido
 * por el guardado de itinerario (BORRADOR) y la creación de versión. */
const contenidoVersionSchema = {
  fechaVigencia: z.coerce.date().optional().nullable(),
  incluidos: z.string().trim().optional().nullable(),
  incluidosEn: z.string().trim().optional().nullable(),
  noIncluidos: z.string().trim().optional().nullable(),
  noIncluidosEn: z.string().trim().optional().nullable(),
  notasImportantes: z.string().trim().optional().nullable(),
  notasImportantesEn: z.string().trim().optional().nullable(),
  formaPagoId: z.coerce.number().int().positive().optional().nullable(),
}

/** Reemplazo completo del itinerario de la versión vigente (solo BORRADOR,
 * RN-VER-08). Exige al menos una línea: guardar un itinerario vacío no tiene
 * valor operativo y dejaba una cotización que igual no podría aprobarse
 * (RN-COT-04). Decisión de usuario (01-oct-2026): el bloqueo se adelanta al
 * guardado en vez de esperar a la aprobación — RN-COT-04 (gate de aprobación)
 * queda intacto, solo se hace estricto antes. Mismo criterio que
 * nuevaVersionSchema, que ya lo exigía. */
export const itinerarioSchema = z.object({
  lineas: z.array(lineaInputSchema).min(1, 'El itinerario debe tener al menos una línea'),
  ...contenidoVersionSchema,
})

/** POST /:id/preview-linea — cálculo de una línea ESTANDAR sin persistir, para
 * que el diálogo del itinerario muestre el costo resuelto del tarifario vigente
 * (RN-COS-06, RN-TAR-05) y la venta ANTES de guardar. Si no hay tarifario, el
 * service devuelve `{ disponible: false }` en vez de error, para sugerir cargar
 * la línea como OTRO (RN-COS-05). `ventaObjetivo` (opcional): si viene, el
 * margen se DERIVA de la venta digitada (venta/costo − 1, RN-COS-04) en el
 * servidor con decimal.js; si no, se usa `margenPct` o el sugerido del servicio
 * (RN-COS-02). */
export const previewLineaSchema = z
  .object({
    // Identidad de una línea ya persistida (RN-COS-06): si viene y la línea
    // conserva su base (servicio/proveedor/acomodación), el preview se calcula
    // desde su costo y snapshot CONGELADOS —igual que el guardado—, no desde el
    // maestro vigente. Ausente al previsualizar una línea nueva o una sustitución.
    lineaId: z.coerce.number().int().positive().optional(),
    // RN-COT-11: el preview también sirve a OTRO (costo digitado) para derivar su
    // venta/margen igual que ESTANDAR. Default ESTANDAR por compatibilidad.
    tipoLinea: tipoLineaEnum.default('ESTANDAR'),
    dia: z.coerce.number().int().min(1),
    cantidadPax: z.coerce.number().int().positive().optional(),
    servicioId: z.coerce.number().int().positive().optional(),
    proveedorId: z.coerce.number().int().positive().optional(),
    acomodacion: acomodacionEnum.optional(),
    costoTotal: decimalString.optional(),
    margenPct: decimalString.optional(),
    ventaObjetivo: decimalString.optional(),
  })
  .superRefine((l, ctx) => {
    if (l.tipoLinea === 'ESTANDAR') {
      if (l.servicioId == null) ctx.addIssue({ code: 'custom', path: ['servicioId'], message: 'servicioId es requerido para preview ESTANDAR' })
      if (l.proveedorId == null) ctx.addIssue({ code: 'custom', path: ['proveedorId'], message: 'proveedorId es requerido para preview ESTANDAR' })
    } else if (l.costoTotal == null) {
      ctx.addIssue({ code: 'custom', path: ['costoTotal'], message: 'costoTotal es requerido para preview OTRO' })
    }
  })

/** Nueva versión de negociación tras el envío al cliente (RN-VER-02). El
 * motivo es obligatorio a partir de la v2 (RN-VER-06). */
export const nuevaVersionSchema = z.object({
  motivo: z.string().trim().min(1, 'El motivo es obligatorio a partir de la versión 2 (RN-VER-06)'),
  lineas: z.array(lineaInputSchema).min(1, 'Una versión nueva debe tener al menos una línea'),
  ...contenidoVersionSchema,
})

export const recalcularPaxSchema = z.object({
  cantidadPax: z.coerce.number().int().positive(),
})

/** PATCH /cantidad-pax — aplica el recálculo. El motivo es obligatorio solo
 * tras el envío (lo valida el service según el estado, RN-VER-06). */
export const aplicarPaxSchema = z.object({
  cantidadPax: z.coerce.number().int().positive(),
  motivo: z.string().trim().min(1).optional(),
})

/** PATCH /estado — transiciones comerciales. APROBADA no entra acá: pasa por
 * POST /aprobar, que valida RN-COT-04 y genera la OT (Etapa 8). */
export const cambioEstadoSchema = z.object({
  estado: z.enum(['ENVIADA', 'EN_NEGOCIACION', 'PERDIDA', 'DESISTIDA']),
})

export const cotizacionListQuerySchema = paginacionSchema.extend({
  estado: z.enum(['BORRADOR', 'ENVIADA', 'EN_NEGOCIACION', 'APROBADA', 'PERDIDA', 'DESISTIDA']).optional(),
  clienteId: z.coerce.number().int().positive().optional(),
  q: z.string().trim().optional(),
})

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() })
export const versionParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  version: z.coerce.number().int().positive(),
})

export type LineaInput = z.infer<typeof lineaInputSchema>
export type CotizacionCreateInput = z.infer<typeof cotizacionCreateSchema>
export type CotizacionUpdateInput = z.infer<typeof cotizacionUpdateSchema>
export type ItinerarioInput = z.infer<typeof itinerarioSchema>
export type NuevaVersionInput = z.infer<typeof nuevaVersionSchema>
export type PreviewLineaInput = z.infer<typeof previewLineaSchema>
