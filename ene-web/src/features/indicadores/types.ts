// RN-IMP-01: tasas tributarias globales (singleton). Viajan como FRACCIÓN en
// string decimal ('0.1900' = 19%), nunca number (RN-DIN-01).
export interface Indicadores {
  id: number;
  tasaIva: string;
  tasaRetencion: string;
  actualizadoEn: string | null;
  actualizadoPor: string | null;
}

export interface IndicadoresUpdateInput {
  tasaIva: string;
  tasaRetencion: string;
}
