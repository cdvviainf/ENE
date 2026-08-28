import { api } from '@/lib/api';
import type { TipoServicio, TipoServicioListResponse, TipoServicioCreateInput, TipoServicioUpdateInput } from './types';

export const tiposServicioService = {
  async list(params: { page?: number; limit?: number; q?: string } = {}): Promise<TipoServicioListResponse> {
    const searchParams: Record<string, string> = {};
    if (params.page) searchParams.page = String(params.page);
    if (params.limit) searchParams.limit = String(params.limit);
    if (params.q) searchParams.q = params.q;
    return api.get('config/tipos-servicio', { searchParams }).json();
  },

  async getById(id: number): Promise<TipoServicio> {
    return api.get(`config/tipos-servicio/${id}`).json();
  },

  async create(data: TipoServicioCreateInput): Promise<TipoServicio> {
    return api.post('config/tipos-servicio', { json: data }).json();
  },

  async update(id: number, data: TipoServicioUpdateInput): Promise<TipoServicio> {
    return api.patch(`config/tipos-servicio/${id}`, { json: data }).json();
  },

  async remove(id: number): Promise<void> {
    await api.delete(`config/tipos-servicio/${id}`);
  }
};
