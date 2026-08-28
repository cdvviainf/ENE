import { api } from '@/lib/api';
import type { Zona, ZonaListResponse, ZonaCreateInput, ZonaUpdateInput } from './types';

export const zonasService = {
  async list(params: { page?: number; limit?: number; q?: string } = {}): Promise<ZonaListResponse> {
    const searchParams: Record<string, string> = {};
    if (params.page) searchParams.page = String(params.page);
    if (params.limit) searchParams.limit = String(params.limit);
    if (params.q) searchParams.q = params.q;
    return api.get('config/zonas', { searchParams }).json();
  },

  async getById(id: number): Promise<Zona> {
    return api.get(`config/zonas/${id}`).json();
  },

  async create(data: ZonaCreateInput): Promise<Zona> {
    return api.post('config/zonas', { json: data }).json();
  },

  async update(id: number, data: ZonaUpdateInput): Promise<Zona> {
    return api.patch(`config/zonas/${id}`, { json: data }).json();
  },

  async remove(id: number): Promise<void> {
    await api.delete(`config/zonas/${id}`);
  }
};
