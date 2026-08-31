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
  descripcion: string | null;
  esRepresentanteLegal: boolean;
  esEjecutivo: boolean;
}

export interface ProveedorZona {
  zonaId: number;
  zona: { id: number; codigo: string; nombre: string };
}

export interface ProveedorTipoServicioRel {
  tipoServicioId: number;
  tipoServicio: { id: number; codigo: string; nombre: string };
}

export interface ProveedorDireccion {
  id: number;
  proveedorId: number;
  etiqueta: string;
  descripcion: string | null;
  paisId: number;
  comunaId: number | null;
  direccion: string;
  esPorDefecto: boolean;
  creadoEn: string;
  pais?: { id: number; codigo: string; nombre: string; esPaisNacional: boolean };
  comuna?: { id: number; codigo: string; nombre: string } | null;
}

export interface DireccionInput {
  etiqueta: string;
  descripcion?: string;
  paisId: number;
  comunaId?: number;
  direccion: string;
  esPorDefecto?: boolean;
}

export interface Proveedor {
  id: number;
  codigo: string;
  razonSocial: string;
  rut: string;
  nombreComercial: string | null;
  formaPagoId: number | null;
  condicionPagoId: number | null;
  politicaCancelacion: string | null;
  email: string | null;
  telefono: string | null;
  creadoEn: string;
  actualizadoEn: string | null;
  tiposServicio?: ProveedorTipoServicioRel[];
  zonas?: ProveedorZona[];
  alias?: ProveedorAlias[];
  cuentas?: ProveedorCuenta[];
  contactos?: ProveedorContacto[];
  direcciones?: ProveedorDireccion[];
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
  descripcion?: string;
  esRepresentanteLegal?: boolean;
  esEjecutivo?: boolean;
}

export interface ProveedorCreateInput {
  codigo: string;
  razonSocial: string;
  rut: string;
  nombreComercial?: string;
  tiposServicio: number[];
  zonas?: number[];
  formaPagoId?: number;
  condicionPagoId?: number;
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
