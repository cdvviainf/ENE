import type { Region } from '@/features/regiones/types';

export interface Provincia {
  id: number;
  codigo: string;
  nombre: string;
  regionId: number;
  region?: Pick<Region, 'id' | 'codigo' | 'nombre'>;
  creadoEn: string;
  actualizadoEn: string | null;
  _count?: { comunas: number };
}

export interface ProvinciaListResponse {
  data: Provincia[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface ProvinciaCreateInput {
  codigo: string;
  nombre: string;
  regionId: number;
}

export type ProvinciaUpdateInput = Partial<ProvinciaCreateInput>;
