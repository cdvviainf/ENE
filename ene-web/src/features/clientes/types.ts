export type TipoCliente = 'AGENCIA' | 'EMPRESA';
export type Moneda = 'CLP' | 'USD';

export interface ClienteEjecutivo {
  id: number;
  clienteId: number;
  nombre: string;
  email: string | null;
  telefono: string | null;
  cargo: string | null;
  descripcion: string | null;
  esRepresentanteLegal: boolean;
  activo: boolean;
  creadoEn: string;
}

export interface ClienteDireccion {
  id: number;
  clienteId: number;
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

export interface Cliente {
  id: number;
  codigo: string;
  tipo: TipoCliente;
  razonSocial: string;
  rut: string | null;
  nombreComercial: string | null;
  paisId: number;
  pais?: { id: number; codigo: string; nombre: string };
  monedaHabitual: Moneda;
  formaPagoId: number | null;
  condicionPagoId: number | null;
  email: string | null;
  telefono: string | null;
  creadoEn: string;
  actualizadoEn: string | null;
  ejecutivos?: ClienteEjecutivo[];
  direcciones?: ClienteDireccion[];
  _count?: { ordenes: number; ejecutivos: number };
  // RN-CLI-02: solo viene en GET /:id, no en el listado.
  tieneOperaciones?: boolean;
}

export interface ClienteListResponse {
  data: Cliente[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface EjecutivoInput {
  nombre: string;
  email?: string;
  telefono?: string;
  cargo?: string;
  descripcion?: string;
  esRepresentanteLegal?: boolean;
  activo?: boolean;
}

export interface ClienteCreateInput {
  codigo: string;
  tipo: TipoCliente;
  razonSocial: string;
  rut?: string;
  nombreComercial?: string;
  paisId: number;
  monedaHabitual?: Moneda;
  formaPagoId?: number;
  condicionPagoId?: number;
  email?: string;
  telefono?: string;
  ejecutivos?: EjecutivoInput[];
}

export type ClienteUpdateInput = Partial<Omit<ClienteCreateInput, 'codigo' | 'ejecutivos'>>;
