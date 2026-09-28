'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { formatMonto } from '@/lib/dinero';
import { cotizacionesService } from '../service';
import { cotizacionesKeys } from '../queries';
import type { Moneda, RecalcularPaxResponse } from '../types';

// RN-COS-07: preview del recálculo por nueva cantidad de pasajeros y aplicarlo
// de forma transaccional. 'borrador' escribe directo; 'version' (tras el envío)
// crea una versión nueva con motivo obligatorio.
export function RecalcularPaxDialog({
  cotizacionId,
  moneda,
  modo,
  bloqueado
}: {
  cotizacionId: number;
  moneda: Moneda;
  modo: 'borrador' | 'version';
  // Hay cambios del itinerario sin guardar: aplicar un recálculo ahora dejaría
  // ids obsoletos (RN-COS-06). Se bloquea hasta guardar/descartar.
  bloqueado: boolean;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [pax, setPax] = useState('');
  const [motivo, setMotivo] = useState('');
  const [paxCalculado, setPaxCalculado] = useState<number | null>(null);
  const [preview, setPreview] = useState<RecalcularPaxResponse | null>(null);

  const mutation = useMutation({
    mutationFn: (n: number) => cotizacionesService.recalcularPax(cotizacionId, n),
    onSuccess: (data, n) => {
      setPreview(data);
      setPaxCalculado(n);
    },
    onError: (e: Error) => toast.error(e.message || 'No se pudo recalcular')
  });

  const aplicar = useMutation({
    mutationFn: (n: number) => cotizacionesService.aplicarPax(cotizacionId, n, modo === 'version' ? motivo.trim() : undefined),
    onSuccess: () => {
      toast.success(modo === 'version' ? 'Nueva versión con la cantidad actualizada' : 'Cantidad de pasajeros y líneas actualizadas');
      queryClient.invalidateQueries({ queryKey: cotizacionesKeys.detail(cotizacionId) });
      queryClient.invalidateQueries({ queryKey: cotizacionesKeys.versiones(cotizacionId) });
      setOpen(false);
      setPreview(null);
      setMotivo('');
    },
    onError: (e: Error) => toast.error(e.message || 'No se pudo aplicar el recálculo')
  });

  function aplicarPax(n: number) {
    if (modo === 'version' && !motivo.trim()) return toast.error('El motivo es obligatorio (RN-VER-06)');
    aplicar.mutate(n);
  }

  function calcular() {
    const n = Number.parseInt(pax, 10);
    if (!Number.isFinite(n) || n < 1) return toast.error('Cantidad de pasajeros inválida');
    mutation.mutate(n);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setPreview(null);
      }}
    >
      <DialogTrigger asChild>
        <Button variant='outline' size='sm'>
          <Icons.arrowRight className='mr-2 h-4 w-4' />
          Recalcular por pax
        </Button>
      </DialogTrigger>
      <DialogContent className='max-w-lg'>
        <DialogHeader>
          <DialogTitle>Recalcular por cantidad de pasajeros</DialogTitle>
        </DialogHeader>
        {bloqueado && (
          <p className='text-destructive text-sm'>
            Guarda o descarta los cambios del itinerario antes de recalcular por pasajeros.
          </p>
        )}
        <div className='flex items-end gap-2'>
          <div className='space-y-1.5'>
            <Label>Nueva cantidad de pasajeros</Label>
            <Input type='number' min={1} value={pax} onChange={(e) => setPax(e.target.value)} className='w-40' />
          </div>
          <Button onClick={calcular} isLoading={mutation.isPending} disabled={bloqueado}>
            Calcular
          </Button>
        </div>

        {preview && (
          <div className='space-y-3'>
            <p className='text-muted-foreground text-xs'>
              {modo === 'borrador'
                ? 'Vista previa: el salto por tramo no es proporcional. Aplica para actualizar la cotización.'
                : 'Vista previa. Aplicar crea una versión nueva con esta cantidad de pasajeros.'}
            </p>
            {modo === 'version' && (
              <div className='space-y-1.5'>
                <Label>Motivo (obligatorio)</Label>
                <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder='Ej: el cliente cambió el grupo a 3 pax' />
              </div>
            )}
            <ul className='max-h-64 space-y-1 overflow-auto'>
              {preview.lineas.map((l, i) => (
                <li key={i} className='flex items-center justify-between gap-2 text-sm'>
                  <span className='flex items-center gap-2'>
                    {l.advertenciaVigencia && <Badge variant='destructive'>vigencia</Badge>}
                    <span>{l.descripcion}</span>
                    <span className='text-muted-foreground text-xs'>· {l.cantidadPax} pax</span>
                  </span>
                  <span className='font-medium'>{formatMonto(l.ventaTotal, moneda)}</span>
                </li>
              ))}
            </ul>
            <div className='flex items-center justify-between border-t pt-2 text-sm font-semibold'>
              <span>Total venta</span>
              <span>{formatMonto(preview.totales.ventaTotal, moneda)}</span>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant='outline' onClick={() => setOpen(false)}>
            Cerrar
          </Button>
          {preview && paxCalculado != null && (
            <Button onClick={() => aplicarPax(paxCalculado)} isLoading={aplicar.isPending} disabled={bloqueado}>
              <Icons.check className='mr-2 h-4 w-4' />
              {modo === 'version' ? `Aplicar ${paxCalculado} pax en nueva versión` : `Aplicar ${paxCalculado} pax`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
