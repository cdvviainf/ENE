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
import { proveedoresService } from '../service';
import { proveedoresKeys } from '../queries';
import type { Proveedor } from '../types';

function ProveedorCellAction({ proveedor }: { proveedor: Proveedor }) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const puedeEscribir = usePuedeEscribir('PROVEEDORES');

  const deleteMutation = useMutation({
    mutationFn: () => proveedoresService.remove(proveedor.id),
    onSuccess: () => {
      toast.success('Proveedor eliminado');
      setDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: proveedoresKeys.all });
    },
    onError: (e: Error) => toast.error(e.message || 'Error al eliminar el proveedor')
  });

  if (!puedeEscribir) return null;

  return (
    <>
      <AlertModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        title='¿Eliminar proveedor?'
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
          <DropdownMenuItem onClick={() => router.push(`/config/proveedores/${proveedor.id}`)}>
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

export const proveedorColumns: ColumnDef<Proveedor>[] = [
  {
    id: 'codigo',
    accessorKey: 'codigo',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Código' />,
    cell: ({ cell }) => <span className='font-mono text-xs font-semibold'>{cell.getValue<string>()}</span>,
    size: 90
  },
  {
    id: 'razonSocial',
    accessorKey: 'razonSocial',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Razón social' />,
    cell: ({ row }) => (
      <div>
        <p className='font-medium'>{row.original.razonSocial}</p>
        {row.original.nombreComercial && (
          <p className='text-muted-foreground text-xs'>{row.original.nombreComercial}</p>
        )}
      </div>
    )
  },
  {
    id: 'tiposServicio',
    header: 'Tipos de servicio',
    cell: ({ row }) => (
      <span className='text-sm'>
        {(row.original.tiposServicio ?? []).map((t) => t.tipoServicio.nombre).join(', ') || '—'}
      </span>
    )
  },
  {
    id: 'zonas',
    header: 'Zonas',
    cell: ({ row }) => (
      <div className='flex flex-wrap gap-1'>
        {(row.original.zonas ?? []).map((pz) => (
          <Badge key={pz.zonaId} variant='outline'>
            {pz.zona.codigo}
          </Badge>
        ))}
        {(row.original.zonas ?? []).length === 0 && <span className='text-muted-foreground text-sm'>—</span>}
      </div>
    )
  },
  {
    id: 'rut',
    header: 'RUT',
    cell: ({ row }) => <span className='font-mono text-xs'>{row.original.rut}</span>
  },
  {
    id: 'actions',
    size: 50,
    cell: ({ row }) => <ProveedorCellAction proveedor={row.original} />
  }
];
