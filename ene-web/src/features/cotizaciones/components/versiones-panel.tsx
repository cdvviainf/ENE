'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatFechaCorta } from '@/lib/format';
import { formatMonto } from '@/lib/dinero';
import { cotizacionVersionesOptions } from '../queries';
import type { Moneda } from '../types';

export function VersionesPanel({
  cotizacionId,
  moneda,
  versionVigente
}: {
  cotizacionId: number;
  moneda: Moneda;
  versionVigente: number | null;
}) {
  const { data: versiones, isPending } = useQuery(cotizacionVersionesOptions(cotizacionId));

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>Versiones</CardTitle>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <p className='text-muted-foreground text-sm'>Cargando…</p>
        ) : (versiones ?? []).length === 0 ? (
          <p className='text-muted-foreground text-sm'>Sin versiones.</p>
        ) : (
          <ul className='space-y-2'>
            {(versiones ?? []).map((v) => (
              <li key={v.id} className='flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm'>
                <span className='flex items-center gap-2'>
                  <Badge variant={v.version === versionVigente ? 'default' : 'outline'}>v{v.version}</Badge>
                  <span className='text-muted-foreground'>{formatFechaCorta(v.creadoEn)}</span>
                  {v.motivo && <span className='text-muted-foreground'>· {v.motivo}</span>}
                </span>
                <span className='font-medium'>{formatMonto(v.ventaTotal, moneda)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
