export type EstadoCotizacion = 'BORRADOR' | 'ENVIADA' | 'EN_NEGOCIACION' | 'APROBADA' | 'PERDIDA' | 'DESISTIDA';
export type AreaNegocio = 'RECEPTIVO' | 'EVENTOS';
export type Moneda = 'CLP' | 'USD';
export type Bloque = 'AM' | 'PM';
export type TipoLinea = 'ESTANDAR' | 'OTRO';
export type Acomodacion = 'SINGLE' | 'DOBLE' | 'TWIN' | 'TRIPLE';
export type IdiomaDocumento = 'es' | 'en';
export type ModalidadDocumento = 'total' | 'desglosado';

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
  cantidadPax: number;
  acomodacion: Acomodacion | null;
  costoUnitario: string;
  costoTotal: string;
  margenPct: string;
  ventaTotal: string;
  servicio?: { id: number; codigo: string; nombre: string; nombreEn: string | null };
  proveedor?: { id: number; codigo: string; razonSocial: string };
}

export interface CotizacionVersion {
  id: number;
  version: number;
  motivo: string | null;
  costoTotal: string;
  margenTotal: string;
  ventaTotal: string;
  creadoEn: string;
  creadoPor: string;
  lineas?: CotizacionLinea[];
}

export interface Cotizacion {
  id: number;
  numero: string;
  clienteId: number;
  ejecutivoId: number | null;
  grupoId: number;
  areaNegocio: AreaNegocio;
  zonaId: number | null;
  fechaOperacion: string;
  cantidadPax: number;
  idiomaDocumento: string;
  moneda: Moneda;
  tipoCambio: string;
  estado: EstadoCotizacion;
  versionVigenteId: number | null;
  creadoEn: string;
  cliente?: { id: number; codigo: string; razonSocial: string; rut: string | null };
  grupo?: { id: number; codigo: string; apellido: string; cantidadPax: number };
  ejecutivo?: { id: number; nombre: string; email: string | null } | null;
  zona?: { id: number; codigo: string; nombre: string; nombreEn: string | null } | null;
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
  grupo?: { id: number; codigo: string; apellido: string };
  versionVigente?: { version: number; costoTotal: string; margenTotal: string; ventaTotal: string } | null;
}

export interface CotizacionListResponse {
  data: CotizacionListItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface CotizacionCreateInput {
  clienteId: number;
  ejecutivoId?: number;
  grupoId: number;
  areaNegocio: AreaNegocio;
  zonaId?: number;
  fechaOperacion: string;
  cantidadPax: number;
  idiomaDocumento: IdiomaDocumento;
  moneda: Moneda;
  tipoCambio: string;
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
  costoTotal?: string;
  margenPct?: string;
}

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
