export type ModeloTarifa = 'TRAMO_PAX' | 'ACOMODACION' | 'UNITARIO_PAX';

export interface Servicio {
  id: number;
  codigo: string;
  nombre: string;
  nombreEn: string | null;
  descripcion: string | null;
  descripcionEn: string | null;
  zonaId: number | null;
  tipoServicioId: number;
  modeloTarifa: ModeloTarifa;
  margenSugerido: string;
  duracionDias: number | null;
  creadoEn: string;
  actualizadoEn: string | null;
  advertenciaSinTraduccion: boolean;
  zona?: { id: number; codigo: string; nombre: string } | null;
  tipoServicio?: { id: number; codigo: string; nombre: string };
  _count?: { tarifarios: number };
}

export interface ServicioListResponse {
  data: Servicio[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface ServicioCreateInput {
  codigo: string;
  nombre: string;
  nombreEn?: string;
  descripcion?: string;
  descripcionEn?: string;
  zonaId?: number;
  tipoServicioId: number;
  modeloTarifa: ModeloTarifa;
  margenSugerido: string;
  duracionDias?: number;
}

export type ServicioUpdateInput = Partial<Omit<ServicioCreateInput, 'codigo'>>;
