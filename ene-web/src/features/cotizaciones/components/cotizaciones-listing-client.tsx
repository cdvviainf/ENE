'use client';

import { useQuery } from '@tanstack/react-query';
import { useQueryStates, parseAsInteger, parseAsString } from 'nuqs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableSkeleton } from '@/components/ui/table/data-table-skeleton';
import { useDataTable } from '@/hooks/use-data-table';
import { cotizacionesListOptions } from '../queries';
import { ESTADO_LABELS, type EstadoCotizacion } from '../types';
import { cotizacionColumns } from './cotizacion-columns';

const ESTADOS: EstadoCotizacion[] = ['BORRADOR', 'ENVIADA', 'EN_NEGOCIACION', 'APROBADA', 'PERDIDA', 'DESISTIDA'];

export function CotizacionesListingClient() {
  const [params, setParams] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    perPage: parseAsInteger.withDefault(10),
    estado: parseAsString.withDefault(''),
    q: parseAsString.withDefault('')
  });

  const filters = {
    page: params.page,
    limit: params.perPage,
    ...(params.estado ? { estado: params.estado as EstadoCotizacion } : {}),
    ...(params.q ? { q: params.q } : {})
  };

  const { data, isPending } = useQuery(cotizacionesListOptions(filters));
  const pageCount = data ? Math.ceil(data.meta.total / params.perPage) : 0;

  const { table } = useDataTable({
    data: data?.data ?? [],
    columns: cotizacionColumns,
    pageCount,
    shallow: true,
    debounceMs: 500,
    initialState: { columnPinning: { right: ['actions'] } }
  });

  if (isPending) {
    return <DataTableSkeleton columnCount={8} rowCount={6} />;
  }

  return (
    <DataTable table={table}>
      <div className='flex flex-wrap items-center gap-2'>
        <Input
          placeholder='Buscar por número, cliente o grupo...'
          defaultValue={params.q}
          onChange={(e) => setParams({ q: e.target.value, page: 1 })}
          className='max-w-xs'
        />
        <Select
          value={params.estado || '__all__'}
          onValueChange={(v) => setParams({ estado: v === '__all__' ? '' : v, page: 1 })}
        >
          <SelectTrigger className='w-[180px]'>
            <SelectValue placeholder='Todos los estados' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='__all__'>Todos los estados</SelectItem>
            {ESTADOS.map((e) => (
              <SelectItem key={e} value={e}>
                {ESTADO_LABELS[e]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </DataTable>
  );
}
