'use client';

import { useQuery } from '@tanstack/react-query';
import { useQueryStates, parseAsInteger, parseAsBoolean } from 'nuqs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableSkeleton } from '@/components/ui/table/data-table-skeleton';
import { useDataTable } from '@/hooks/use-data-table';
import { tarifasListOptions } from '../queries';
import { tarifarioColumns } from './tarifario-columns';

export function TarifarioListingClient() {
  const [params, setParams] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    perPage: parseAsInteger.withDefault(10),
    soloActivos: parseAsBoolean.withDefault(true)
  });

  const filters = {
    page: params.page,
    limit: params.perPage,
    ...(params.soloActivos ? { soloActivos: true } : {})
  };

  const { data, isPending } = useQuery(tarifasListOptions(filters));
  const pageCount = data ? Math.ceil(data.meta.total / params.perPage) : 0;

  const { table } = useDataTable({
    data: data?.data ?? [],
    columns: tarifarioColumns,
    pageCount,
    shallow: true,
    debounceMs: 500,
    initialState: { columnPinning: { right: ['actions'] } }
  });

  if (isPending) {
    return <DataTableSkeleton columnCount={7} rowCount={6} />;
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-2'>
        <Checkbox
          id='solo-activos'
          checked={params.soloActivos}
          onCheckedChange={(v) => setParams({ soloActivos: v === true, page: 1 })}
        />
        <Label htmlFor='solo-activos' className='cursor-pointer text-sm font-normal'>
          Mostrar solo tarifarios activos
        </Label>
      </div>
      <DataTable table={table} />
    </div>
  );
}
