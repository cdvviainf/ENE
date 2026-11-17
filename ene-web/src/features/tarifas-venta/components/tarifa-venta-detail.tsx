'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Icons } from '@/components/icons';
import { usePuedeEscribir } from '@/hooks/use-item-acceso';
import { formatFechaCorta } from '@/lib/format';
import { formatMonto } from '@/lib/dinero';
import { ACOMODACION_LABELS } from '@/features/tarifas/types';
import { tarifaVentaDetailOptions, tarifasDeServicioOptions } from '../queries';
import { EstadoTarifaBadge } from './estado-tarifa-badge';

function fecha(iso: string | null) {
  return iso ? formatFechaCorta(iso) : 'Sin término';
}

export function TarifaVentaDetail({ tarifaId }: { tarifaId: number }) {
  const router = useRouter();
  const puedeEscribir = usePuedeEscribir('TARIFAS_VENTA');
  const { data: tarifa, isLoading } = useQuery(tarifaVentaDetailOptions(tarifaId));
  const { data: historial } = useQuery(tarifasDeServicioOptions(tarifa?.servicioId ?? 0));

  if (isLoading || !tarifa) {
    return (
      <div className='space-y-4'>
        <div className='bg-muted h-10 animate-pulse rounded' />
        <div className='bg-muted h-32 animate-pulse rounded' />
      </div>
    );
  }

  const modelo = tarifa.servicio?.modeloTarifa ?? tarifa.valores[0]?.modelo;

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <CardTitle className='text-base'>
              {tarifa.servicio?.codigo} · {tarifa.servicio?.nombre}
            </CardTitle>
            {tarifa.estado ? <EstadoTarifaBadge estado={tarifa.estado} /> : <Badge variant='secondary'>Reemplazada</Badge>}
          </div>
        </CardHeader>
        <CardContent className='grid gap-4 text-sm sm:grid-cols-2'>
          <div>
            <span className='text-muted-foreground'>Moneda:</span> {tarifa.moneda}
          </div>
          <div>
            <span className='text-muted-foreground'>Versión:</span> v{tarifa.version}
          </div>
          <div>
            <span className='text-muted-foreground'>Inicio:</span> {fecha(tarifa.vigenciaDesde)}
          </div>
          <div>
            <span className='text-muted-foreground'>Término:</span> {fecha(tarifa.vigenciaHasta)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Valores de venta</CardTitle>
        </CardHeader>
        <CardContent>
          {modelo === 'UNITARIO_PAX' ? (
            <p className='text-2xl font-semibold'>
              {formatMonto(tarifa.valores[0]?.valor, tarifa.moneda)} <span className='text-muted-foreground text-sm font-normal'>por pasajero</span>
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {modelo === 'TRAMO_PAX' ? (
                    <>
                      <TableHead>Desde</TableHead>
                      <TableHead>Hasta</TableHead>
                    </>
                  ) : (
                    <TableHead>Acomodación</TableHead>
                  )}
                  <TableHead className='text-right'>Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tarifa.valores.map((v) => (
                  <TableRow key={v.id}>
                    {modelo === 'TRAMO_PAX' ? (
                      <>
                        <TableCell>{v.paxDesde}</TableCell>
                        <TableCell>{v.paxHasta ?? 'Sin tope'}</TableCell>
                      </>
                    ) : (
                      <TableCell>{v.acomodacion ? ACOMODACION_LABELS[v.acomodacion] : '—'}</TableCell>
                    )}
                    <TableCell className='text-right tabular-nums'>{formatMonto(v.valor, tarifa.moneda)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className='flex flex-wrap items-center justify-end gap-3'>
        <Button variant='outline' onClick={() => router.push('/config/tarifas-venta')}>
          Volver al listado
        </Button>
        {tarifa.activo && puedeEscribir && (
          <>
            <Button variant='outline' onClick={() => router.push(`/config/tarifas-venta/${tarifaId}/editar`)}>
              <Icons.edit className='mr-2 h-4 w-4' />
              Editar
            </Button>
            <Button onClick={() => router.push(`/config/tarifas-venta/${tarifaId}/nueva-version`)}>
              <Icons.add className='mr-2 h-4 w-4' />
              Nueva versión
            </Button>
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <CardTitle className='text-base'>Tarifas de venta del servicio</CardTitle>
            {puedeEscribir && (
              <Button variant='outline' size='sm' asChild>
                <Link href={`/config/tarifas-venta/nuevo?servicioId=${tarifa.servicioId}`}>
                  <Icons.add className='mr-1 h-4 w-4' />
                  Agregar tarifa
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Moneda</TableHead>
                <TableHead>Versión</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead>Término</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className='w-10' />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(historial ?? []).map((t) => (
                <TableRow key={t.id} className={t.id === tarifaId ? 'bg-muted/50' : undefined}>
                  <TableCell>
                    <Badge variant='outline'>{t.moneda}</Badge>
                  </TableCell>
                  <TableCell>v{t.version}</TableCell>
                  <TableCell>{fecha(t.vigenciaDesde)}</TableCell>
                  <TableCell>{fecha(t.vigenciaHasta)}</TableCell>
                  <TableCell>{t.estado ? <EstadoTarifaBadge estado={t.estado} /> : <Badge variant='secondary'>Reemplazada</Badge>}</TableCell>
                  <TableCell>
                    {t.id !== tarifaId && (
                      <Button variant='ghost' size='icon' asChild title='Ver tarifa'>
                        <Link href={`/config/tarifas-venta/${t.id}`}>
                          <Icons.arrowRight className='h-4 w-4' />
                        </Link>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
