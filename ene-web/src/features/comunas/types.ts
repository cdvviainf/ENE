import type { Provincia } from '@/features/provincias/types';

export interface Comuna {
  id: number;
  codigo: string;
  nombre: string;
  provinciaId: number;
  provincia?: Pick<Provincia, 'id' | 'codigo' | 'nombre'> & {
    region?: { id: number; codigo: string; nombre: string };
  };
  creadoEn: string;
  actualizadoEn: string | null;
}

export interface ComunaListResponse {
  data: Comuna[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface ComunaCreateInput {
  codigo: string;
  nombre: string;
  provinciaId: number;
}

export type ComunaUpdateInput = Partial<ComunaCreateInput>;
