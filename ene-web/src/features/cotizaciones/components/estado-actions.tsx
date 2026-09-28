'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { usePuedeEscribir } from '@/hooks/use-item-acceso';
import { cotizacionesService } from '../service';
import { cotizacionesKeys } from '../queries';
import { ESTADO_LABELS, type EstadoCotizacion } from '../types';

// Transiciones válidas (RN-COT-01), espejo del backend. APROBADA va por su
// propia acción (valida RN-COT-04).
const TRANSICIONES: Record<EstadoCotizacion, EstadoCotizacion[]> = {
  BORRADOR: ['ENVIADA', 'PERDIDA', 'DESISTIDA'],
  ENVIADA: ['EN_NEGOCIACION', 'PERDIDA', 'DESISTIDA'],
  EN_NEGOCIACION: ['ENVIADA', 'PERDIDA', 'DESISTIDA'],
  APROBADA: [],
  PERDIDA: [],
  DESISTIDA: []
};

const PUEDE_APROBAR: EstadoCotizacion[] = ['ENVIADA', 'EN_NEGOCIACION'];

export function EstadoActions({ cotizacionId, estado }: { cotizacionId: number; estado: EstadoCotizacion }) {
  const queryClient = useQueryClient();
  const puedeEscribir = usePuedeEscribir('COTIZACIONES');

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: cotizacionesKeys.detail(cotizacionId) });
    queryClient.invalidateQueries({ queryKey: cotizacionesKeys.all });
  };

  const estadoMutation = useMutation({
    mutationFn: (nuevo: EstadoCotizacion) => cotizacionesService.cambiarEstado(cotizacionId, nuevo),
    onSuccess: (cot) => {
      toast.success(`Estado cambiado a ${ESTADO_LABELS[cot.estado]}`);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || 'No se pudo cambiar el estado')
  });

  const aprobarMutation = useMutation({
    mutationFn: () => cotizacionesService.aprobar(cotizacionId),
    onSuccess: () => {
      toast.success('Cotización aprobada');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || 'No se pudo aprobar la cotización')
  });

  if (!puedeEscribir) return null;

  const salidas = TRANSICIONES[estado];
  if (salidas.length === 0 && !PUEDE_APROBAR.includes(estado)) return null;

  return (
    <div className='flex flex-wrap items-center gap-2'>
      {PUEDE_APROBAR.includes(estado) && (
        <Button size='sm' onClick={() => aprobarMutation.mutate()} isLoading={aprobarMutation.isPending}>
          <Icons.check className='mr-2 h-4 w-4' />
          Aprobar
        </Button>
      )}
      {salidas.map((s) => (
        <Button
          key={s}
          size='sm'
          variant='outline'
          onClick={() => estadoMutation.mutate(s)}
          disabled={estadoMutation.isPending}
        >
          {s === 'ENVIADA' ? 'Enviar' : ESTADO_LABELS[s]}
        </Button>
      ))}
    </div>
  );
}
