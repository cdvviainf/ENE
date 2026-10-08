export interface FormaPago {
  id: number;
  codigo: string;
  nombre: string;
  // Fracción 0..1 (0.03 = 3%). Recargo que suma esta forma de pago.
  porcentajeAdicional: number;
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
  porcentajeAdicional?: number;
}

export type FormaPagoUpdateInput = Partial<FormaPagoCreateInput>;
