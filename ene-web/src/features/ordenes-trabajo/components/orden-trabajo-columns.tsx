'use client';

import { useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { formatFechaCorta } from '@/lib/format';
import { formatMonto } from '@/lib/dinero';
import type { OrdenTrabajoListItem } from '../types';
import { EstadoOtBadge } from './estado-ot-badge';

function VerAccion({ orden }: { orden: OrdenTrabajoListItem }) {
  const router = useRouter();
  return (
    <Button variant='ghost' className='h-8 w-8 p-0' onClick={() => router.push(`/ordenes-trabajo/${orden.id}`)}>
      <span className='sr-only'>Abrir</span>
      <Icons.chevronRight className='h-4 w-4' />
    </Button>
  );
}

export const ordenTrabajoColumns: ColumnDef<OrdenTrabajoListItem>[] = [
  {
    accessorKey: 'numero',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Número' />,
    cell: ({ row }) => <span className='font-medium'>{row.original.numero}</span>
  },
  {
    accessorKey: 'apellido',
    header: 'Apellido',
    cell: ({ row }) => <span className='font-medium'>{row.original.apellido}</span>
  },
  {
    id: 'cliente',
    header: 'Cliente',
    cell: ({ row }) => row.original.cliente?.razonSocial ?? '—'
  },
  {
    accessorKey: 'fechaOperacion',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Operación' />,
    cell: ({ row }) => formatFechaCorta(row.original.fechaOperacion)
  },
  {
    id: 'pax',
    header: 'Pax',
    cell: ({ row }) => <span className='text-sm'>{row.original.cantidadPax}</span>
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
    cell: ({ row }) => <EstadoOtBadge estado={row.original.estado} />
  },
  {
    id: 'actions',
    cell: ({ row }) => <VerAccion orden={row.original} />
  }
];
