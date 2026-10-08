'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatFechaCorta } from '@/lib/format';
import { formatMonto, sumarMontos } from '@/lib/dinero';
import { fraccionAPorcentaje } from '@/lib/porcentaje';
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

  // Firma de TODO lo que consume el resolver del documento (cotizacion.resolver.ts):
  // cabecera (cantidadPax) + versión (venta total) + cada línea con los campos que
  // el PDF muestra, incluida la descripción en inglés y el pax por línea (cambian
  // con el recálculo por pax, RN-COS-07). Si cambia, se remonta el iframe para que
  // el documento no quede desfasado —antes solo se recargaba al cambiar idioma o
  // modalidad—.
  const v = cot.versionVigente;
  const pdfSig = [
    `pax${cot.cantidadPax}`,
    `v${v?.version ?? 0}`,
    `vt${v?.ventaTotal ?? ''}`,
    // RN-COT-09/10/COS-08: el PDF también refleja vigencia, comentarios, recargo
    // y zonas; si cambian, se remonta el iframe.
    `fv${v?.fechaVigencia ?? ''}`,
    `rt${v?.recargoTotal ?? ''}`,
    `fp${v?.formaPagoId ?? ''}`,
    `inc${v?.incluidos ?? ''}:${v?.noIncluidos ?? ''}:${v?.notasImportantes ?? ''}`,
    `z${(cot.zonas ?? []).map((z) => z.zonaId).join(',')}`,
    ...(v?.lineas ?? []).map(
      (l) => `${l.id}:${l.dia}:${l.bloque}:${l.orden}:${l.cantidadPax}:${l.ventaTotal}:${l.descripcion}:${l.descripcionEn ?? ''}:${l.observacion ?? ''}`
    )
  ].join('|');

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
            <Dato etiqueta='Negocio' valor={cot.negocio?.apellido ?? '—'} />
            <Dato etiqueta='Ejecutivo' valor={cot.ejecutivo?.nombre ?? 'Sin ejecutivo'} />
            <Dato etiqueta='Área' valor={AREA_LABELS[cot.areaNegocio]} />
            <Dato etiqueta='Fecha de operación' valor={formatFechaCorta(cot.fechaOperacion)} />
            <Dato etiqueta='Pasajeros' valor={String(cot.cantidadPax)} />
            <Dato etiqueta='Moneda' valor={cot.moneda} />
            <Dato etiqueta='Tipo de cambio' valor={cot.tipoCambio} />
            {(cot.zonas?.length ?? 0) > 0 && (
              <Dato etiqueta='Zonas' valor={cot.zonas!.map((z) => z.zona?.nombre ?? '—').join(', ')} />
            )}
          </div>
        </CardContent>
      </Card>

      <ItinerarioEditor
        cotizacionId={cot.id}
        lineas={cot.versionVigente?.lineas ?? []}
        moneda={cot.moneda}
        modo={modo}
        cantidadPaxDefault={cot.cantidadPax}
        contenidoInicial={{
          fechaVigencia: cot.versionVigente?.fechaVigencia ?? null,
          incluidos: cot.versionVigente?.incluidos ?? null,
          noIncluidos: cot.versionVigente?.noIncluidos ?? null,
          notasImportantes: cot.versionVigente?.notasImportantes ?? null,
          formaPagoId: cot.versionVigente?.formaPagoId ?? null
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Resumen (versión {cot.versionVigente?.version ?? '—'})</CardTitle>
        </CardHeader>
        <CardContent className='grid gap-4 sm:grid-cols-4'>
          <Dato etiqueta='Líneas' valor={String(cot.versionVigente?.lineas?.length ?? 0)} />
          <Dato etiqueta='Costo total' valor={formatMonto(cot.versionVigente?.costoTotal, cot.moneda)} />
          {/* margenTotal es el margen promedio ponderado (ratio, p. ej. 0,30), no
              un monto: se muestra como porcentaje, no como dinero (RN-COS-04). */}
          <Dato
            etiqueta='Margen promedio'
            valor={cot.versionVigente?.margenTotal != null ? `${fraccionAPorcentaje(cot.versionVigente.margenTotal)}%` : '—'}
          />
          <Dato etiqueta='Venta total' valor={formatMonto(cot.versionVigente?.ventaTotal, cot.moneda)} />
          {/* RN-COS-08: recargo pass-through de la forma de pago (si hay). */}
          {v?.recargoTotal && v.recargoTotal !== '0.0000' && v.recargoTotal !== '0' && (
            <>
              <Dato
                etiqueta={`Recargo${v.formaPago ? ` (${v.formaPago.nombre})` : ''}`}
                valor={formatMonto(v.recargoTotal, cot.moneda)}
              />
              <Dato etiqueta='Total con recargo' valor={formatMonto(sumarMontos(v.ventaTotal, v.recargoTotal), cot.moneda)} />
            </>
          )}
        </CardContent>
      </Card>

      <div className='grid gap-6 lg:grid-cols-2'>
        <VersionesPanel cotizacionId={cot.id} moneda={cot.moneda} versionVigente={cot.versionVigente?.version ?? null} />
      </div>

      <PdfPreview cotizacionId={cot.id} idiomaDefault={idiomaDefault} refreshKey={pdfSig} />
    </div>
  );
}
