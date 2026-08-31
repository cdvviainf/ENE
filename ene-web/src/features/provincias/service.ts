import { api } from '@/lib/api';
import type { Provincia, ProvinciaListResponse, ProvinciaCreateInput, ProvinciaUpdateInput } from './types';

export const provinciasService = {
  async list(
    params: { page?: number; limit?: number; q?: string; regionId?: number } = {}
  ): Promise<ProvinciaListResponse> {
    const searchParams: Record<string, string> = {};
    if (params.page) searchParams.page = String(params.page);
    if (params.limit) searchParams.limit = String(params.limit);
    if (params.q) searchParams.q = params.q;
    if (params.regionId) searchParams.regionId = String(params.regionId);
    return api.get('config/provincias', { searchParams }).json();
  },

  async getById(id: number): Promise<Provincia> {
    return api.get(`config/provincias/${id}`).json();
  },

  async create(data: ProvinciaCreateInput): Promise<Provincia> {
    return api.post('config/provincias', { json: data }).json();
  },

  async update(id: number, data: ProvinciaUpdateInput): Promise<Provincia> {
    return api.patch(`config/provincias/${id}`, { json: data }).json();
  },

  async remove(id: number): Promise<void> {
    await api.delete(`config/provincias/${id}`);
  }
};
