import { api } from '@/lib/api';
import type {
  CondicionPago,
  CondicionPagoListResponse,
  CondicionPagoCreateInput,
  CondicionPagoUpdateInput
} from './types';

export const condicionesPagoService = {
  async list(params: { page?: number; limit?: number; q?: string } = {}): Promise<CondicionPagoListResponse> {
    const searchParams: Record<string, string> = {};
    if (params.page) searchParams.page = String(params.page);
    if (params.limit) searchParams.limit = String(params.limit);
    if (params.q) searchParams.q = params.q;
    return api.get('config/condiciones-pago', { searchParams }).json();
  },

  async getById(id: number): Promise<CondicionPago> {
    return api.get(`config/condiciones-pago/${id}`).json();
  },

  async create(data: CondicionPagoCreateInput): Promise<CondicionPago> {
    return api.post('config/condiciones-pago', { json: data }).json();
  },

  async update(id: number, data: CondicionPagoUpdateInput): Promise<CondicionPago> {
    return api.patch(`config/condiciones-pago/${id}`, { json: data }).json();
  },

  async remove(id: number): Promise<void> {
    await api.delete(`config/condiciones-pago/${id}`);
  }
};
