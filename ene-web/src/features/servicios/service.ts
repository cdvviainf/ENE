import { api } from '@/lib/api';
import type { Servicio, ServicioListResponse, ServicioCreateInput, ServicioUpdateInput } from './types';

export const serviciosService = {
  async list(
    params: { page?: number; limit?: number; q?: string; zonaId?: number; tipoServicioId?: number } = {}
  ): Promise<ServicioListResponse> {
    const searchParams: Record<string, string> = {};
    if (params.page) searchParams.page = String(params.page);
    if (params.limit) searchParams.limit = String(params.limit);
    if (params.q) searchParams.q = params.q;
    if (params.zonaId) searchParams.zonaId = String(params.zonaId);
    if (params.tipoServicioId) searchParams.tipoServicioId = String(params.tipoServicioId);
    return api.get('servicios', { searchParams }).json();
  },

  async getById(id: number): Promise<Servicio> {
    return api.get(`servicios/${id}`).json();
  },

  async create(data: ServicioCreateInput): Promise<Servicio> {
    return api.post('servicios', { json: data }).json();
  },

  async update(id: number, data: ServicioUpdateInput): Promise<Servicio> {
    return api.patch(`servicios/${id}`, { json: data }).json();
  },

  async remove(id: number): Promise<void> {
    await api.delete(`servicios/${id}`);
  },

  async siguienteCodigo(): Promise<string | null> {
    try {
      const res = await api.get('servicios/siguiente-codigo').json<{ codigo: string | null }>();
      return res.codigo;
    } catch {
      return null;
    }
  }
};
