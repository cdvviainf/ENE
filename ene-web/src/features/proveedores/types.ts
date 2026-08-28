export interface ProveedorAlias {
  id: number;
  alias: string;
}

export interface ProveedorCuenta {
  id: number;
  banco: string;
  tipoCuenta: string | null;
  numeroCuenta: string;
  titular: string | null;
  rutTitular: string | null;
}

export interface ProveedorContacto {
  id: number;
  nombre: string;
  email: string | null;
  telefono: string | null;
  cargo: string | null;
}

export interface ProveedorZona {
  zonaId: number;
  zona: { id: number; codigo: string; nombre: string };
}

export interface Proveedor {
  id: number;
  codigo: string;
  razonSocial: string;
  rut: string;
  nombreComercial: string | null;
  tipoServicioId: number;
  condicionesPago: string | null;
  politicaCancelacion: string | null;
  email: string | null;
  telefono: string | null;
  creadoEn: string;
  actualizadoEn: string | null;
  tipoServicio?: { id: number; codigo: string; nombre: string };
  zonas?: ProveedorZona[];
  alias?: ProveedorAlias[];
  cuentas?: ProveedorCuenta[];
  contactos?: ProveedorContacto[];
}

export interface ProveedorListResponse {
  data: Proveedor[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface AliasInput {
  alias: string;
}

export interface CuentaInput {
  banco: string;
  tipoCuenta?: string;
  numeroCuenta: string;
  titular?: string;
  rutTitular?: string;
}

export interface ContactoInput {
  nombre: string;
  email?: string;
  telefono?: string;
  cargo?: string;
}

export interface ProveedorCreateInput {
  codigo: string;
  razonSocial: string;
  rut: string;
  nombreComercial?: string;
  tipoServicioId: number;
  zonas?: number[];
  condicionesPago?: string;
  politicaCancelacion?: string;
  email?: string;
  telefono?: string;
  alias?: AliasInput[];
  cuentas?: CuentaInput[];
  contactos?: ContactoInput[];
}

export type ProveedorUpdateInput = Partial<
  Omit<ProveedorCreateInput, 'codigo' | 'alias' | 'cuentas' | 'contactos'>
>;
