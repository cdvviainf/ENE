'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatFechaCorta } from '@/lib/format';
import { formatMonto } from '@/lib/dinero';
import { cotizacionDetailOptions } from '../queries';
import { AREA_LABELS, type EstadoCotizacion } from '../types';
import { EstadoBadge } from './estado-badge';
import { EstadoActions } from './estado-actions';
import { ItinerarioEditor } from './itinerario-editor';
import { VersionesPanel } from './versiones-panel';
import { PdfPreview } from './pdf-preview';

function modoDe(estado: EstadoCotizacion): 'borrador' | 'version' | 'bloqueado' {
  if (estado === 'BORRADOR') return 'borrador';
  if (estado === 'ENVIADA' || estado === 'EN_NEGOCIACION') return 'version';
  return 'bloqueado';
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <div className='text-muted-foreground text-xs'>{etiqueta}</div>
      <div className='font-medium'>{valor}</div>
    </div>
  );
}

export function CotizacionDetail({ cotizacionId }: { cotizacionId: number }) {
  const { data: cot, isPending } = useQuery(cotizacionDetailOptions(cotizacionId));

  if (isPending) {
    return (
      <div className='space-y-4'>
        <Skeleton className='h-24 w-full' />
        <Skeleton className='h-64 w-full' />
      </div>
    );
  }
  if (!cot) return <p className='text-muted-foreground'>Cotización no encontrada.</p>;

  const modo = modoDe(cot.estado);
  const idiomaDefault = cot.idiomaDocumento === 'en' ? 'en' : 'es';

  return (
    <div className='space-y-6'>
      <Card>
        <CardContent className='space-y-4 pt-6'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div className='flex items-center gap-3'>
              <h2 className='text-xl font-semibold'>{cot.numero}</h2>
              <EstadoBadge estado={cot.estado} />
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              <EstadoActions cotizacionId={cot.id} estado={cot.estado} />
            </div>
          </div>
          <div className='grid gap-4 sm:grid-cols-3 lg:grid-cols-4'>
            <Dato etiqueta='Cliente' valor={cot.cliente?.razonSocial ?? '—'} />
            <Dato etiqueta='Grupo' valor={cot.grupo?.apellido ?? '—'} />
            <Dato etiqueta='Ejecutivo' valor={cot.ejecutivo?.nombre ?? 'Sin ejecutivo'} />
            <Dato etiqueta='Área' valor={AREA_LABELS[cot.areaNegocio]} />
            <Dato etiqueta='Fecha de operación' valor={formatFechaCorta(cot.fechaOperacion)} />
            <Dato etiqueta='Pasajeros' valor={String(cot.cantidadPax)} />
            <Dato etiqueta='Moneda' valor={cot.moneda} />
            <Dato etiqueta='Tipo de cambio' valor={cot.tipoCambio} />
            {cot.zona && <Dato etiqueta='Zona' valor={cot.zona.nombre} />}
          </div>
        </CardContent>
      </Card>

      <ItinerarioEditor
        cotizacionId={cot.id}
        lineas={cot.versionVigente?.lineas ?? []}
        moneda={cot.moneda}
        modo={modo}
        cantidadPaxDefault={cot.cantidadPax}
      />

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Resumen (versión {cot.versionVigente?.version ?? '—'})</CardTitle>
        </CardHeader>
        <CardContent className='grid gap-4 sm:grid-cols-4'>
          <Dato etiqueta='Líneas' valor={String(cot.versionVigente?.lineas?.length ?? 0)} />
          <Dato etiqueta='Costo total' valor={formatMonto(cot.versionVigente?.costoTotal, cot.moneda)} />
          <Dato etiqueta='Margen' valor={formatMonto(cot.versionVigente?.margenTotal, cot.moneda)} />
          <Dato etiqueta='Venta total' valor={formatMonto(cot.versionVigente?.ventaTotal, cot.moneda)} />
        </CardContent>
      </Card>

      <div className='grid gap-6 lg:grid-cols-2'>
        <VersionesPanel cotizacionId={cot.id} moneda={cot.moneda} versionVigente={cot.versionVigente?.version ?? null} />
      </div>

      <PdfPreview cotizacionId={cot.id} idiomaDefault={idiomaDefault} />
    </div>
  );
}
