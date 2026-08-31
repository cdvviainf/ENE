import { api } from '@/lib/api';
import type { Region, RegionListResponse, RegionCreateInput, RegionUpdateInput } from './types';

export const regionesService = {
  async list(params: { page?: number; limit?: number; q?: string } = {}): Promise<RegionListResponse> {
    const searchParams: Record<string, string> = {};
    if (params.page) searchParams.page = String(params.page);
    if (params.limit) searchParams.limit = String(params.limit);
    if (params.q) searchParams.q = params.q;
    return api.get('config/regiones', { searchParams }).json();
  },

  async getById(id: number): Promise<Region> {
    return api.get(`config/regiones/${id}`).json();
  },

  async create(data: RegionCreateInput): Promise<Region> {
    return api.post('config/regiones', { json: data }).json();
  },

  async update(id: number, data: RegionUpdateInput): Promise<Region> {
    return api.patch(`config/regiones/${id}`, { json: data }).json();
  },

  async remove(id: number): Promise<void> {
    await api.delete(`config/regiones/${id}`);
  }
};
