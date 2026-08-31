export interface Region {
  id: number;
  codigo: string;
  nombre: string;
  creadoEn: string;
  actualizadoEn: string | null;
  _count?: { provincias: number };
}

export interface RegionListResponse {
  data: Region[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface RegionCreateInput {
  codigo: string;
  nombre: string;
}

export type RegionUpdateInput = Partial<RegionCreateInput>;
