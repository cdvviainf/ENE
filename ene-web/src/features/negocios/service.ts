import { api } from '@/lib/api';
import type {
  Negocio,
  NegocioListResponse,
  NegocioCreateInput,
  NegocioUpdateInput,
  Pasajero,
  PasajeroInput
} from './types';

export const negociosService = {
  async list(params: { page?: number; limit?: number; q?: string; clienteId?: number } = {}): Promise<NegocioListResponse> {
    const searchParams: Record<string, string> = {};
    if (params.page) searchParams.page = String(params.page);
    if (params.limit) searchParams.limit = String(params.limit);
    if (params.q) searchParams.q = params.q;
    if (params.clienteId) searchParams.clienteId = String(params.clienteId);
    return api.get('negocios', { searchParams }).json();
  },

  async getById(id: number): Promise<Negocio> {
    return api.get(`negocios/${id}`).json();
  },

  async create(data: NegocioCreateInput): Promise<Negocio> {
    return api.post('negocios', { json: data }).json();
  },

  async update(id: number, data: NegocioUpdateInput): Promise<Negocio> {
    return api.patch(`negocios/${id}`, { json: data }).json();
  },

  async remove(id: number): Promise<void> {
    await api.delete(`negocios/${id}`);
  },

  async siguienteCodigo(): Promise<string | null> {
    try {
      const res = await api.get('negocios/siguiente-codigo').json<{ codigo: string | null }>();
      return res.codigo;
    } catch {
      return null;
    }
  },

  async crearPasajero(negocioId: number, data: PasajeroInput): Promise<Pasajero> {
    return api.post(`negocios/${negocioId}/pasajeros`, { json: data }).json();
  },

  async eliminarPasajero(negocioId: number, pasajeroId: number): Promise<void> {
    await api.delete(`negocios/${negocioId}/pasajeros/${pasajeroId}`);
  }
};
