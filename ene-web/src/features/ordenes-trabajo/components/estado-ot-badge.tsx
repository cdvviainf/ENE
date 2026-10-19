import { Badge } from '@/components/ui/badge';
import { ESTADO_OT_LABELS, type EstadoOT } from '../types';

const VARIANT: Record<EstadoOT, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  CONFIRMADA: 'default',
  EN_ESPERA: 'secondary',
  EN_PREPARACION: 'secondary',
  EN_OPERACION: 'secondary',
  EJECUTADA: 'default',
  CERRADA: 'outline',
  CANCELADA: 'destructive',
  NO_SHOW: 'destructive'
};

export function EstadoOtBadge({ estado }: { estado: EstadoOT }) {
  return <Badge variant={VARIANT[estado]}>{ESTADO_OT_LABELS[estado]}</Badge>;
}
