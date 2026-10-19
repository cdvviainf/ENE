'use client';

import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Icons } from '@/components/icons';
import { usePuedeEscribir } from '@/hooks/use-item-acceso';
import { formatFechaCorta } from '@/lib/format';
import { formatMonto } from '@/lib/dinero';
import { ordenTrabajoDetailOptions, ordenesTrabajoKeys } from '../queries';
import { ordenesTrabajoService } from '../service';
import {
  ACOMODACION_LABELS,
  AREA_LABELS,
  ESTADO_SERVICIO_LABELS,
  type Bloque,
  type EstadoServicio,
  type OrdenTrabajoLinea
} from '../types';
import { EstadoOtBadge } from './estado-ot-badge';
import { EstadoOtActions } from './estado-ot-actions';
import { VersionesOtPanel } from './versiones-ot-panel';
import { AdjuntosPanel } from './adjuntos-panel';
import { NuevaVersionOtDialog } from './nueva-version-ot-dialog';

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <div className='text-muted-foreground text-xs'>{etiqueta}</div>
      <div className='font-medium'>{valor}</div>
    </div>
  );
}

const SERVICIO_VARIANT: Record<EstadoServicio, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  PENDIENTE: 'outline',
  TENTATIVO: 'secondary',
  CONFIRMADO: 'default',
  RECHAZADO: 'destructive',
  CANCELADO: 'destructive'
};

// Estado operativo editable por línea (RN-OT-04). Solo con nivel TOTAL; en caso
// contrario muestra el estado como badge de solo lectura.
function EstadoServicioControl({
  ordenId,
  linea,
  puedeEscribir
}: {
  ordenId: number;
  linea: OrdenTrabajoLinea;
  puedeEscribir: boolean;
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (estadoServicio: EstadoServicio) =>
      ordenesTrabajoService.cambiarEstadoServicio(ordenId, linea.id, estadoServicio),
    onSuccess: () => {
      toast.success('Estado del servicio actualizado');
      queryClient.invalidateQueries({ queryKey: ordenesTrabajoKeys.detail(ordenId) });
    },
    onError: (e: Error) => toast.error(e.message || 'No se pudo actualizar el estado del servicio')
  });

  if (!puedeEscribir) {
    return <Badge variant={SERVICIO_VARIANT[linea.estadoServicio]}>{ESTADO_SERVICIO_LABELS[linea.estadoServicio]}</Badge>;
  }

  return (
    <Select
      value={linea.estadoServicio}
      onValueChange={(v) => mutation.mutate(v as EstadoServicio)}
      disabled={mutation.isPending}
    >
      <SelectTrigger className='h-8 w-[150px]'>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(ESTADO_SERVICIO_LABELS) as EstadoServicio[]).map((e) => (
          <SelectItem key={e} value={e}>
            {ESTADO_SERVICIO_LABELS[e]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function OrdenTrabajoDetail({ ordenId }: { ordenId: number }) {
  const { data: ot, isPending } = useQuery(ordenTrabajoDetailOptions(ordenId));
  const puedeEscribir = usePuedeEscribir('ORDENES_TRABAJO');

  if (isPending) {
    return (
      <div className='space-y-4'>
        <Skeleton className='h-24 w-full' />
        <Skeleton className='h-64 w-full' />
      </div>
    );
  }
  if (!ot) return <p className='text-muted-foreground'>Orden de trabajo no encontrada.</p>;

  const v = ot.versionVigente;
  const lineas = v?.lineas ?? [];
  // Agrupa por día para presentar el itinerario (RN-COT-05).
  const porDia = [...new Set(lineas.map((l) => l.dia))].sort((a, b) => a - b);
  const esTerminal = ot.estado === 'CERRADA' || ot.estado === 'CANCELADA';

  return (
    <div className='space-y-6'>
      <Card>
        <CardContent className='space-y-4 pt-6'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div className='flex items-center gap-3'>
              <h2 className='text-xl font-semibold'>{ot.numero}</h2>
              <EstadoOtBadge estado={ot.estado} />
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              <EstadoOtActions ordenId={ot.id} estado={ot.estado} />
              {puedeEscribir && !esTerminal && v && (
                <NuevaVersionOtDialog
                  ordenId={ot.id}
                  moneda={ot.moneda}
                  lineasVigentes={lineas}
                  trigger={
                    <Button size='sm' variant='outline'>
                      <Icons.add className='mr-2 h-4 w-4' />
                      Nueva versión
                    </Button>
                  }
                />
              )}
            </div>
          </div>

          {/* La OT nace de una cotización aprobada (lenguaje de negocio: "la
              cotización se convirtió en la OT"). */}
          {ot.cotizacion && (
            <div className='text-muted-foreground flex items-center gap-1.5 text-sm'>
              <Icons.arrowRight className='h-4 w-4' />
              <span>Generada desde la cotización</span>
              <Link href={`/cotizaciones/${ot.cotizacion.id}`} className='text-primary font-medium hover:underline'>
                {ot.cotizacion.numero}
              </Link>
            </div>
          )}

          <div className='grid gap-4 sm:grid-cols-3 lg:grid-cols-4'>
            <Dato etiqueta='Apellido (grupo)' valor={ot.apellido} />
            <Dato etiqueta='Cliente' valor={ot.cliente?.razonSocial ?? '—'} />
            <Dato etiqueta='Negocio' valor={ot.negocio?.apellido ?? '—'} />
            <Dato etiqueta='Ejecutivo' valor={ot.ejecutivo?.nombre ?? 'Sin ejecutivo'} />
            <Dato etiqueta='Área' valor={AREA_LABELS[ot.areaNegocio]} />
            <Dato etiqueta='Fecha de operación' valor={formatFechaCorta(ot.fechaOperacion)} />
            <Dato etiqueta='Pasajeros' valor={String(ot.cantidadPax)} />
            <Dato etiqueta='Moneda' valor={ot.moneda} />
            <Dato etiqueta='Tipo de cambio' valor={ot.tipoCambioCotizacion} />
            {(ot.zonas?.length ?? 0) > 0 && (
              <Dato etiqueta='Zonas' valor={ot.zonas!.map((z) => z.zona?.nombre ?? '—').join(', ')} />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>
            Itinerario (versión {v?.version ?? '—'}
            {v?.version === 1 ? ' · línea base' : ''})
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          {porDia.length === 0 ? (
            <p className='text-muted-foreground text-sm'>Sin líneas.</p>
          ) : (
            porDia.map((dia) => (
              <div key={dia} className='rounded-md border'>
                <div className='bg-muted/50 border-b px-3 py-2 text-sm font-semibold'>Día {dia}</div>
                <div className='divide-y'>
                  {(['AM', 'PM'] as Bloque[]).map((bloque) => {
                    const items = lineas.filter((l) => l.dia === dia && l.bloque === bloque);
                    if (items.length === 0) return null;
                    return (
                      <div key={bloque} className='px-3 py-2'>
                        <div className='text-muted-foreground mb-1 text-xs font-medium uppercase'>
                          {bloque === 'AM' ? 'Mañana' : 'Tarde'}
                        </div>
                        <ul className='space-y-2'>
                          {items.map((l) => (
                            <li key={l.id} className='flex flex-wrap items-center justify-between gap-2 text-sm'>
                              <span className='flex min-w-0 flex-wrap items-center gap-2'>
                                <Badge variant='outline' className='shrink-0'>
                                  {l.tipoLinea === 'OTRO' ? 'Otro' : 'Servicio'}
                                </Badge>
                                <span>{l.descripcion || '(sin descripción)'}</span>
                                {l.proveedor && (
                                  <span className='text-muted-foreground text-xs'>· {l.proveedor.razonSocial}</span>
                                )}
                                {l.acomodacion && (
                                  <span className='text-muted-foreground text-xs'>· {ACOMODACION_LABELS[l.acomodacion]}</span>
                                )}
                                <span className='text-muted-foreground text-xs'>· {l.cantidadPax} pax</span>
                                {l.fechaServicio && (
                                  <span className='text-muted-foreground text-xs'>· {formatFechaCorta(l.fechaServicio)}</span>
                                )}
                              </span>
                              <span className='flex shrink-0 items-center gap-3'>
                                <span className='font-medium'>{formatMonto(l.ventaLinea, ot.moneda)}</span>
                                <EstadoServicioControl ordenId={ot.id} linea={l} puedeEscribir={puedeEscribir} />
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Resumen (versión {v?.version ?? '—'})</CardTitle>
        </CardHeader>
        <CardContent className='grid gap-4 sm:grid-cols-4'>
          <Dato etiqueta='Líneas' valor={String(lineas.length)} />
          <Dato etiqueta='Costo teórico' valor={formatMonto(v?.costoTeoricoTotal, ot.moneda)} />
          {/* En la OT margenTotal es un MONTO (venta − costo), no un ratio. */}
          <Dato etiqueta='Margen' valor={formatMonto(v?.margenTotal, ot.moneda)} />
          <Dato etiqueta='Venta total' valor={formatMonto(v?.ventaTotal, ot.moneda)} />
          {v && v.version !== 1 && (
            <>
              <Dato etiqueta='Tipo de cambio de versión' valor={v.tipoCambio === 'ALCANCE' ? 'Alcance' : 'Corrección'} />
              {v.tipoCambio === 'ALCANCE' && (
                <Dato
                  etiqueta='Aprobación del cliente'
                  valor={v.aprobadoPorCliente ? (v.aprobacionReferencia ?? 'Aprobado') : 'Pendiente'}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      <div className='grid gap-6 lg:grid-cols-2'>
        <VersionesOtPanel
          ordenTrabajoId={ot.id}
          versiones={ot.versiones ?? []}
          moneda={ot.moneda}
          versionVigente={v?.version ?? null}
        />
        <AdjuntosPanel ordenId={ot.id} />
      </div>
    </div>
  );
}
