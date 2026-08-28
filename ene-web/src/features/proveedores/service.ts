import { api } from '@/lib/api';
import type {
  Proveedor,
  ProveedorListResponse,
  ProveedorCreateInput,
  ProveedorUpdateInput,
  AliasInput,
  ProveedorAlias,
  CuentaInput,
  ProveedorCuenta,
  ContactoInput,
  ProveedorContacto
} from './types';

export const proveedoresService = {
  async list(
    params: { page?: number; limit?: number; q?: string; tipoServicioId?: number; zonaId?: number } = {}
  ): Promise<ProveedorListResponse> {
    const searchParams: Record<string, string> = {};
    if (params.page) searchParams.page = String(params.page);
    if (params.limit) searchParams.limit = String(params.limit);
    if (params.q) searchParams.q = params.q;
    if (params.tipoServicioId) searchParams.tipoServicioId = String(params.tipoServicioId);
    if (params.zonaId) searchParams.zonaId = String(params.zonaId);
    return api.get('proveedores', { searchParams }).json();
  },

  async getById(id: number): Promise<Proveedor> {
    return api.get(`proveedores/${id}`).json();
  },

  async create(data: ProveedorCreateInput): Promise<Proveedor> {
    return api.post('proveedores', { json: data }).json();
  },

  async update(id: number, data: ProveedorUpdateInput): Promise<Proveedor> {
    return api.patch(`proveedores/${id}`, { json: data }).json();
  },

  async remove(id: number): Promise<void> {
    await api.delete(`proveedores/${id}`);
  },

  async siguienteCodigo(): Promise<string | null> {
    try {
      const res = await api.get('proveedores/siguiente-codigo').json<{ codigo: string | null }>();
      return res.codigo;
    } catch {
      return null;
    }
  },

  async crearAlias(proveedorId: number, data: AliasInput): Promise<ProveedorAlias> {
    return api.post(`proveedores/${proveedorId}/alias`, { json: data }).json();
  },
  async eliminarAlias(proveedorId: number, aliasId: number): Promise<void> {
    await api.delete(`proveedores/${proveedorId}/alias/${aliasId}`);
  },

  async crearCuenta(proveedorId: number, data: CuentaInput): Promise<ProveedorCuenta> {
    return api.post(`proveedores/${proveedorId}/cuentas`, { json: data }).json();
  },
  async actualizarCuenta(proveedorId: number, cuentaId: number, data: Partial<CuentaInput>): Promise<ProveedorCuenta> {
    return api.patch(`proveedores/${proveedorId}/cuentas/${cuentaId}`, { json: data }).json();
  },
  async eliminarCuenta(proveedorId: number, cuentaId: number): Promise<void> {
    await api.delete(`proveedores/${proveedorId}/cuentas/${cuentaId}`);
  },

  async crearContacto(proveedorId: number, data: ContactoInput): Promise<ProveedorContacto> {
    return api.post(`proveedores/${proveedorId}/contactos`, { json: data }).json();
  },
  async actualizarContacto(
    proveedorId: number,
    contactoId: number,
    data: Partial<ContactoInput>
  ): Promise<ProveedorContacto> {
    return api.patch(`proveedores/${proveedorId}/contactos/${contactoId}`, { json: data }).json();
  },
  async eliminarContacto(proveedorId: number, contactoId: number): Promise<void> {
    await api.delete(`proveedores/${proveedorId}/contactos/${contactoId}`);
  }
};
