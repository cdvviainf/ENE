import { api } from '@/lib/api';
import type {
  EstadoTarifaVenta,
  ServiciosConTarifaResponse,
  TarifaVenta,
  TarifaVentaCambioInput,
  TarifaVentaCreateInput
} from './types';

export interface ServiciosConTarifaFiltros {
  page?: number;
  limit?: number;
  q?: string;
  estado?: EstadoTarifaVenta;
}

export const tarifasVentaService = {
  async listServicios(params: ServiciosConTarifaFiltros = {}): Promise<ServiciosConTarifaResponse> {
    const searchParams: Record<string, string> = {};
    if (params.page) searchParams.page = String(params.page);
    if (params.limit) searchParams.limit = String(params.limit);
    if (params.q) searchParams.q = params.q;
    if (params.estado) searchParams.estado = params.estado;
    return api.get('tarifas-venta/servicios', { searchParams }).json();
  },

  async listDeServicio(servicioId: number): Promise<TarifaVenta[]> {
    return api.get('tarifas-venta', { searchParams: { servicioId: String(servicioId) } }).json();
  },

  async getById(id: number): Promise<TarifaVenta> {
    return api.get(`tarifas-venta/${id}`).json();
  },

  async create(data: TarifaVentaCreateInput): Promise<TarifaVenta> {
    return api.post('tarifas-venta', { json: data }).json();
  },

  async nuevaVersion(id: number, data: TarifaVentaCambioInput): Promise<TarifaVenta> {
    return api.post(`tarifas-venta/${id}/nueva-version`, { json: data }).json();
  },

  async update(id: number, data: TarifaVentaCambioInput): Promise<TarifaVenta> {
    return api.patch(`tarifas-venta/${id}`, { json: data }).json();
  }
};
