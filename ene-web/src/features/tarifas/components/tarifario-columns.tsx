'use client';

import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { formatFechaCorta } from '@/lib/format';
import type { Tarifario } from '../types';

function formatearFecha(iso: string | null) {
  if (!iso) return 'Sin término';
  return formatFechaCorta(iso);
}

export const tarifarioColumns: ColumnDef<Tarifario>[] = [
  {
    id: 'proveedor',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Proveedor' />,
    cell: ({ row }) => <span className='font-medium'>{row.original.proveedor?.razonSocial ?? '—'}</span>
  },
  {
    id: 'servicio',
    header: 'Servicio',
    cell: ({ row }) => <span className='text-sm'>{row.original.servicio?.nombre ?? '—'}</span>
  },
  {
    id: 'moneda',
    header: 'Moneda',
    size: 80,
    cell: ({ row }) => <Badge variant='outline'>{row.original.moneda}</Badge>
  },
  {
    id: 'vigencia',
    header: 'Vigencia',
    cell: ({ row }) => (
      <span className='text-sm'>
        {formatearFecha(row.original.vigenciaDesde)} — {formatearFecha(row.original.vigenciaHasta)}
      </span>
    )
  },
  {
    id: 'version',
    header: 'Versión',
    size: 80,
    cell: ({ row }) => <span className='text-sm'>v{row.original.version}</span>
  },
  {
    id: 'estado',
    header: 'Estado',
    size: 100,
    cell: ({ row }) => <Badge variant={row.original.activo ? 'default' : 'secondary'}>{row.original.activo ? 'Activo' : 'Inactivo'}</Badge>
  },
  {
    id: 'actions',
    size: 60,
    cell: ({ row }) => (
      <Button variant='ghost' size='icon' asChild title='Ver detalle'>
        <Link href={`/config/tarifas/${row.original.id}`}>
          <Icons.arrowRight className='h-4 w-4' />
        </Link>
      </Button>
    )
  }
];
