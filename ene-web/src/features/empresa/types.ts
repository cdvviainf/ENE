export interface Empresa {
  id: number;
  nombre: string;
  rut: string | null;
  direccion: string | null;
  email: string | null;
  web: string | null;
  telefono: string | null;
  // RN-EMP-01: metadatos del logo (guardado en la BD); el binario se pide aparte.
  logo: { mime: string; subidoEn: string; subidoPor: string } | null;
}

export interface EmpresaUpdateInput {
  nombre: string;
  rut?: string | null;
  direccion?: string | null;
  email?: string | null;
  web?: string | null;
  telefono?: string | null;
}
