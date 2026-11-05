'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/icons';
import { usePuedeEscribir } from '@/hooks/use-item-acceso';
import { fraccionAPorcentaje, porcentajeAFraccion } from '@/lib/porcentaje';
import { indicadoresDetailOptions, indicadoresKeys } from '../queries';
import { indicadoresService } from '../service';

// Porcentaje en [0, 100) con hasta 2 decimales (la columna es Decimal(7,4) en
// fracción: 19.75% → 0.1975). Se valida como string, sin pasar por number.
const PCT_RE = /^\d{1,2}(\.\d{1,2})?$/;

export function IndicadoresForm() {
  const queryClient = useQueryClient();
  const puedeEscribir = usePuedeEscribir('CONFIGURACION_GENERAL');
  const { data: indicadores, isLoading } = useQuery(indicadoresDetailOptions());

  const [iva, setIva] = useState('');
  const [retencion, setRetencion] = useState('');
  const [errores, setErrores] = useState<{ iva?: string; retencion?: string }>({});

  // Re-siembra el estado local cuando llega (o cambia) el dato del servidor —
  // patrón de ajuste en render, sin useEffect.
  const firma = indicadores ? `${indicadores.tasaIva}|${indicadores.tasaRetencion}` : '';
  const [firmaSembrada, setFirmaSembrada] = useState('');
  if (indicadores && firma !== firmaSembrada) {
    setFirmaSembrada(firma);
    setIva(fraccionAPorcentaje(indicadores.tasaIva));
    setRetencion(fraccionAPorcentaje(indicadores.tasaRetencion));
  }

  const mutation = useMutation({
    mutationFn: () =>
      indicadoresService.update({
        tasaIva: porcentajeAFraccion(iva),
        tasaRetencion: porcentajeAFraccion(retencion)
      }),
    onSuccess: () => {
      toast.success('Indicadores guardados correctamente');
      queryClient.invalidateQueries({ queryKey: indicadoresKeys.all });
      // El desglose referencial de cotizaciones y OT se recalcula con las tasas nuevas.
      queryClient.invalidateQueries({ queryKey: ['cotizaciones'] });
      queryClient.invalidateQueries({ queryKey: ['ordenes-trabajo'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Error al guardar los indicadores')
  });

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    const nuevos: typeof errores = {};
    if (!PCT_RE.test(iva.trim())) nuevos.iva = 'Ingresa un porcentaje entre 0 y 99,99 (ej. 19)';
    if (!PCT_RE.test(retencion.trim())) nuevos.retencion = 'Ingresa un porcentaje entre 0 y 99,99 (ej. 14.75)';
    setErrores(nuevos);
    if (nuevos.iva || nuevos.retencion) return;
    mutation.mutate();
  }

  if (isLoading) {
    return (
      <div className='space-y-4'>
        <div className='bg-muted h-10 animate-pulse rounded' />
        <div className='bg-muted h-10 animate-pulse rounded' />
      </div>
    );
  }

  return (
    <form onSubmit={guardar} className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Tasas tributarias</CardTitle>
          <CardDescription>
            Se usan solo para el desglose referencial de IVA y retención en cotizaciones y OT. No cambian el
            presupuesto ni aparecen en el PDF al cliente.
          </CardDescription>
        </CardHeader>
        <CardContent className='grid gap-4 sm:grid-cols-2'>
          <div className='space-y-1.5'>
            <Label htmlFor='tasa-iva'>IVA</Label>
            <div className='relative'>
              <Input
                id='tasa-iva'
                value={iva}
                onChange={(e) => setIva(e.target.value.replace(/[^\d.]/g, ''))}
                disabled={!puedeEscribir}
                inputMode='decimal'
                className='pr-6'
              />
              <span className='text-muted-foreground pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-sm'>
                %
              </span>
            </div>
            <p className='text-muted-foreground text-xs'>Se suma al costo neto cuando el proveedor emite factura afecta.</p>
            {errores.iva && <p className='text-destructive text-sm'>{errores.iva}</p>}
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='tasa-retencion'>Retención boleta de honorarios</Label>
            <div className='relative'>
              <Input
                id='tasa-retencion'
                value={retencion}
                onChange={(e) => setRetencion(e.target.value.replace(/[^\d.]/g, ''))}
                disabled={!puedeEscribir}
                inputMode='decimal'
                className='pr-6'
              />
              <span className='text-muted-foreground pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-sm'>
                %
              </span>
            </div>
            <p className='text-muted-foreground text-xs'>Se descuenta del costo bruto cuando el proveedor emite boleta.</p>
            {errores.retencion && <p className='text-destructive text-sm'>{errores.retencion}</p>}
          </div>
        </CardContent>
      </Card>

      {puedeEscribir ? (
        <div className='flex justify-end'>
          <Button type='submit' isLoading={mutation.isPending}>
            <Icons.check className='mr-2 h-4 w-4' />
            Guardar
          </Button>
        </div>
      ) : (
        <p className='text-muted-foreground text-sm'>Tu perfil solo tiene acceso de lectura a Configuración general.</p>
      )}
    </form>
  );
}
