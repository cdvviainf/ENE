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
import { tiposServicioService } from '../service';
import { tiposServicioKeys } from '../queries';
import { MODELO_TARIFA_LABELS, type TipoServicio } from '../types';

function TipoServicioCellAction({ tipo }: { tipo: TipoServicio }) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const puedeEscribir = usePuedeEscribir('TIPOS_SERVICIO');

  const deleteMutation = useMutation({
    mutationFn: () => tiposServicioService.remove(tipo.id),
    onSuccess: () => {
      toast.success('Tipo de servicio eliminado');
      setDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: tiposServicioKeys.all });
    },
    onError: (e: Error) => toast.error(e.message || 'Error al eliminar el tipo de servicio')
  });

  if (!puedeEscribir) return null;

  return (
    <>
      <AlertModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        title='¿Eliminar tipo de servicio?'
        description='No se puede eliminar si hay servicios o proveedores que lo usan.'
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
          <DropdownMenuItem onClick={() => router.push(`/config/tipos-servicio/${tipo.id}`)}>
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

export const tipoServicioColumns: ColumnDef<TipoServicio>[] = [
  {
    id: 'codigo',
    accessorKey: 'codigo',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Código' />,
    cell: ({ cell }) => <span className='font-mono text-xs font-semibold'>{cell.getValue<string>()}</span>,
    size: 110
  },
  {
    id: 'nombre',
    accessorKey: 'nombre',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Nombre' />,
    cell: ({ row }) => <span className='font-medium'>{row.original.nombre}</span>
  },
  {
    id: 'modeloTarifaDefault',
    header: 'Modelo de tarifa',
    cell: ({ row }) => <Badge variant='outline'>{MODELO_TARIFA_LABELS[row.original.modeloTarifaDefault]}</Badge>
  },
  {
    id: 'ventanaAvisoDias',
    header: 'Ventana de aviso',
    size: 120,
    cell: ({ row }) => <span className='text-sm'>{row.original.ventanaAvisoDias} días</span>
  },
  {
    id: 'actions',
    size: 50,
    cell: ({ row }) => <TipoServicioCellAction tipo={row.original} />
  }
];
