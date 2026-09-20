'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Icons } from '@/components/icons';
import { usePuedeEscribir } from '@/hooks/use-item-acceso';
import { formatFechaCorta } from '@/lib/format';
import { ACOMODACION_LABELS } from '../types';
import { tarifarioDetailOptions } from '../queries';

function formatearFecha(iso: string | null) {
  if (!iso) return 'Sin término';
  return formatFechaCorta(iso);
}

export function TarifarioDetail({ tarifarioId }: { tarifarioId: number }) {
  const router = useRouter();
  const puedeEscribir = usePuedeEscribir('TARIFAS');
  const { data: tarifario, isLoading } = useQuery(tarifarioDetailOptions(tarifarioId));

  if (isLoading || !tarifario) {
    return (
      <div className='space-y-4'>
        <div className='bg-muted h-10 animate-pulse rounded' />
        <div className='bg-muted h-32 animate-pulse rounded' />
      </div>
    );
  }

  const modelo = tarifario.servicio?.modeloTarifa ?? tarifario.valores[0]?.modelo;

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle className='text-base'>
              {tarifario.proveedor?.razonSocial} — {tarifario.servicio?.nombre}
            </CardTitle>
            <Badge variant={tarifario.activo ? 'default' : 'secondary'}>{tarifario.activo ? 'Activo' : 'Inactivo'}</Badge>
          </div>
        </CardHeader>
        <CardContent className='grid gap-4 text-sm sm:grid-cols-2'>
          <div>
            <span className='text-muted-foreground'>Moneda:</span> {tarifario.moneda}
          </div>
          <div>
            <span className='text-muted-foreground'>Versión:</span> v{tarifario.version}
          </div>
          <div>
            <span className='text-muted-foreground'>Vigencia:</span> {formatearFecha(tarifario.vigenciaDesde)} —{' '}
            {formatearFecha(tarifario.vigenciaHasta)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Valores</CardTitle>
        </CardHeader>
        <CardContent>
          {modelo === 'UNITARIO_PAX' ? (
            <p className='text-2xl font-semibold'>{tarifario.valores[0]?.valor}</p>
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
                  <TableHead>Valor</TableHead>
                  {modelo === 'ACOMODACION' && <TableHead>Suplemento single</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tarifario.valores.map((v) => (
                  <TableRow key={v.id}>
                    {modelo === 'TRAMO_PAX' ? (
                      <>
                        <TableCell>{v.paxDesde}</TableCell>
                        <TableCell>{v.paxHasta ?? 'Sin tope'}</TableCell>
                      </>
                    ) : (
                      <TableCell>{v.acomodacion ? ACOMODACION_LABELS[v.acomodacion] : '—'}</TableCell>
                    )}
                    <TableCell>{v.valor}</TableCell>
                    {modelo === 'ACOMODACION' && <TableCell>{v.suplementoSingle ?? '—'}</TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className='flex items-center justify-end gap-3'>
        <Button variant='outline' onClick={() => router.push('/config/tarifas')}>
          Volver al listado
        </Button>
        {tarifario.activo && puedeEscribir && (
          <Button onClick={() => router.push(`/config/tarifas/${tarifarioId}/nueva-version`)}>
            <Icons.add className='mr-2 h-4 w-4' />
            Nueva versión
          </Button>
        )}
      </div>
    </div>
  );
}
