import { api } from '@/lib/api';
import type { Pais, PaisListResponse, PaisCreateInput, PaisUpdateInput } from './types';

export const paisesService = {
  async list(params: { page?: number; limit?: number; q?: string } = {}): Promise<PaisListResponse> {
    const searchParams: Record<string, string> = {};
    if (params.page) searchParams.page = String(params.page);
    if (params.limit) searchParams.limit = String(params.limit);
    if (params.q) searchParams.q = params.q;
    return api.get('config/paises', { searchParams }).json();
  },

  async getById(id: number): Promise<Pais> {
    return api.get(`config/paises/${id}`).json();
  },

  async create(data: PaisCreateInput): Promise<Pais> {
    return api.post('config/paises', { json: data }).json();
  },

  async update(id: number, data: PaisUpdateInput): Promise<Pais> {
    return api.patch(`config/paises/${id}`, { json: data }).json();
  },

  async remove(id: number): Promise<void> {
    await api.delete(`config/paises/${id}`);
  }
};
