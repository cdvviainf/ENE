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
import { condicionesPagoService } from '../service';
import { condicionesPagoKeys } from '../queries';
import type { CondicionPago, CondicionPagoCuota } from '../types';

// Resumen corto del cronograma, ej. "50% al confirmar + 50% a 30 días".
export function resumenCuotas(cuotas: CondicionPagoCuota[]): string {
  if (cuotas.length === 0) return '—';
  return cuotas
    .map((c) => `${c.porcentaje}% ${c.plazoDias === 0 ? 'al confirmar' : `a ${c.plazoDias} días`}`)
    .join(' + ');
}

function CondicionPagoCellAction({ condicionPago }: { condicionPago: CondicionPago }) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const puedeEscribir = usePuedeEscribir('CONDICIONES_PAGO');

  const deleteMutation = useMutation({
    mutationFn: () => condicionesPagoService.remove(condicionPago.id),
    onSuccess: () => {
      toast.success('Condición de pago eliminada');
      setDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: condicionesPagoKeys.all });
    },
    onError: (e: Error) => toast.error(e.message || 'Error al eliminar la condición de pago')
  });

  if (!puedeEscribir) return null;

  return (
    <>
      <AlertModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        title='¿Eliminar condición de pago?'
        description='Deja de estar disponible en los selectores. No se puede eliminar si está en uso por algún cliente o proveedor activo.'
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
          <DropdownMenuItem onClick={() => router.push(`/config/condiciones-pago/${condicionPago.id}`)}>
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

export const condicionPagoColumns: ColumnDef<CondicionPago>[] = [
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
    id: 'cuotas',
    header: 'Cuotas',
    cell: ({ row }) => <span className='text-sm'>{resumenCuotas(row.original.cuotas)}</span>
  },
  {
    id: 'actions',
    size: 50,
    cell: ({ row }) => <CondicionPagoCellAction condicionPago={row.original} />
  }
];
