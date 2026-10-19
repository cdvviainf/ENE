// Tipos del feature Órdenes de Trabajo (Etapa 8). Espeja los contratos del
// backend `src/modules/ordenes-trabajo/`. Los montos llegan como string decimal
// (Decimal(18,4) serializado) y NUNCA se convierten a number: se formatean con
// los helpers de `@/lib/dinero` / `@/lib/porcentaje` (RN-DIN-01).

export type EstadoOT =
  | 'CONFIRMADA'
  | 'EN_ESPERA'
  | 'EN_PREPARACION'
  | 'EN_OPERACION'
  | 'EJECUTADA'
  | 'CERRADA'
  | 'CANCELADA'
  | 'NO_SHOW';

export type EstadoServicio = 'PENDIENTE' | 'TENTATIVO' | 'CONFIRMADO' | 'RECHAZADO' | 'CANCELADO';
export type AreaNegocio = 'RECEPTIVO' | 'EVENTOS';
export type Moneda = 'CLP' | 'USD';
export type Bloque = 'AM' | 'PM';
export type TipoLinea = 'ESTANDAR' | 'OTRO';
export type Acomodacion = 'SINGLE' | 'DOBLE' | 'TWIN' | 'TRIPLE';
export type TipoCambioVersion = 'ALCANCE' | 'CORRECCION';

export const ESTADO_OT_LABELS: Record<EstadoOT, string> = {
  CONFIRMADA: 'Confirmada',
  EN_ESPERA: 'En espera',
  EN_PREPARACION: 'En preparación',
  EN_OPERACION: 'En operación',
  EJECUTADA: 'Ejecutada',
  CERRADA: 'Cerrada',
  CANCELADA: 'Cancelada',
  NO_SHOW: 'No show'
};

export const ESTADO_SERVICIO_LABELS: Record<EstadoServicio, string> = {
  PENDIENTE: 'Pendiente',
  TENTATIVO: 'Tentativo',
  CONFIRMADO: 'Confirmado',
  RECHAZADO: 'Rechazado',
  CANCELADO: 'Cancelado'
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

export const TIPO_CAMBIO_LABELS: Record<TipoCambioVersion, string> = {
  ALCANCE: 'Alcance',
  CORRECCION: 'Corrección'
};

// RN-OT-04: transiciones válidas del ciclo de vida de la OT (espejo del backend,
// ordenes-trabajo.service.ts). CONFIRMADA es el estado inicial; CANCELADA y
// CERRADA son terminales.
export const TRANSICIONES_OT: Record<EstadoOT, EstadoOT[]> = {
  CONFIRMADA: ['EN_ESPERA', 'EN_PREPARACION', 'CANCELADA', 'NO_SHOW'],
  EN_ESPERA: ['EN_PREPARACION', 'CANCELADA', 'NO_SHOW'],
  EN_PREPARACION: ['EN_OPERACION', 'CANCELADA', 'NO_SHOW'],
  EN_OPERACION: ['EJECUTADA', 'CANCELADA', 'NO_SHOW'],
  EJECUTADA: ['CERRADA'],
  NO_SHOW: ['CERRADA'],
  CANCELADA: [],
  CERRADA: []
};

export interface OrdenTrabajoLinea {
  id: number;
  dia: number;
  bloque: Bloque;
  orden: number;
  tipoLinea: TipoLinea;
  descripcion: string;
  descripcionEn: string | null;
  cantidadPax: number;
  acomodacion: Acomodacion | null;
  costoTeorico: string;
  margenPct: string;
  ventaLinea: string;
  estadoServicio: EstadoServicio;
  fechaServicio: string | null;
  servicio: { id: number; codigo: string; nombre: string; nombreEn: string | null } | null;
  proveedor: { id: number; codigo: string; razonSocial: string } | null;
}

export interface OrdenTrabajoVersion {
  id: number;
  version: number;
  tipoCambio: TipoCambioVersion;
  motivo: string | null;
  costoTeoricoTotal: string;
  margenTotal: string;
  ventaTotal: string;
  // RN-VER-10 / QA-VER-001: gate de aprobación del cliente para un ALCANCE.
  aprobadoPorCliente?: boolean;
  aprobacionReferencia?: string | null;
  aprobacionEn?: string | null;
  creadoEn?: string;
  creadoPor?: string;
  lineas?: OrdenTrabajoLinea[];
}

// Entrada del historial (listVersionesOT): sin líneas, con evidencia de aprobación.
export interface OrdenTrabajoVersionResumen {
  id: number;
  version: number;
  tipoCambio: TipoCambioVersion;
  motivo: string | null;
  costoTeoricoTotal: string;
  margenTotal: string;
  ventaTotal: string;
  aprobadoPorCliente?: boolean;
  aprobacionReferencia?: string | null;
  aprobacionEn?: string | null;
  creadoEn: string;
  creadoPor: string;
}

export interface OrdenTrabajoZonaRef {
  zona: { id: number; codigo: string; nombre: string; nombreEn: string | null };
}

export interface OrdenTrabajo {
  id: number;
  numero: string;
  apellido: string;
  estado: EstadoOT;
  fechaOperacion: string;
  cantidadPax: number;
  moneda: Moneda;
  tipoCambioCotizacion: string;
  areaNegocio: AreaNegocio;
  cliente?: { id: number; codigo: string; razonSocial: string; rut: string | null };
  negocio?: { id: number; codigo: string; apellido: string; cantidadPax: number };
  ejecutivo?: { id: number; nombre: string; email: string | null; telefono: string | null } | null;
  zonas?: OrdenTrabajoZonaRef[];
  cotizacion?: { id: number; numero: string } | null;
  versionVigente?: OrdenTrabajoVersion | null;
  versiones?: OrdenTrabajoVersionResumen[];
}

export interface OrdenTrabajoListItem {
  id: number;
  numero: string;
  apellido: string;
  estado: EstadoOT;
  fechaOperacion: string;
  cantidadPax: number;
  moneda: Moneda;
  cliente?: { id: number; codigo: string; razonSocial: string };
  negocio?: { id: number; codigo: string; apellido: string };
  versionVigente?: { version: number; costoTeoricoTotal: string; margenTotal: string; ventaTotal: string } | null;
}

export interface OrdenTrabajoListResponse {
  data: OrdenTrabajoListItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

// POST /:id/versiones — una línea YA valorizada: el costo se digita (la OT no
// re-cotiza desde el tarifario). La venta se deriva de `ventaObjetivo`
// (RN-COT-11) o de `margenPct` (RN-COS-02); exactamente uno de los dos.
export interface LineaVersionInput {
  dia: number;
  bloque: Bloque;
  orden: number;
  tipoLinea: TipoLinea;
  servicioId?: number;
  proveedorId?: number;
  acomodacion?: Acomodacion;
  cantidadPax: number;
  descripcion: string;
  descripcionEn?: string;
  costoTeorico: string;
  margenPct?: string;
  ventaObjetivo?: string;
  estadoServicio?: EstadoServicio;
}

export interface NuevaVersionInput {
  tipoCambio: TipoCambioVersion;
  motivo: string;
  // RN-VER-10: un ALCANCE exige aprobadoPorCliente:true o el backend lo rechaza.
  aprobadoPorCliente?: boolean;
  aprobacionReferencia?: string;
  lineas: LineaVersionInput[];
}

// ── Adjuntos (entidad ORDEN_TRABAJO) ─────────────────────────────────────────
export interface Adjunto {
  id: number;
  entidad: string;
  entidadId: number;
  nombreArchivo: string;
  mimeType: string;
  tamanoBytes: number;
  creadoEn: string;
  creadoPor: string;
}
