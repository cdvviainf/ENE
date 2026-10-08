import { api } from '@/lib/api';
import type {
  TipoDocumento,
  TipoDocumentoListResponse,
  TipoDocumentoCreateInput,
  TipoDocumentoUpdateInput
} from './types';

export const tiposDocumentoService = {
  async list(params: { page?: number; limit?: number; q?: string } = {}): Promise<TipoDocumentoListResponse> {
    const searchParams: Record<string, string> = {};
    if (params.page) searchParams.page = String(params.page);
    if (params.limit) searchParams.limit = String(params.limit);
    if (params.q) searchParams.q = params.q;
    return api.get('config/tipos-documento', { searchParams }).json();
  },

  async getById(id: number): Promise<TipoDocumento> {
    return api.get(`config/tipos-documento/${id}`).json();
  },

  async create(data: TipoDocumentoCreateInput): Promise<TipoDocumento> {
    return api.post('config/tipos-documento', { json: data }).json();
  },

  async update(id: number, data: TipoDocumentoUpdateInput): Promise<TipoDocumento> {
    return api.patch(`config/tipos-documento/${id}`, { json: data }).json();
  },

  async remove(id: number): Promise<void> {
    await api.delete(`config/tipos-documento/${id}`);
  }
};
