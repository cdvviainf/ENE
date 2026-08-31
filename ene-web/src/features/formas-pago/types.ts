export interface FormaPago {
  id: number;
  codigo: string;
  nombre: string;
  creadoEn: string;
  actualizadoEn: string | null;
}

export interface FormaPagoListResponse {
  data: FormaPago[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface FormaPagoCreateInput {
  codigo: string;
  nombre: string;
}

export type FormaPagoUpdateInput = Partial<FormaPagoCreateInput>;
