import { api } from '@/lib/api';
import type {
  Grupo,
  GrupoListResponse,
  GrupoCreateInput,
  GrupoUpdateInput,
  Pasajero,
  PasajeroInput
} from './types';

export const gruposService = {
  async list(params: { page?: number; limit?: number; q?: string; clienteId?: number } = {}): Promise<GrupoListResponse> {
    const searchParams: Record<string, string> = {};
    if (params.page) searchParams.page = String(params.page);
    if (params.limit) searchParams.limit = String(params.limit);
    if (params.q) searchParams.q = params.q;
    if (params.clienteId) searchParams.clienteId = String(params.clienteId);
    return api.get('grupos', { searchParams }).json();
  },

  async getById(id: number): Promise<Grupo> {
    return api.get(`grupos/${id}`).json();
  },

  async create(data: GrupoCreateInput): Promise<Grupo> {
    return api.post('grupos', { json: data }).json();
  },

  async update(id: number, data: GrupoUpdateInput): Promise<Grupo> {
    return api.patch(`grupos/${id}`, { json: data }).json();
  },

  async remove(id: number): Promise<void> {
    await api.delete(`grupos/${id}`);
  },

  async siguienteCodigo(): Promise<string | null> {
    try {
      const res = await api.get('grupos/siguiente-codigo').json<{ codigo: string | null }>();
      return res.codigo;
    } catch {
      return null;
    }
  },

  async crearPasajero(grupoId: number, data: PasajeroInput): Promise<Pasajero> {
    return api.post(`grupos/${grupoId}/pasajeros`, { json: data }).json();
  },

  async eliminarPasajero(grupoId: number, pasajeroId: number): Promise<void> {
    await api.delete(`grupos/${grupoId}/pasajeros/${pasajeroId}`);
  }
};
