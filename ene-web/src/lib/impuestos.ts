// RN-PRV-11 / RN-IMP-02: IVA o retención REFERENCIAL de una línea de costo. Lo
// calcula el backend (decimal.js) según el documento del proveedor, la afectación
// del servicio y las tasas de Indicadores. Solo informativo: no cambia costo,
// margen ni venta, y nunca sale en el PDF al cliente.
export type TipoImpuesto = 'IVA' | 'RETENCION';

export interface ImpuestoLinea {
  tipo: TipoImpuesto;
  /** Fracción, ej. '0.1900'. */
  tasa: string;
  monto: string;
  /** Lo que se paga al proveedor: neto + IVA o bruto − retención. */
  totalProveedor: string;
}

export interface TotalesImpuesto {
  iva: string;
  retencion: string;
}

export const IMPUESTO_LABELS: Record<TipoImpuesto, string> = {
  IVA: 'IVA',
  RETENCION: 'Retención'
};
