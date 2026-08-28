export interface Zona {
  id: number;
  codigo: string;
  nombre: string;
  nombreEn: string | null;
  creadoEn: string;
  actualizadoEn: string | null;
  _count?: { servicios: number };
}

export interface ZonaListResponse {
  data: Zona[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface ZonaCreateInput {
  codigo: string;
  nombre: string;
  nombreEn?: string;
}

export type ZonaUpdateInput = Partial<ZonaCreateInput>;
