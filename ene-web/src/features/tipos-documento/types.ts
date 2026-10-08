export type FormaCalculo = 'NINGUNO' | 'IVA' | 'RETENCION';

export const FORMA_CALCULO_LABELS: Record<FormaCalculo, string> = {
  NINGUNO: 'Ninguno',
  IVA: 'IVA',
  RETENCION: 'Retención'
};

export interface TipoDocumento {
  id: number;
  codigo: string;
  nombre: string;
  formaCalculo: FormaCalculo;
  // Fracción 0..1 (0.19 = 19%). El % es solo presentación en la UI.
  porcentaje: number;
}

export interface TipoDocumentoListResponse {
  data: TipoDocumento[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface TipoDocumentoCreateInput {
  codigo: string;
  nombre: string;
  formaCalculo: FormaCalculo;
  porcentaje: number;
}

export type TipoDocumentoUpdateInput = Partial<TipoDocumentoCreateInput>;
