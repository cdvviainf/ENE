import { formatMonto } from '@/lib/dinero';
import { fraccionAPorcentaje } from '@/lib/porcentaje';
import { IMPUESTO_LABELS, type ImpuestoLinea, type TotalesImpuesto } from '@/lib/impuestos';

type Moneda = 'CLP' | 'USD';

/** Detalle referencial de una línea: "IVA 19% · 19.000 · paga 119.000" (RN-IMP-02). */
export function ImpuestoLineaInfo({ impuesto, moneda }: { impuesto?: ImpuestoLinea | null; moneda: Moneda }) {
  if (!impuesto) return null;
  const signo = impuesto.tipo === 'RETENCION' ? '−' : '+';
  return (
    <span
      className='text-xs text-amber-700 dark:text-amber-400'
      title='Referencial e interno (RN-PRV-11): no cambia el presupuesto ni sale en el PDF.'
    >
      · {IMPUESTO_LABELS[impuesto.tipo]} {fraccionAPorcentaje(impuesto.tasa)}% {signo}
      {formatMonto(impuesto.monto, moneda)} · se paga {formatMonto(impuesto.totalProveedor, moneda)}
    </span>
  );
}

/** Totales referenciales de IVA y retención de la versión vigente. */
export function ImpuestosTotales({ impuestos, moneda }: { impuestos?: TotalesImpuesto | null; moneda: Moneda }) {
  if (!impuestos) return null;
  const hayIva = !/^0(\.0+)?$/.test(impuestos.iva);
  const hayRet = !/^0(\.0+)?$/.test(impuestos.retencion);
  if (!hayIva && !hayRet) return null;
  return (
    <div className='text-muted-foreground space-y-0.5 text-xs'>
      <p className='font-medium'>Impuestos referenciales (no incluidos en el presupuesto ni en el PDF)</p>
      {hayIva && <p>IVA sobre costos: {formatMonto(impuestos.iva, moneda)}</p>}
      {hayRet && <p>Retención boletas de honorarios: {formatMonto(impuestos.retencion, moneda)}</p>}
    </div>
  );
}
