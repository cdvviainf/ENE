export interface Usuario {
  id: number;
  codigo: string;
  nombre: string;
  email: string;
  perfilId: number;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string | null;
  perfil: { id: number; codigo: string; nombre: string };
}

export interface UsuarioListResponse {
  data: Usuario[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface UsuarioCreateInput {
  codigo: string;
  nombre: string;
  email: string;
  perfilId: number;
  password: string;
  passwordConfirm: string;
}

export interface UsuarioUpdateInput {
  codigo?: string;
  nombre?: string;
  perfilId?: number;
  activo?: boolean;
}

export interface CambiarPasswordInput {
  password: string;
  passwordConfirm: string;
}
