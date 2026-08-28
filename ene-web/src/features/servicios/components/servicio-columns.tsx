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
import { serviciosService } from '../service';
import { serviciosKeys } from '../queries';
import type { Servicio } from '../types';

function ServicioCellAction({ servicio }: { servicio: Servicio }) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const puedeEscribir = usePuedeEscribir('SERVICIOS');

  const deleteMutation = useMutation({
    mutationFn: () => serviciosService.remove(servicio.id),
    onSuccess: () => {
      toast.success('Servicio eliminado');
      setDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: serviciosKeys.all });
    },
    onError: (e: Error) => toast.error(e.message || 'Error al eliminar el servicio')
  });

  if (!puedeEscribir) return null;

  return (
    <>
      <AlertModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        title='¿Eliminar servicio?'
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
          <DropdownMenuItem onClick={() => router.push(`/config/servicios/${servicio.id}`)}>
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

export const servicioColumns: ColumnDef<Servicio>[] = [
  {
    id: 'codigo',
    accessorKey: 'codigo',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Código' />,
    cell: ({ cell }) => <span className='font-mono text-xs font-semibold'>{cell.getValue<string>()}</span>,
    size: 90
  },
  {
    id: 'nombre',
    header: 'Nombre',
    cell: ({ row }) => (
      <div className='flex items-center gap-2'>
        <span className='font-medium'>{row.original.nombre}</span>
        {row.original.advertenciaSinTraduccion && (
          <span title='Sin nombre en inglés (RN-MAN-08)'>
            <Icons.warning className='text-amber-500 h-4 w-4' />
          </span>
        )}
      </div>
    )
  },
  {
    id: 'tipoServicio',
    header: 'Tipo de servicio',
    cell: ({ row }) => <span className='text-sm'>{row.original.tipoServicio?.nombre ?? '—'}</span>
  },
  {
    id: 'zona',
    header: 'Zona',
    cell: ({ row }) => <span className='text-sm'>{row.original.zona?.nombre ?? '—'}</span>
  },
  {
    id: 'modeloTarifa',
    header: 'Modelo de tarifa',
    cell: ({ row }) => <Badge variant='outline'>{row.original.modeloTarifa}</Badge>
  },
  {
    id: 'margenSugerido',
    header: 'Margen sugerido',
    size: 110,
    cell: ({ row }) => <span className='text-sm'>{(Number(row.original.margenSugerido) * 100).toFixed(0)}%</span>
  },
  {
    id: 'actions',
    size: 50,
    cell: ({ row }) => <ServicioCellAction servicio={row.original} />
  }
];
