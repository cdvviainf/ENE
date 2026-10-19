'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatFechaCorta } from '@/lib/format';
import { formatMonto } from '@/lib/dinero';
import { ordenTrabajoVersionOptions } from '../queries';
import {
  ESTADO_SERVICIO_LABELS,
  TIPO_CAMBIO_LABELS,
  type Moneda,
  type OrdenTrabajoVersionResumen
} from '../types';

// RN-VER-09: abre una versión histórica concreta tal como quedó guardada (líneas
// + evidencia de aprobación), traída del backend, no reconstruida desde maestros.
function VersionHistoricaDialog({
  ordenTrabajoId,
  version,
  moneda,
  onClose
}: {
  ordenTrabajoId: number;
  version: number | null;
  moneda: Moneda;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery(ordenTrabajoVersionOptions(ordenTrabajoId, version ?? 0));

  return (
    <Dialog open={version != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='max-h-[85vh] max-w-3xl overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Versión {version} de la OT</DialogTitle>
          <DialogDescription>
            Documento tal como quedó guardado en esta versión (RN-VER-09).
          </DialogDescription>
        </DialogHeader>

        {isLoading || !data ? (
          <div className='space-y-2'>
            <Skeleton className='h-6 w-full' />
            <Skeleton className='h-6 w-full' />
            <Skeleton className='h-6 w-2/3' />
          </div>
        ) : (
          <div className='flex flex-col gap-4'>
            <div className='flex flex-wrap items-center gap-2 text-sm'>
              {data.version === 1 ? (
                <Badge variant='secondary'>Línea base</Badge>
              ) : (
                <Badge variant='outline'>{TIPO_CAMBIO_LABELS[data.tipoCambio]}</Badge>
              )}
              {data.motivo && <span className='text-muted-foreground'>· {data.motivo}</span>}
              {data.aprobadoPorCliente && (
                <Badge variant='default'>
                  Aprobado por cliente{data.aprobacionEn ? ` · ${formatFechaCorta(data.aprobacionEn)}` : ''}
                </Badge>
              )}
            </div>
            {data.aprobadoPorCliente && data.aprobacionReferencia && (
              <p className='text-muted-foreground text-sm'>Respaldo: {data.aprobacionReferencia}</p>
            )}

            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Día</TableHead>
                    <TableHead>Bloque</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className='text-right'>Pax</TableHead>
                    <TableHead className='text-right'>Costo</TableHead>
                    <TableHead className='text-right'>Venta</TableHead>
                    <TableHead>Servicio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data.lineas ?? []).map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>{l.dia}</TableCell>
                      <TableCell>{l.bloque}</TableCell>
                      <TableCell className='max-w-xs'>
                        {l.descripcion}
                        <span className='text-muted-foreground block text-xs'>
                          {ESTADO_SERVICIO_LABELS[l.estadoServicio]}
                        </span>
                      </TableCell>
                      <TableCell className='text-right'>{l.cantidadPax}</TableCell>
                      <TableCell className='text-right'>{formatMonto(l.costoTeorico, moneda)}</TableCell>
                      <TableCell className='text-right'>{formatMonto(l.ventaLinea, moneda)}</TableCell>
                      <TableCell className='text-muted-foreground text-xs'>
                        {l.servicio?.nombre ?? (l.tipoLinea === 'OTRO' ? 'Otro' : '—')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className='flex justify-end gap-6 text-sm'>
              <span>
                Costo teórico: <strong>{formatMonto(data.costoTeoricoTotal, moneda)}</strong>
              </span>
              <span>
                Venta: <strong>{formatMonto(data.ventaTotal, moneda)}</strong>
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function VersionesOtPanel({
  ordenTrabajoId,
  versiones,
  moneda,
  versionVigente
}: {
  ordenTrabajoId: number;
  versiones: OrdenTrabajoVersionResumen[];
  moneda: Moneda;
  versionVigente: number | null;
}) {
  const [verVersion, setVerVersion] = useState<number | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>Versiones</CardTitle>
      </CardHeader>
      <CardContent>
        {versiones.length === 0 ? (
          <p className='text-muted-foreground text-sm'>Sin versiones.</p>
        ) : (
          <ul className='space-y-2'>
            {versiones.map((v) => (
              <li key={v.id}>
                <Button
                  type='button'
                  variant='ghost'
                  onClick={() => setVerVersion(v.version)}
                  className='flex h-auto w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm font-normal'
                >
                  <span className='flex flex-wrap items-center gap-2'>
                    <Badge variant={v.version === versionVigente ? 'default' : 'outline'}>v{v.version}</Badge>
                    {/* La versión 1 es la línea base congelada (RN-VER-12). */}
                    {v.version === 1 ? (
                      <Badge variant='secondary'>Línea base</Badge>
                    ) : (
                      <Badge variant='outline'>{TIPO_CAMBIO_LABELS[v.tipoCambio]}</Badge>
                    )}
                    {v.aprobadoPorCliente && <Badge variant='default'>Aprobado</Badge>}
                    <span className='text-muted-foreground'>{formatFechaCorta(v.creadoEn)}</span>
                    {v.motivo && <span className='text-muted-foreground'>· {v.motivo}</span>}
                  </span>
                  <span className='font-medium'>{formatMonto(v.ventaTotal, moneda)}</span>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <VersionHistoricaDialog
        ordenTrabajoId={ordenTrabajoId}
        version={verVersion}
        moneda={moneda}
        onClose={() => setVerVersion(null)}
      />
    </Card>
  );
}
