import { api } from '@/lib/api';
import type {
  Tarifario,
  TarifarioListResponse,
  TarifarioCreateInput,
  TarifarioNuevaVersionInput,
  TarifarioUpdateInput,
  TarifarioConAdvertencias
} from './types';

export const tarifasService = {
  async list(
    params: { page?: number; limit?: number; proveedorId?: number; servicioId?: number; vigenteA?: string; soloActivos?: boolean } = {}
  ): Promise<TarifarioListResponse> {
    const searchParams: Record<string, string> = {};
    if (params.page) searchParams.page = String(params.page);
    if (params.limit) searchParams.limit = String(params.limit);
    if (params.proveedorId) searchParams.proveedorId = String(params.proveedorId);
    if (params.servicioId) searchParams.servicioId = String(params.servicioId);
    if (params.vigenteA) searchParams.vigenteA = params.vigenteA;
    if (params.soloActivos) searchParams.soloActivos = 'true';
    return api.get('tarifas', { searchParams }).json();
  },

  async getById(id: number): Promise<Tarifario> {
    return api.get(`tarifas/${id}`).json();
  },

  async create(data: TarifarioCreateInput): Promise<TarifarioConAdvertencias> {
    return api.post('tarifas', { json: data }).json();
  },

  async nuevaVersion(id: number, data: TarifarioNuevaVersionInput): Promise<TarifarioConAdvertencias> {
    return api.post(`tarifas/${id}/nueva-version`, { json: data }).json();
  },

  // Edición in-place del tarifario vigente (decisión oct-2026). La tarifa queda
  // congelada en cada cotización (snapshot), así que editar no retroacta; una
  // cotización en BORRADOR puede refrescarse con "recalcular costo".
  async update(id: number, data: TarifarioUpdateInput): Promise<TarifarioConAdvertencias> {
    return api.patch(`tarifas/${id}`, { json: data }).json();
  }
};
