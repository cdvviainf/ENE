'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { usePuedeEscribir } from '@/hooks/use-item-acceso';
import { ordenesTrabajoService } from '../service';
import { ordenesTrabajoKeys } from '../queries';
import { ESTADO_OT_LABELS, TRANSICIONES_OT, type EstadoOT } from '../types';

// RN-OT-04: solo se ofrecen las transiciones válidas desde el estado actual
// (espejo del backend). El cambio de estado requiere nivel TOTAL.
export function EstadoOtActions({ ordenId, estado }: { ordenId: number; estado: EstadoOT }) {
  const queryClient = useQueryClient();
  const puedeEscribir = usePuedeEscribir('ORDENES_TRABAJO');

  const estadoMutation = useMutation({
    mutationFn: (nuevo: EstadoOT) => ordenesTrabajoService.cambiarEstado(ordenId, nuevo),
    onSuccess: (ot) => {
      toast.success(`Estado cambiado a ${ESTADO_OT_LABELS[ot.estado]}`);
      queryClient.invalidateQueries({ queryKey: ordenesTrabajoKeys.detail(ordenId) });
      queryClient.invalidateQueries({ queryKey: ordenesTrabajoKeys.all });
    },
    onError: (e: Error) => toast.error(e.message || 'No se pudo cambiar el estado')
  });

  if (!puedeEscribir) return null;

  const salidas = TRANSICIONES_OT[estado];
  if (salidas.length === 0) return null;

  return (
    <div className='flex flex-wrap items-center gap-2'>
      {salidas.map((s) => (
        <Button
          key={s}
          size='sm'
          variant={s === 'CANCELADA' || s === 'NO_SHOW' ? 'outline' : 'default'}
          onClick={() => estadoMutation.mutate(s)}
          disabled={estadoMutation.isPending}
        >
          {ESTADO_OT_LABELS[s]}
        </Button>
      ))}
    </div>
  );
}
