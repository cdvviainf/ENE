export type ModeloTarifa = 'TRAMO_PAX' | 'ACOMODACION' | 'UNITARIO_PAX';

export interface TipoServicio {
  id: number;
  codigo: string;
  nombre: string;
  modeloTarifaDefault: ModeloTarifa;
  ventanaAvisoDias: number;
  creadoEn: string;
  actualizadoEn: string | null;
  _count?: { servicios: number; proveedores: number };
}

export interface TipoServicioListResponse {
  data: TipoServicio[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface TipoServicioCreateInput {
  codigo: string;
  nombre: string;
  modeloTarifaDefault: ModeloTarifa;
  ventanaAvisoDias: number;
}

export type TipoServicioUpdateInput = Partial<TipoServicioCreateInput>;

export const MODELO_TARIFA_LABELS: Record<ModeloTarifa, string> = {
  TRAMO_PAX: 'Tramo de pasajeros',
  ACOMODACION: 'Acomodación',
  UNITARIO_PAX: 'Unitario por pasajero'
};
