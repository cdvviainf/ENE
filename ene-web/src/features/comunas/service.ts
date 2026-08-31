import { api } from '@/lib/api';
import type { Comuna, ComunaListResponse, ComunaCreateInput, ComunaUpdateInput } from './types';

export const comunasService = {
  async list(
    params: { page?: number; limit?: number; q?: string; provinciaId?: number } = {}
  ): Promise<ComunaListResponse> {
    const searchParams: Record<string, string> = {};
    if (params.page) searchParams.page = String(params.page);
    if (params.limit) searchParams.limit = String(params.limit);
    if (params.q) searchParams.q = params.q;
    if (params.provinciaId) searchParams.provinciaId = String(params.provinciaId);
    return api.get('config/comunas', { searchParams }).json();
  },

  async getById(id: number): Promise<Comuna> {
    return api.get(`config/comunas/${id}`).json();
  },

  async create(data: ComunaCreateInput): Promise<Comuna> {
    return api.post('config/comunas', { json: data }).json();
  },

  async update(id: number, data: ComunaUpdateInput): Promise<Comuna> {
    return api.patch(`config/comunas/${id}`, { json: data }).json();
  },

  async remove(id: number): Promise<void> {
    await api.delete(`config/comunas/${id}`);
  }
};
