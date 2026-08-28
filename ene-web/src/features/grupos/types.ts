export interface Pasajero {
  id: number;
  grupoId: number;
  nombre: string;
  edad: number | null;
  nacionalidad: string | null;
  documento: string | null;
  restricciones: string | null;
}

export interface Grupo {
  id: number;
  codigo: string;
  apellido: string;
  clienteId: number;
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

export interface GrupoListResponse {
  data: Grupo[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface PasajeroInput {
  nombre: string;
  edad?: number;
  nacionalidad?: string;
  documento?: string;
  restricciones?: string;
}

export interface GrupoCreateInput {
  codigo: string;
  apellido: string;
  clienteId: number;
  nacionalidad?: string;
  paisOrigen?: string;
  idioma?: string;
  cantidadPax: number;
  observaciones?: string;
  pasajeros?: PasajeroInput[];
}

export type GrupoUpdateInput = Partial<Omit<GrupoCreateInput, 'codigo' | 'pasajeros'>>;
