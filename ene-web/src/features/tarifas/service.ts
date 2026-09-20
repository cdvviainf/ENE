import { api } from '@/lib/api';
import type {
  Tarifario,
  TarifarioListResponse,
  TarifarioCreateInput,
  TarifarioNuevaVersionInput,
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

  // Sin update/remove: Tarifario no tiene PATCH/DELETE (RN-TAR-06 — se
  // versiona, no se edita ni se borra).
  async create(data: TarifarioCreateInput): Promise<TarifarioConAdvertencias> {
    return api.post('tarifas', { json: data }).json();
  },

  async nuevaVersion(id: number, data: TarifarioNuevaVersionInput): Promise<TarifarioConAdvertencias> {
    return api.post(`tarifas/${id}/nueva-version`, { json: data }).json();
  }
};
