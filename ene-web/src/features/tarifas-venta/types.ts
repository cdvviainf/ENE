import type { Acomodacion, ModeloTarifa, Moneda } from '@/features/tarifas/types';

// Tarifas de venta (RN-TVE-01..06): precio de lista por servicio, sin
// proveedor. Mismos modelos que el tarifario de proveedor, sin suplemento.

export type EstadoTarifaVenta = 'VIGENTE' | 'PROGRAMADA' | 'VENCIDA' | 'SIN_TARIFA';

export const ESTADO_TARIFA_VENTA_LABELS: Record<EstadoTarifaVenta, string> = {
  VIGENTE: 'Vigente',
  PROGRAMADA: 'Programada',
  VENCIDA: 'Vencido',
  SIN_TARIFA: 'Sin tarifa'
};

export interface TarifaVentaResumen {
  id: number;
  moneda: Moneda;
  version: number;
  vigenciaDesde: string;
  vigenciaHasta: string | null;
  estado: Exclude<EstadoTarifaVenta, 'SIN_TARIFA'>;
}

export interface ServicioConTarifa {
  id: number;
  codigo: string;
  nombre: string;
  modeloTarifa: ModeloTarifa;
  zona: { id: number; nombre: string } | null;
  tipoServicio: { id: number; nombre: string };
  estado: EstadoTarifaVenta;
  tarifas: TarifaVentaResumen[];
}

export interface ServiciosConTarifaResponse {
  data: ServicioConTarifa[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface TarifaVentaValor {
  id: number;
  modelo: ModeloTarifa;
  paxDesde: number | null;
  paxHasta: number | null;
  acomodacion: Acomodacion | null;
  valor: string;
}

export interface TarifaVenta {
  id: number;
  servicioId: number;
  moneda: Moneda;
  vigenciaDesde: string;
  vigenciaHasta: string | null;
  version: number;
  activo: boolean;
  creadoEn: string;
  // null cuando la tarifa ya fue reemplazada por una versión posterior.
  estado: Exclude<EstadoTarifaVenta, 'SIN_TARIFA'> | null;
  servicio?: { id: number; codigo: string; nombre: string; modeloTarifa: ModeloTarifa };
  valores: TarifaVentaValor[];
}

export interface TarifaVentaValorInput {
  modelo: ModeloTarifa;
  paxDesde?: number;
  paxHasta?: number | null;
  acomodacion?: Acomodacion;
  valor: string;
}

export interface TarifaVentaCreateInput {
  servicioId: number;
  moneda: Moneda;
  vigenciaDesde: string;
  vigenciaHasta?: string;
  valores: TarifaVentaValorInput[];
}

// Nueva versión y edición: servicio y moneda se heredan de la cadena.
export interface TarifaVentaCambioInput {
  vigenciaDesde: string;
  vigenciaHasta?: string;
  valores: TarifaVentaValorInput[];
}
