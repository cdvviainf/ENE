export type TipoCliente = 'AGENCIA' | 'EMPRESA';
export type Moneda = 'CLP' | 'USD';

export interface ClienteEjecutivo {
  id: number;
  clienteId: number;
  nombre: string;
  email: string | null;
  telefono: string | null;
  cargo: string | null;
  activo: boolean;
  creadoEn: string;
}

export interface Cliente {
  id: number;
  codigo: string;
  tipo: TipoCliente;
  razonSocial: string;
  rut: string | null;
  nombreComercial: string | null;
  pais: string;
  monedaHabitual: Moneda;
  condicionesPago: string | null;
  email: string | null;
  telefono: string | null;
  creadoEn: string;
  actualizadoEn: string | null;
  ejecutivos?: ClienteEjecutivo[];
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
  activo?: boolean;
}

export interface ClienteCreateInput {
  codigo: string;
  tipo: TipoCliente;
  razonSocial: string;
  rut?: string;
  nombreComercial?: string;
  pais: string;
  monedaHabitual?: Moneda;
  condicionesPago?: string;
  email?: string;
  telefono?: string;
  ejecutivos?: EjecutivoInput[];
}

export type ClienteUpdateInput = Partial<Omit<ClienteCreateInput, 'codigo' | 'ejecutivos'>>;
