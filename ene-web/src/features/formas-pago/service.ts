import { api } from '@/lib/api';
import type { FormaPago, FormaPagoListResponse, FormaPagoCreateInput, FormaPagoUpdateInput } from './types';

export const formasPagoService = {
  async list(params: { page?: number; limit?: number; q?: string } = {}): Promise<FormaPagoListResponse> {
    const searchParams: Record<string, string> = {};
    if (params.page) searchParams.page = String(params.page);
    if (params.limit) searchParams.limit = String(params.limit);
    if (params.q) searchParams.q = params.q;
    return api.get('config/formas-pago', { searchParams }).json();
  },

  async getById(id: number): Promise<FormaPago> {
    return api.get(`config/formas-pago/${id}`).json();
  },

  async create(data: FormaPagoCreateInput): Promise<FormaPago> {
    return api.post('config/formas-pago', { json: data }).json();
  },

  async update(id: number, data: FormaPagoUpdateInput): Promise<FormaPago> {
    return api.patch(`config/formas-pago/${id}`, { json: data }).json();
  },

  async remove(id: number): Promise<void> {
    await api.delete(`config/formas-pago/${id}`);
  }
};
