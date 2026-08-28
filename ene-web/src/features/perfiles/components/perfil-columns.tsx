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
import { perfilesService } from '../service';
import { perfilesKeys } from '../queries';
import type { Perfil } from '../types';

function PerfilCellAction({ perfil }: { perfil: Perfil }) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const puedeEscribir = usePuedeEscribir('USUARIOS');

  // RN-PER-06: el perfil ADMINISTRADOR no se elimina nunca. El backend ya lo
  // bloquea; acá se oculta la acción para no mostrar un error evitable.
  const esAdministrador = perfil.codigo === 'ADMINISTRADOR';

  const deleteMutation = useMutation({
    mutationFn: () => perfilesService.remove(perfil.id),
    onSuccess: () => {
      toast.success('Perfil eliminado');
      setDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: perfilesKeys.all });
    },
    onError: (e: Error) => toast.error(e.message || 'Error al eliminar el perfil')
  });

  // Nivel LECTURA: el backend rechaza cualquier mutación con 403 (RN-PER-01).
  // Va después de todos los hooks para no violar rules-of-hooks.
  if (!puedeEscribir) return null;

  return (
    <>
      <AlertModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        title='¿Eliminar perfil?'
        description='El perfil se elimina de forma permanente. No se puede eliminar un perfil con usuarios activos asociados.'
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
          <DropdownMenuItem onClick={() => router.push(`/config/usuarios/perfiles/${perfil.id}`)}>
            <Icons.edit className='mr-2 h-4 w-4' />
            Editar
          </DropdownMenuItem>
          {!esAdministrador && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className='text-destructive focus:text-destructive'
              >
                <Icons.trash className='mr-2 h-4 w-4' />
                Eliminar
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

export const perfilColumns: ColumnDef<Perfil>[] = [
  {
    id: 'codigo',
    accessorKey: 'codigo',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Código' />,
    cell: ({ cell }) => <span className='font-mono text-xs font-semibold'>{cell.getValue<string>()}</span>,
    size: 100
  },
  {
    id: 'nombre',
    accessorKey: 'nombre',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Nombre' />,
    cell: ({ row }) => <span className='font-medium'>{row.original.nombre}</span>
  },
  {
    id: 'descripcion',
    accessorKey: 'descripcion',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Descripción' />,
    cell: ({ cell }) => (
      <span className='text-muted-foreground text-sm'>{cell.getValue<string>() ?? '—'}</span>
    )
  },
  {
    id: 'usuarios',
    header: 'Usuarios',
    size: 90,
    cell: ({ row }) => (
      <Badge variant='outline' className='text-xs'>
        {row.original._count?.usuarios ?? 0}
      </Badge>
    )
  },
  {
    id: 'actions',
    size: 50,
    cell: ({ row }) => <PerfilCellAction perfil={row.original} />
  }
];
