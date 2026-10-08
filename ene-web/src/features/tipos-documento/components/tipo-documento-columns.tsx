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
import { fraccionAPorcentaje } from '@/lib/porcentaje';
import { tiposDocumentoService } from '../service';
import { tiposDocumentoKeys } from '../queries';
import { FORMA_CALCULO_LABELS, type TipoDocumento } from '../types';

function TipoDocumentoCellAction({ tipoDocumento }: { tipoDocumento: TipoDocumento }) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const puedeEscribir = usePuedeEscribir('TIPOS_DOCUMENTO');

  const deleteMutation = useMutation({
    mutationFn: () => tiposDocumentoService.remove(tipoDocumento.id),
    onSuccess: () => {
      toast.success('Tipo de documento eliminado');
      setDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: tiposDocumentoKeys.all });
    },
    onError: (e: Error) => toast.error(e.message || 'Error al eliminar el tipo de documento')
  });

  if (!puedeEscribir) return null;

  return (
    <>
      <AlertModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        title='¿Eliminar tipo de documento?'
        description='El tipo de documento deja de estar disponible en los selectores. No se puede eliminar si está asignado a proveedores activos.'
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
          <DropdownMenuItem onClick={() => router.push(`/config/tipos-documento/${tipoDocumento.id}`)}>
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

export const tipoDocumentoColumns: ColumnDef<TipoDocumento>[] = [
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
    id: 'formaCalculo',
    accessorKey: 'formaCalculo',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Forma de cálculo' />,
    cell: ({ row }) => <span>{FORMA_CALCULO_LABELS[row.original.formaCalculo]}</span>,
    size: 140
  },
  {
    id: 'porcentaje',
    accessorKey: 'porcentaje',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Porcentaje' />,
    cell: ({ row }) => {
      if (row.original.formaCalculo === 'NINGUNO') return <span className='text-muted-foreground'>—</span>;
      return <span className='font-mono text-xs'>{fraccionAPorcentaje(String(row.original.porcentaje))}%</span>;
    },
    size: 110
  },
  {
    id: 'actions',
    size: 50,
    cell: ({ row }) => <TipoDocumentoCellAction tipoDocumento={row.original} />
  }
];
