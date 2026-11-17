import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ESTADO_TARIFA_VENTA_LABELS, type EstadoTarifaVenta } from '../types';

// RN-TVE-04: Vigente / Programada (aún no empieza) / Vencido / Sin tarifa.
const CLASES: Record<EstadoTarifaVenta, string> = {
  VIGENTE: 'border-transparent bg-emerald-600 text-white dark:bg-emerald-500/80',
  PROGRAMADA: 'border-sky-500 text-sky-700 dark:text-sky-300',
  VENCIDA: 'border-transparent bg-destructive text-white dark:bg-destructive/60',
  SIN_TARIFA: 'border-transparent bg-secondary text-secondary-foreground'
};

export function EstadoTarifaBadge({ estado, className }: { estado: EstadoTarifaVenta; className?: string }) {
  return (
    <Badge variant='outline' className={cn(CLASES[estado], className)}>
      {ESTADO_TARIFA_VENTA_LABELS[estado]}
    </Badge>
  );
}
