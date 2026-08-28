'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { AlertModal } from '@/components/modal/alert-modal';
import { Icons } from '@/components/icons';
import { usePuedeEscribir } from '@/hooks/use-item-acceso';
import { clientesService } from '../service';
import { clientesKeys } from '../queries';
import type { Cliente } from '../types';

function ClienteCellAction({ cliente }: { cliente: Cliente }) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const puedeEscribir = usePuedeEscribir('CLIENTES');

  const deleteMutation = useMutation({
    mutationFn: () => clientesService.remove(cliente.id),
    onSuccess: () => {
      toast.success('Cliente eliminado');
      setDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: clientesKeys.all });
    },
    onError: (e: Error) => toast.error(e.message || 'Error al eliminar el cliente')
  });

  if (!puedeEscribir) return null;

  return (
    <>
      <AlertModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        title='¿Eliminar cliente?'
        description='No se puede eliminar si participa en operaciones activas (RN-MAN-04).'
      />
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' className='h-8 w-8 p-0'>
            <span className='sr-only'>Abrir menú</span>
            <Icons.ellipsis className='h-4 w-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => router.push(`/config/clientes/${cliente.id}`)}>
            <Icons.edit className='mr-2 h-4 w-4' />
            Editar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setDeleteOpen(true)} className='text-destructive focus:text-destructive'>
            <Icons.trash className='mr-2 h-4 w-4' />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

export const clienteColumns: ColumnDef<Cliente>[] = [
  {
    id: 'codigo',
    accessorKey: 'codigo',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Código' />,
    cell: ({ cell }) => <span className='font-mono text-xs font-semibold'>{cell.getValue<string>()}</span>,
    size: 90
  },
  {
    id: 'tipo',
    header: 'Tipo',
    size: 100,
    cell: ({ row }) => (
      <Badge variant={row.original.tipo === 'EMPRESA' ? 'default' : 'outline'}>
        {row.original.tipo === 'EMPRESA' ? 'Empresa' : 'Agencia'}
      </Badge>
    )
  },
  {
    id: 'razonSocial',
    accessorKey: 'razonSocial',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Razón social' />,
    cell: ({ row }) => <span className='font-medium'>{row.original.razonSocial}</span>
  },
  {
    id: 'pais',
    header: 'País',
    cell: ({ row }) => <span className='text-sm'>{row.original.pais}</span>
  },
  {
    id: 'monedaHabitual',
    header: 'Moneda',
    size: 90,
    cell: ({ row }) => <span className='text-muted-foreground text-sm'>{row.original.monedaHabitual}</span>
  },
  {
    id: 'ordenes',
    header: 'OT',
    size: 70,
    cell: ({ row }) => <span className='text-sm'>{row.original._count?.ordenes ?? 0}</span>
  },
  {
    id: 'ejecutivos',
    header: 'Ejecutivos',
    size: 90,
    cell: ({ row }) => <span className='text-sm'>{row.original._count?.ejecutivos ?? 0}</span>
  },
  {
    id: 'actions',
    size: 50,
    cell: ({ row }) => <ClienteCellAction cliente={row.original} />
  }
];
