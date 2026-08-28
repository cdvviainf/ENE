import { api } from '@/lib/api';
import type {
  Cliente,
  ClienteListResponse,
  ClienteCreateInput,
  ClienteUpdateInput,
  ClienteEjecutivo,
  EjecutivoInput
} from './types';

export const clientesService = {
  async list(
    params: { page?: number; limit?: number; q?: string; tipo?: string; pais?: string; monedaHabitual?: string } = {}
  ): Promise<ClienteListResponse> {
    const searchParams: Record<string, string> = {};
    if (params.page) searchParams.page = String(params.page);
    if (params.limit) searchParams.limit = String(params.limit);
    if (params.q) searchParams.q = params.q;
    if (params.tipo) searchParams.tipo = params.tipo;
    if (params.pais) searchParams.pais = params.pais;
    if (params.monedaHabitual) searchParams.monedaHabitual = params.monedaHabitual;
    return api.get('clientes', { searchParams }).json();
  },

  async getById(id: number): Promise<Cliente> {
    return api.get(`clientes/${id}`).json();
  },

  async create(data: ClienteCreateInput): Promise<Cliente> {
    return api.post('clientes', { json: data }).json();
  },

  async update(id: number, data: ClienteUpdateInput): Promise<Cliente> {
    return api.patch(`clientes/${id}`, { json: data }).json();
  },

  async remove(id: number): Promise<void> {
    await api.delete(`clientes/${id}`);
  },

  async siguienteCodigo(): Promise<string | null> {
    try {
      const res = await api.get('clientes/siguiente-codigo').json<{ codigo: string | null }>();
      return res.codigo;
    } catch {
      return null;
    }
  },

  async crearEjecutivo(clienteId: number, data: EjecutivoInput): Promise<ClienteEjecutivo> {
    return api.post(`clientes/${clienteId}/ejecutivos`, { json: data }).json();
  },

  async actualizarEjecutivo(clienteId: number, ejecutivoId: number, data: Partial<EjecutivoInput>): Promise<ClienteEjecutivo> {
    return api.patch(`clientes/${clienteId}/ejecutivos/${ejecutivoId}`, { json: data }).json();
  },

  async eliminarEjecutivo(clienteId: number, ejecutivoId: number): Promise<void> {
    await api.delete(`clientes/${clienteId}/ejecutivos/${ejecutivoId}`);
  }
};
