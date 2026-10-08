export interface Pasajero {
  id: number;
  negocioId: number;
  nombre: string;
  edad: number | null;
  nacionalidad: string | null;
  documento: string | null;
  restricciones: string | null;
}

export interface Negocio {
  id: number;
  codigo: string;
  apellido: string;
  clienteId: number | null;
  nacionalidad: string | null;
  paisOrigen: string | null;
  idioma: string | null;
  cantidadPax: number;
  observaciones: string | null;
  creadoEn: string;
  actualizadoEn: string | null;
  cliente?: { id: number; codigo: string; razonSocial: string };
  pasajeros?: Pasajero[];
  proximaOperacion?: string | null;
}

export interface NegocioListResponse {
  data: Negocio[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface PasajeroInput {
  nombre: string;
  edad?: number;
  nacionalidad?: string;
  documento?: string;
  restricciones?: string;
}

export interface NegocioCreateInput {
  codigo: string;
  apellido: string;
  clienteId?: number | null;
  nacionalidad?: string;
  paisOrigen?: string;
  idioma?: string;
  cantidadPax: number;
  observaciones?: string;
  pasajeros?: PasajeroInput[];
}

export type NegocioUpdateInput = Partial<Omit<NegocioCreateInput, 'codigo' | 'pasajeros'>>;
