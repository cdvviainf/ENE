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
import { gruposService } from '../service';
import { gruposKeys } from '../queries';
import type { Grupo } from '../types';

function GrupoCellAction({ grupo }: { grupo: Grupo }) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const puedeEscribir = usePuedeEscribir('GRUPOS');

  const deleteMutation = useMutation({
    mutationFn: () => gruposService.remove(grupo.id),
    onSuccess: () => {
      toast.success('Grupo eliminado');
      setDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: gruposKeys.all });
    },
    onError: (e: Error) => toast.error(e.message || 'Error al eliminar el grupo')
  });

  if (!puedeEscribir) return null;

  return (
    <>
      <AlertModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        title='¿Eliminar grupo?'
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
          <DropdownMenuItem onClick={() => router.push(`/config/grupos/${grupo.id}`)}>
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

export const grupoColumns: ColumnDef<Grupo>[] = [
  {
    id: 'apellido',
    accessorKey: 'apellido',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Apellido' />,
    cell: ({ row }) => <span className='font-medium'>{row.original.apellido}</span>
  },
  {
    id: 'codigo',
    accessorKey: 'codigo',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Código' />,
    cell: ({ cell }) => <span className='font-mono text-xs'>{cell.getValue<string>()}</span>,
    size: 100
  },
  {
    id: 'cliente',
    header: 'Cliente',
    cell: ({ row }) => <span className='text-sm'>{row.original.cliente?.razonSocial ?? '—'}</span>
  },
  {
    id: 'cantidadPax',
    header: 'Pax',
    size: 70,
    cell: ({ row }) => <span className='text-sm'>{row.original.cantidadPax}</span>
  },
  {
    id: 'paisOrigen',
    header: 'País de origen',
    cell: ({ row }) => <span className='text-sm'>{row.original.paisOrigen ?? '—'}</span>
  },
  {
    id: 'proximaOperacion',
    header: 'Próxima operación',
    cell: ({ row }) => {
      const fecha = row.original.proximaOperacion;
      return <span className='text-sm'>{fecha ? new Date(fecha).toLocaleDateString('es-CL') : '—'}</span>;
    }
  },
  {
    id: 'actions',
    size: 50,
    cell: ({ row }) => <GrupoCellAction grupo={row.original} />
  }
];
