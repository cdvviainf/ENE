'use client';

import { useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { usePuedeEscribir } from '@/hooks/use-item-acceso';
import { formatFechaCorta } from '@/lib/format';
import { adjuntosService, descargarAdjuntoUrl } from '../service';
import { ordenTrabajoAdjuntosOptions, ordenesTrabajoKeys } from '../queries';

// Tamaño legible desde bytes (sin pretensión de precisión monetaria: es solo UI).
function formatTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AdjuntosPanel({ ordenId }: { ordenId: number }) {
  const queryClient = useQueryClient();
  const puedeEscribir = usePuedeEscribir('ORDENES_TRABAJO');
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: adjuntos, isPending } = useQuery(ordenTrabajoAdjuntosOptions(ordenId));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ordenesTrabajoKeys.adjuntos(ordenId) });

  const subir = useMutation({
    mutationFn: (archivo: File) => adjuntosService.subir(ordenId, archivo),
    onSuccess: () => {
      toast.success('Adjunto subido');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || 'No se pudo subir el adjunto')
  });

  const eliminar = useMutation({
    mutationFn: (id: number) => adjuntosService.eliminar(id),
    onSuccess: () => {
      toast.success('Adjunto eliminado');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || 'No se pudo eliminar el adjunto')
  });

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) subir.mutate(file);
    // Permite volver a elegir el mismo archivo tras un error.
    e.target.value = '';
  }

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between'>
        <CardTitle className='text-base'>Adjuntos</CardTitle>
        {puedeEscribir && (
          <>
            <input ref={inputRef} type='file' className='hidden' onChange={onPick} />
            <Button size='sm' variant='outline' onClick={() => inputRef.current?.click()} isLoading={subir.isPending}>
              <Icons.upload className='mr-2 h-4 w-4' />
              Subir archivo
            </Button>
          </>
        )}
      </CardHeader>
      <CardContent>
        {isPending ? (
          <p className='text-muted-foreground text-sm'>Cargando…</p>
        ) : (adjuntos ?? []).length === 0 ? (
          <p className='text-muted-foreground text-sm'>Sin adjuntos.</p>
        ) : (
          <ul className='space-y-2'>
            {(adjuntos ?? []).map((a) => (
              <li key={a.id} className='flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm'>
                <span className='flex min-w-0 items-center gap-2'>
                  <Icons.paperclip className='text-muted-foreground h-4 w-4 shrink-0' />
                  <span className='truncate'>{a.nombreArchivo}</span>
                  <span className='text-muted-foreground shrink-0 text-xs'>
                    · {formatTamano(a.tamanoBytes)} · {formatFechaCorta(a.creadoEn)}
                  </span>
                </span>
                <span className='flex shrink-0 items-center gap-1'>
                  <Button variant='ghost' size='icon' className='h-7 w-7' title='Descargar' asChild>
                    <a href={descargarAdjuntoUrl(a.id)} download>
                      <Icons.download className='h-4 w-4' />
                    </a>
                  </Button>
                  {puedeEscribir && (
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-7 w-7'
                      title='Eliminar'
                      onClick={() => eliminar.mutate(a.id)}
                      disabled={eliminar.isPending}
                    >
                      <Icons.trash className='h-4 w-4' />
                    </Button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
