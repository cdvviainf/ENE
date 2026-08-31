'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertModal } from '@/components/modal/alert-modal';
import { Icons } from '@/components/icons';
import { DireccionDialog, type DireccionFormValues } from '@/components/shared/direccion-dialog';
import { proveedoresService } from '../service';
import { proveedoresKeys } from '../queries';
import type { ProveedorDireccion } from '../types';

function DireccionRow({ proveedorId, direccion }: { proveedorId: number; direccion: ProveedorDireccion }) {
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (values: DireccionFormValues) =>
      proveedoresService.actualizarDireccion(proveedorId, direccion.id, values),
    onSuccess: () => {
      toast.success('Dirección actualizada');
      setEditOpen(false);
      queryClient.invalidateQueries({ queryKey: proveedoresKeys.detail(proveedorId) });
    },
    onError: (e: Error) => toast.error(e.message || 'No se pudo actualizar la dirección')
  });

  const deleteMutation = useMutation({
    mutationFn: () => proveedoresService.eliminarDireccion(proveedorId, direccion.id),
    onSuccess: () => {
      toast.success('Dirección eliminada');
      setDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: proveedoresKeys.detail(proveedorId) });
    },
    onError: (e: Error) => toast.error(e.message || 'No se pudo eliminar la dirección')
  });

  const ubicacion = [direccion.comuna?.nombre, direccion.pais?.nombre].filter(Boolean).join(', ');

  return (
    <div className='flex items-center justify-between gap-3 rounded-md border p-3'>
      <AlertModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        title='¿Eliminar dirección?'
      />
      <DireccionDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        initial={{
          etiqueta: direccion.etiqueta,
          paisId: direccion.paisId,
          comunaId: direccion.comunaId ?? undefined,
          direccion: direccion.direccion,
          esPorDefecto: direccion.esPorDefecto
        }}
        onSubmit={(values) => updateMutation.mutateAsync(values)}
        isPending={updateMutation.isPending}
        title='Editar dirección'
      />
      <div className='min-w-0'>
        <p className='truncate font-medium'>
          {direccion.etiqueta}
          {direccion.esPorDefecto && (
            <Badge variant='outline' className='ml-2'>
              Predeterminada
            </Badge>
          )}
        </p>
        <p className='text-muted-foreground truncate text-xs'>
          {direccion.direccion}
          {ubicacion ? ` · ${ubicacion}` : ''}
        </p>
      </div>
      <div className='flex shrink-0 items-center gap-1'>
        <Button variant='ghost' size='icon' className='h-8 w-8' onClick={() => setEditOpen(true)}>
          <Icons.edit className='h-4 w-4' />
        </Button>
        <Button variant='ghost' size='icon' className='h-8 w-8' onClick={() => setDeleteOpen(true)}>
          <Icons.trash className='text-destructive h-4 w-4' />
        </Button>
      </div>
    </div>
  );
}

export function ProveedorDireccionesCard({
  proveedorId,
  direcciones
}: {
  proveedorId: number;
  direcciones: ProveedorDireccion[];
}) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const createMutation = useMutation({
    mutationFn: (values: DireccionFormValues) => proveedoresService.crearDireccion(proveedorId, values),
    onSuccess: () => {
      toast.success('Dirección agregada');
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: proveedoresKeys.detail(proveedorId) });
    },
    onError: (e: Error) => toast.error(e.message || 'No se pudo agregar la dirección')
  });

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between'>
        <div>
          <CardTitle className='text-base'>Direcciones</CardTitle>
          <CardDescription>Este proveedor puede tener varias; una puede marcarse como predeterminada.</CardDescription>
        </div>
        <Button type='button' variant='outline' size='sm' onClick={() => setDialogOpen(true)}>
          <Icons.add className='mr-1 h-4 w-4' />
          Agregar
        </Button>
      </CardHeader>
      <CardContent className='space-y-2'>
        {direcciones.length === 0 && <p className='text-muted-foreground text-sm'>Sin direcciones registradas.</p>}
        {direcciones.map((d) => (
          <DireccionRow key={d.id} proveedorId={proveedorId} direccion={d} />
        ))}
      </CardContent>
      <DireccionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={(values) => createMutation.mutateAsync(values)}
        isPending={createMutation.isPending}
        title='Nueva dirección'
      />
    </Card>
  );
}
