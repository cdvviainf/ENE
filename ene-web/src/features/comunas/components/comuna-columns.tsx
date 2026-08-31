'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
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
import { comunasService } from '../service';
import { comunasKeys } from '../queries';
import type { Comuna } from '../types';

function ComunaCellAction({ comuna }: { comuna: Comuna }) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const puedeEscribir = usePuedeEscribir('COMUNAS');

  const deleteMutation = useMutation({
    mutationFn: () => comunasService.remove(comuna.id),
    onSuccess: () => {
      toast.success('Comuna eliminada');
      setDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: comunasKeys.all });
    },
    onError: (e: Error) => toast.error(e.message || 'Error al eliminar la comuna')
  });

  if (!puedeEscribir) return null;

  return (
    <>
      <AlertModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        title='¿Eliminar comuna?'
        description='La comuna deja de estar disponible en los selectores de Dirección.'
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
          <DropdownMenuItem onClick={() => router.push(`/config/comunas/${comuna.id}`)}>
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

export const comunaColumns: ColumnDef<Comuna>[] = [
  {
    id: 'codigo',
    accessorKey: 'codigo',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Código' />,
    cell: ({ cell }) => <span className='font-mono text-xs font-semibold'>{cell.getValue<string>()}</span>,
    size: 90
  },
  {
    id: 'nombre',
    accessorKey: 'nombre',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Nombre' />,
    cell: ({ row }) => <span className='font-medium'>{row.original.nombre}</span>
  },
  {
    id: 'provincia',
    header: 'Provincia',
    cell: ({ row }) => <span className='text-sm'>{row.original.provincia?.nombre ?? '—'}</span>
  },
  {
    id: 'region',
    header: 'Región',
    cell: ({ row }) => <span className='text-sm'>{row.original.provincia?.region?.nombre ?? '—'}</span>
  },
  {
    id: 'actions',
    size: 50,
    cell: ({ row }) => <ComunaCellAction comuna={row.original} />
  }
];
