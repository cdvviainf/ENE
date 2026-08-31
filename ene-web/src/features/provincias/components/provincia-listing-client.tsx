'use client';

import { useQuery } from '@tanstack/react-query';
import { useQueryStates, parseAsInteger, parseAsString } from 'nuqs';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { DataTableSkeleton } from '@/components/ui/table/data-table-skeleton';
import { useDataTable } from '@/hooks/use-data-table';
import { provinciasListOptions } from '../queries';
import { provinciaColumns } from './provincia-columns';

export function ProvinciaListingClient() {
  const [params] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    perPage: parseAsInteger.withDefault(10),
    q: parseAsString
  });

  const filters = {
    page: params.page,
    limit: params.perPage,
    ...(params.q ? { q: params.q } : {})
  };

  const { data, isPending } = useQuery(provinciasListOptions(filters));
  const pageCount = data ? Math.ceil(data.meta.total / params.perPage) : 0;

  const { table } = useDataTable({
    data: data?.data ?? [],
    columns: provinciaColumns,
    pageCount,
    shallow: true,
    debounceMs: 500,
    initialState: { columnPinning: { right: ['actions'] } }
  });

  if (isPending) {
    return <DataTableSkeleton columnCount={5} rowCount={6} />;
  }

  return (
    <DataTable table={table}>
      <DataTableToolbar table={table} />
    </DataTable>
  );
}
