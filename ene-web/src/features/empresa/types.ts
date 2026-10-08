export interface Empresa {
  id: number;
  nombre: string;
  rut: string | null;
  direccion: string | null;
  email: string | null;
  web: string | null;
  telefono: string | null;
  logoStorageKey: string | null;
  logoMimeType: string | null;
}

export interface EmpresaUpdateInput {
  nombre: string;
  rut?: string | null;
  direccion?: string | null;
  email?: string | null;
  web?: string | null;
  telefono?: string | null;
}
