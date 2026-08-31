export interface CondicionPagoCuota {
  id: number;
  numeroCuota: number;
  porcentaje: string;
  plazoDias: number;
}

export interface CondicionPago {
  id: number;
  codigo: string;
  nombre: string;
  creadoEn: string;
  actualizadoEn: string | null;
  cuotas: CondicionPagoCuota[];
}

export interface CondicionPagoListResponse {
  data: CondicionPago[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

// Input de cuota sin id ni numeroCuota — el backend asigna numeroCuota por
// índice al crear/reemplazar el set completo.
export interface CondicionPagoCuotaInput {
  porcentaje: number;
  plazoDias: number;
}

export interface CondicionPagoCreateInput {
  codigo: string;
  nombre: string;
  cuotas: CondicionPagoCuotaInput[];
}

export type CondicionPagoUpdateInput = Partial<CondicionPagoCreateInput>;
