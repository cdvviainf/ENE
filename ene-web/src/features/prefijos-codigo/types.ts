export interface PrefijoCodigo {
  id: number;
  entidad: string;
  prefijo: string;
  digitos: number;
  incluyeAnio: boolean;
  ultimoValor: number;
  anio: number | null;
}

export interface PrefijoCodigoUpdateInput {
  prefijo?: string;
  digitos?: number;
  incluyeAnio?: boolean;
}

// Entidades con sugerencia de código en vivo (RN-PER-07) — deben calzar con
// ENTIDADES_SUGERENCIA_VIVA en ene-api/prefijos-codigo.schema.ts.
export type EntidadSugerenciaViva = 'PERFIL' | 'USUARIO';
