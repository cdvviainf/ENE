import type { Acomodacion, Bloque, EstadoCotizacion, Moneda, TipoLinea } from '@prisma/client'

/** RN-COS-06: base tarifaria congelada en la línea ESTANDAR al capturarla. El
 * recálculo por pax (RN-COS-07) reconstruye la línea de costeo desde acá, sin
 * volver a leer el maestro. Los valores viajan como string (RN-DIN-01). */
export type TarifarioSnapshot =
  | { modelo: 'TRAMO_PAX'; moneda: Moneda; tramos: { paxDesde: number; paxHasta: number | null; valor: string }[] }
  | { modelo: 'UNITARIO_PAX'; moneda: Moneda; valorUnitario: string }
  | { modelo: 'ACOMODACION'; moneda: Moneda; valoresPorAcomodacion: Partial<Record<Acomodacion, string>> }

/** Una línea del itinerario ya valorizada y lista para persistir: costo y
 * venta expresados en la moneda de la cotización (RN-MON-01), con el margen
 * congelado en la línea (RN-COS-02) y el costo plasmado (RN-COS-06). Los
 * montos van como string decimal (RN-DIN-01). `advertenciaVigencia` no se
 * persiste: solo informa al frontend que el tarifario usado no cubría la
 * fecha (RN-TAR-05). */
export interface LineaResuelta {
  /** Id de la línea persistida que se conserva (RN-COS-06): permite a
   * reemplazarLineasTx actualizarla en su lugar en vez de recrearla, para que
   * su id no cambie entre guardados. Ausente en líneas nuevas. */
  id?: number
  dia: number
  bloque: Bloque
  orden: number
  tipoLinea: TipoLinea
  servicioId: number | null
  proveedorId: number | null
  tarifarioValorId: number | null
  descripcion: string
  descripcionEn: string | null
  // RN-COT-10: observación libre por línea (bilingüe).
  observacion: string | null
  observacionEn: string | null
  cantidadPax: number
  acomodacion: Acomodacion | null
  costoUnitario: string
  costoTotal: string
  margenPct: string
  ventaTotal: string
  advertenciaVigencia: boolean
  /** RN-COS-06: base tarifaria congelada (null en OTRO). */
  tarifarioSnapshot: TarifarioSnapshot | null
}

/** Totales de una versión (RN-COS-04): la venta es la suma de las líneas y el
 * margen se deriva, no se guarda aparte. */
export interface TotalesVersion {
  costoTotal: string
  margenTotal: string
  ventaTotal: string
}

/** RN-COT-09/10, RN-COS-08: contenido de encabezado que se persiste en cada
 * versión. El recargo (pass-through de la forma de pago) se congela acá:
 * recargoPct snapshotea FormaPago.porcentajeAdicional y recargoTotal =
 * ventaTotal × recargoPct. Montos como string (RN-DIN-01). */
export interface ContenidoVersion {
  fechaVigencia: Date | null
  incluidos: string | null
  incluidosEn: string | null
  noIncluidos: string | null
  noIncluidosEn: string | null
  notasImportantes: string | null
  notasImportantesEn: string | null
  formaPagoId: number | null
  recargoPct: string
  recargoTotal: string
}

/** Transiciones válidas de estado (RN-COT-01). APROBADA no está acá: se
 * alcanza solo por POST /aprobar, que valida RN-COT-04. Los estados terminales
 * (APROBADA, PERDIDA, DESISTIDA) no tienen salidas. */
export const TRANSICIONES_ESTADO: Record<EstadoCotizacion, EstadoCotizacion[]> = {
  BORRADOR: ['ENVIADA', 'PERDIDA', 'DESISTIDA'],
  ENVIADA: ['EN_NEGOCIACION', 'APROBADA', 'PERDIDA', 'DESISTIDA'],
  EN_NEGOCIACION: ['ENVIADA', 'APROBADA', 'PERDIDA', 'DESISTIDA'],
  APROBADA: [],
  PERDIDA: [],
  DESISTIDA: [],
}
