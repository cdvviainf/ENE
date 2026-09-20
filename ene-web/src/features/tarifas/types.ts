export type ModeloTarifa = 'TRAMO_PAX' | 'ACOMODACION' | 'UNITARIO_PAX';
export type Acomodacion = 'SINGLE' | 'DOBLE' | 'TWIN' | 'TRIPLE';
export type Moneda = 'CLP' | 'USD';

export const ACOMODACION_LABELS: Record<Acomodacion, string> = {
  SINGLE: 'Single',
  DOBLE: 'Doble',
  TWIN: 'Twin',
  TRIPLE: 'Triple'
};

export interface TarifarioValor {
  id: number;
  modelo: ModeloTarifa;
  paxDesde: number | null;
  paxHasta: number | null;
  acomodacion: Acomodacion | null;
  valor: string;
  suplementoSingle: string | null;
}

export interface Tarifario {
  id: number;
  proveedorId: number;
  servicioId: number;
  moneda: Moneda;
  vigenciaDesde: string;
  vigenciaHasta: string | null;
  version: number;
  activo: boolean;
  creadoEn: string;
  proveedor?: { id: number; codigo: string; razonSocial: string };
  servicio?: { id: number; codigo: string; nombre: string; modeloTarifa: ModeloTarifa };
  valores: TarifarioValor[];
}

export interface TarifarioListResponse {
  data: Tarifario[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

// RN-DIN-01: valor/suplementoSingle viajan como string decimal, nunca number.
export interface TarifarioValorInput {
  modelo: ModeloTarifa;
  paxDesde?: number;
  paxHasta?: number | null;
  acomodacion?: Acomodacion;
  valor: string;
  suplementoSingle?: string;
}

export interface TarifarioCreateInput {
  proveedorId: number;
  servicioId: number;
  moneda: Moneda;
  vigenciaDesde: string;
  vigenciaHasta?: string;
  valores: TarifarioValorInput[];
}

export interface TarifarioNuevaVersionInput {
  moneda?: Moneda;
  vigenciaDesde: string;
  vigenciaHasta?: string;
  valores: TarifarioValorInput[];
}

// RN-TAR-04/RN-TAR-05: nunca bloquean, solo informan.
export interface Advertencia {
  regla: string;
  mensaje: string;
  detalle?: Record<string, unknown>;
}

export interface TarifarioConAdvertencias extends Tarifario {
  advertencias: Advertencia[];
}
