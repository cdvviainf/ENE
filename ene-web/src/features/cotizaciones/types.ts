export type EstadoCotizacion = 'BORRADOR' | 'ENVIADA' | 'EN_NEGOCIACION' | 'APROBADA' | 'PERDIDA' | 'DESISTIDA';
export type AreaNegocio = 'RECEPTIVO' | 'EVENTOS';
export type Moneda = 'CLP' | 'USD';
export type Bloque = 'AM' | 'PM';
export type TipoLinea = 'ESTANDAR' | 'OTRO';
export type Acomodacion = 'SINGLE' | 'DOBLE' | 'TWIN' | 'TRIPLE';
export type IdiomaDocumento = 'es' | 'en';
export type ModalidadDocumento = 'total' | 'desglosado' | 'desglosado_pax';
export type FormaCalculoImpuesto = 'NINGUNO' | 'IVA' | 'RETENCION';

export const ESTADO_LABELS: Record<EstadoCotizacion, string> = {
  BORRADOR: 'Borrador',
  ENVIADA: 'Enviada',
  EN_NEGOCIACION: 'En negociación',
  APROBADA: 'Aprobada',
  PERDIDA: 'Perdida',
  DESISTIDA: 'Desistida'
};

export const AREA_LABELS: Record<AreaNegocio, string> = {
  RECEPTIVO: 'Turismo receptivo',
  EVENTOS: 'Eventos corporativos'
};

export const ACOMODACION_LABELS: Record<Acomodacion, string> = {
  SINGLE: 'Single',
  DOBLE: 'Doble',
  TWIN: 'Twin',
  TRIPLE: 'Triple'
};

export const MODALIDAD_LABELS: Record<ModalidadDocumento, string> = {
  total: 'Valor total',
  desglosado: 'Desglosado por ítem',
  desglosado_pax: 'Detallado por pasajero'
};

export const FORMA_CALCULO_LABELS: Record<FormaCalculoImpuesto, string> = {
  NINGUNO: 'Sin impuesto',
  IVA: 'IVA',
  RETENCION: 'Retención'
};

export interface CotizacionLinea {
  id: number;
  dia: number;
  bloque: Bloque;
  orden: number;
  tipoLinea: TipoLinea;
  servicioId: number | null;
  proveedorId: number | null;
  descripcion: string;
  descripcionEn: string | null;
  // RN-COT-10: observación libre por línea (bilingüe).
  observacion: string | null;
  observacionEn: string | null;
  cantidadPax: number;
  acomodacion: Acomodacion | null;
  costoUnitario: string;
  costoTotal: string;
  margenPct: string;
  ventaTotal: string;
  servicio?: { id: number; codigo: string; nombre: string; nombreEn: string | null };
  // RN-PRV-11: el tipo de documento del proveedor da la retención/IVA referencial interna.
  proveedor?: {
    id: number;
    codigo: string;
    razonSocial: string;
    tipoDocumento?: { id: number; codigo: string; nombre: string; formaCalculo: FormaCalculoImpuesto; porcentaje: string } | null;
  };
}

export interface CotizacionVersion {
  id: number;
  version: number;
  motivo: string | null;
  costoTotal: string;
  margenTotal: string;
  ventaTotal: string;
  // RN-COT-09/10: vigencia y comentarios de encabezado (bilingües).
  fechaVigencia: string | null;
  incluidos: string | null;
  incluidosEn: string | null;
  noIncluidos: string | null;
  noIncluidosEn: string | null;
  notasImportantes: string | null;
  notasImportantesEn: string | null;
  // RN-COS-08: forma de pago + recargo pass-through congelado.
  formaPagoId: number | null;
  recargoPct: string;
  recargoTotal: string;
  formaPago?: { id: number; codigo: string; nombre: string; porcentajeAdicional: string } | null;
  creadoEn: string;
  creadoPor: string;
  lineas?: CotizacionLinea[];
}

export interface CotizacionZonaRef {
  zonaId: number;
  zona?: { id: number; codigo: string; nombre: string; nombreEn: string | null };
}

export interface Cotizacion {
  id: number;
  numero: string;
  clienteId: number;
  ejecutivoId: number | null;
  negocioId: number;
  areaNegocio: AreaNegocio;
  fechaOperacion: string;
  cantidadPax: number;
  idiomaDocumento: string;
  moneda: Moneda;
  tipoCambio: string;
  estado: EstadoCotizacion;
  versionVigenteId: number | null;
  creadoEn: string;
  cliente?: { id: number; codigo: string; razonSocial: string; rut: string | null };
  negocio?: { id: number; codigo: string; apellido: string; cantidadPax: number };
  ejecutivo?: { id: number; nombre: string; email: string | null } | null;
  // RN-COT-08: múltiples zonas (N:N).
  zonas?: CotizacionZonaRef[];
  versionVigente?: CotizacionVersion | null;
}

export interface CotizacionListItem {
  id: number;
  numero: string;
  estado: EstadoCotizacion;
  areaNegocio: AreaNegocio;
  moneda: Moneda;
  fechaOperacion: string;
  cantidadPax: number;
  creadoEn: string;
  cliente?: { id: number; codigo: string; razonSocial: string };
  negocio?: { id: number; codigo: string; apellido: string };
  versionVigente?: { version: number; costoTotal: string; margenTotal: string; ventaTotal: string } | null;
}

export interface CotizacionListResponse {
  data: CotizacionListItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface CotizacionCreateInput {
  clienteId: number;
  ejecutivoId?: number;
  negocioId: number;
  areaNegocio: AreaNegocio;
  // RN-COT-08: múltiples zonas.
  zonaIds?: number[];
  fechaOperacion: string;
  cantidadPax: number;
  idiomaDocumento: IdiomaDocumento;
  moneda: Moneda;
  tipoCambio: string;
}

// RN-COT-09/10/COS-08: contenido de encabezado que viaja con el guardado de
// itinerario y con la creación de versión.
export interface ContenidoVersionInput {
  fechaVigencia?: string | null;
  incluidos?: string | null;
  incluidosEn?: string | null;
  noIncluidos?: string | null;
  noIncluidosEn?: string | null;
  notasImportantes?: string | null;
  notasImportantesEn?: string | null;
  formaPagoId?: number | null;
}

// RN-COS-05: ESTANDAR trae su costo del tarifario (no se digita); OTRO lleva
// costoTotal digitado. margenPct opcional: el backend siembra desde el
// servicio o el margen por defecto de la cotización.
export interface LineaInput {
  // Identidad de una línea ya persistida (RN-COS-06): permite al backend
  // conservar su costo congelado en vez de re-cotizar. Ausente en líneas nuevas.
  id?: number;
  dia: number;
  bloque: Bloque;
  orden: number;
  tipoLinea: TipoLinea;
  servicioId?: number;
  proveedorId?: number;
  acomodacion?: Acomodacion;
  cantidadPax?: number;
  descripcion?: string;
  descripcionEn?: string;
  observacion?: string;
  observacionEn?: string;
  costoTotal?: string;
  margenPct?: string;
}

// POST /:id/preview-linea — costo/venta de una línea ESTANDAR sin persistir.
// `disponible: false` cuando no hay tarifario vigente para la combinación
// (RN-COS-05): el diálogo lo muestra inline y sugiere cargar la línea como OTRO.
export type PreviewLineaInput = {
  // Identidad de una línea ya persistida (RN-COS-06): si conserva su base, el
  // backend valoriza desde su costo/snapshot congelados, no desde el maestro.
  lineaId?: number;
  // RN-COT-11: ESTANDAR (default) resuelve el tarifario; OTRO usa costoTotal.
  tipoLinea?: TipoLinea;
  dia: number;
  cantidadPax?: number;
  servicioId?: number;
  proveedorId?: number;
  acomodacion?: Acomodacion;
  costoTotal?: string;
  margenPct?: string;
  // Si viene, el margen se deriva de esta venta en el servidor (RN-COS-04).
  ventaObjetivo?: string;
};

export type PreviewLineaResponse =
  | { disponible: false; motivo: string }
  | {
      disponible: true;
      moneda: Moneda;
      costoUnitario: string;
      costoTotal: string;
      margenPct: string;
      ventaTotal: string;
      advertenciaVigencia: boolean;
    };

export interface RecalcularPaxResponse {
  lineas: Array<{
    dia: number;
    bloque: Bloque;
    orden: number;
    tipoLinea: TipoLinea;
    descripcion: string;
    cantidadPax: number;
    costoTotal: string;
    margenPct: string;
    ventaTotal: string;
    advertenciaVigencia: boolean;
  }>;
  totales: { costoTotal: string; margenTotal: string; ventaTotal: string };
}
