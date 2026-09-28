import { Badge } from '@/components/ui/badge';
import { ESTADO_LABELS, type EstadoCotizacion } from '../types';

const VARIANT: Record<EstadoCotizacion, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  BORRADOR: 'outline',
  ENVIADA: 'secondary',
  EN_NEGOCIACION: 'secondary',
  APROBADA: 'default',
  PERDIDA: 'destructive',
  DESISTIDA: 'destructive'
};

export function EstadoBadge({ estado }: { estado: EstadoCotizacion }) {
  return <Badge variant={VARIANT[estado]}>{ESTADO_LABELS[estado]}</Badge>;
}
