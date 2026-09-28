'use client';

import { useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { formatFechaCorta } from '@/lib/format';
import { formatMonto } from '@/lib/dinero';
import { AREA_LABELS, type CotizacionListItem } from '../types';
import { EstadoBadge } from './estado-badge';

function VerAccion({ cotizacion }: { cotizacion: CotizacionListItem }) {
  const router = useRouter();
  return (
    <Button variant='ghost' className='h-8 w-8 p-0' onClick={() => router.push(`/cotizaciones/${cotizacion.id}`)}>
      <span className='sr-only'>Abrir</span>
      <Icons.chevronRight className='h-4 w-4' />
    </Button>
  );
}

export const cotizacionColumns: ColumnDef<CotizacionListItem>[] = [
  {
    accessorKey: 'numero',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Número' />,
    cell: ({ row }) => <span className='font-medium'>{row.original.numero}</span>
  },
  {
    id: 'cliente',
    header: 'Cliente',
    cell: ({ row }) => row.original.cliente?.razonSocial ?? '—'
  },
  {
    id: 'grupo',
    header: 'Grupo',
    cell: ({ row }) => row.original.grupo?.apellido ?? '—'
  },
  {
    accessorKey: 'areaNegocio',
    header: 'Área',
    cell: ({ row }) => <span className='text-sm'>{AREA_LABELS[row.original.areaNegocio]}</span>
  },
  {
    accessorKey: 'fechaOperacion',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Operación' />,
    cell: ({ row }) => formatFechaCorta(row.original.fechaOperacion)
  },
  {
    id: 'venta',
    header: 'Venta',
    cell: ({ row }) =>
      row.original.versionVigente ? formatMonto(row.original.versionVigente.ventaTotal, row.original.moneda) : '—'
  },
  {
    accessorKey: 'estado',
    header: 'Estado',
    cell: ({ row }) => <EstadoBadge estado={row.original.estado} />
  },
  {
    id: 'actions',
    cell: ({ row }) => <VerAccion cotizacion={row.original} />
  }
];
