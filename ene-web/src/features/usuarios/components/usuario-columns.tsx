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
import { authClient } from '@/lib/auth-client';
import { usePuedeEscribir } from '@/hooks/use-item-acceso';
import { usuariosService } from '../service';
import { usuariosKeys } from '../queries';
import { CambiarPasswordModal } from './cambiar-password-modal';
import type { Usuario } from '../types';

function UsuarioCellAction({ usuario }: { usuario: Usuario }) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const puedeEscribir = usePuedeEscribir('USUARIOS');

  // RN-PER-05: nadie se elimina ni desactiva a sí mismo. El backend ya lo
  // bloquea; acá se oculta para no ofrecer una acción que va a fallar.
  const esUsuarioActual = session?.user.email === usuario.email;

  const deleteMutation = useMutation({
    mutationFn: () => usuariosService.remove(usuario.id),
    onSuccess: () => {
      toast.success('Usuario eliminado');
      setDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: usuariosKeys.all });
    },
    onError: (e: Error) => toast.error(e.message || 'Error al eliminar el usuario')
  });

  // Nivel LECTURA: el backend rechaza cualquier mutación con 403 (RN-PER-01).
  // Sin el menú de acciones no hay nada que ofrecer que vaya a fallar. Va
  // después de todos los hooks para no violar rules-of-hooks.
  if (!puedeEscribir) return null;

  return (
    <>
      <AlertModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        title='¿Eliminar usuario?'
        description='El usuario se elimina de forma permanente y no podrá iniciar sesión.'
      />
      <CambiarPasswordModal usuario={usuario} open={passwordOpen} onClose={() => setPasswordOpen(false)} />

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' className='h-8 w-8 p-0'>
            <span className='sr-only'>Abrir menú</span>
            <Icons.ellipsis className='h-4 w-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => router.push(`/config/usuarios/${usuario.id}`)}>
            <Icons.edit className='mr-2 h-4 w-4' />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setPasswordOpen(true)}>
            <Icons.lock className='mr-2 h-4 w-4' />
            Cambiar contraseña
          </DropdownMenuItem>
          {!esUsuarioActual && (
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

export const usuarioColumns: ColumnDef<Usuario>[] = [
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
    id: 'email',
    accessorKey: 'email',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Email' />,
    cell: ({ cell }) => <span className='text-muted-foreground font-mono text-sm'>{cell.getValue<string>()}</span>
  },
  {
    id: 'perfil',
    header: 'Perfil',
    cell: ({ row }) => <span className='text-sm'>{row.original.perfil.nombre}</span>
  },
  {
    id: 'activo',
    header: 'Estado',
    size: 90,
    cell: ({ row }) =>
      row.original.activo ? (
        <Badge variant='default'>Activo</Badge>
      ) : (
        <Badge variant='outline'>Inactivo</Badge>
      )
  },
  {
    id: 'actions',
    size: 50,
    cell: ({ row }) => <UsuarioCellAction usuario={row.original} />
  }
];
