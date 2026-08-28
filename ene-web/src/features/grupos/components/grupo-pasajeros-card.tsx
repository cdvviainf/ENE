'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { AlertModal } from '@/components/modal/alert-modal';
import { Icons } from '@/components/icons';
import { useAppForm, useFormFields } from '@/components/ui/tanstack-form';
import { gruposService } from '../service';
import { gruposKeys } from '../queries';
import type { Pasajero, PasajeroInput } from '../types';

const pasajeroSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(120).trim(),
  edad: z.coerce.number().int().min(0).max(120).optional(),
  nacionalidad: z.string().max(60).trim().optional(),
  documento: z.string().max(40).trim().optional()
});

type PasajeroFormValues = z.infer<typeof pasajeroSchema>;

function PasajeroDialog({ grupoId, open, onOpenChange }: { grupoId: number; open: boolean; onOpenChange: (v: boolean) => void }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: PasajeroInput) => gruposService.crearPasajero(grupoId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gruposKeys.detail(grupoId) });
      toast.success('Pasajero agregado');
      onOpenChange(false);
      form.reset();
    },
    onError: (e: Error) => toast.error(e.message || 'Error al agregar el pasajero')
  });

  const form = useAppForm({
    defaultValues: { nombre: '', edad: undefined, nacionalidad: '', documento: '' } as PasajeroFormValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: pasajeroSchema as any },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    }
  });

  const { FormTextField } = useFormFields<PasajeroFormValues>();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-sm'>
        <DialogHeader>
          <DialogTitle>Nuevo pasajero</DialogTitle>
          {/* RN-GRP-04: el detalle de pasajeros nunca es obligatorio. */}
          <DialogDescription>Suele llegar semanas después de la reserva — es opcional.</DialogDescription>
        </DialogHeader>
        <form.AppForm>
          <form.Form id='pasajero-form' className='space-y-3'>
            <FormTextField name='nombre' label='Nombre' required placeholder='Ej: Juan Pérez' />
            <FormTextField name='edad' label='Edad' type='number' placeholder='Opcional' />
            <FormTextField name='nacionalidad' label='Nacionalidad' placeholder='Opcional' />
            <FormTextField name='documento' label='Documento' placeholder='Pasaporte / DNI' />
            <div className='flex justify-end gap-2 pt-2'>
              <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type='submit' isLoading={mutation.isPending}>
                <Icons.check className='mr-1 h-4 w-4' />
                Agregar
              </Button>
            </div>
          </form.Form>
        </form.AppForm>
      </DialogContent>
    </Dialog>
  );
}

function PasajeroRow({ grupoId, pasajero }: { grupoId: number; pasajero: Pasajero }) {
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => gruposService.eliminarPasajero(grupoId, pasajero.id),
    onSuccess: () => {
      toast.success('Pasajero eliminado');
      setDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: gruposKeys.detail(grupoId) });
    },
    onError: (e: Error) => toast.error(e.message || 'No se pudo eliminar el pasajero')
  });

  return (
    <div className='flex items-center justify-between gap-3 rounded-md border p-3'>
      <AlertModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        title='¿Eliminar pasajero?'
      />
      <div className='min-w-0'>
        <p className='truncate font-medium'>{pasajero.nombre}</p>
        <p className='text-muted-foreground truncate text-xs'>
          {[pasajero.edad ? `${pasajero.edad} años` : null, pasajero.nacionalidad, pasajero.documento]
            .filter(Boolean)
            .join(' · ') || '—'}
        </p>
      </div>
      <Button variant='ghost' size='icon' className='h-8 w-8 shrink-0' onClick={() => setDeleteOpen(true)}>
        <Icons.trash className='text-destructive h-4 w-4' />
      </Button>
    </div>
  );
}

export function GrupoPasajerosCard({ grupoId, pasajeros }: { grupoId: number; pasajeros: Pasajero[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between'>
        <div>
          <CardTitle className='text-base'>Pasajeros</CardTitle>
          <CardDescription>Opcional — no bloquea cotizar ni generar la OT (RN-GRP-04).</CardDescription>
        </div>
        <Button type='button' variant='outline' size='sm' onClick={() => setDialogOpen(true)}>
          <Icons.add className='mr-1 h-4 w-4' />
          Agregar
        </Button>
      </CardHeader>
      <CardContent className='space-y-2'>
        {pasajeros.length === 0 && <p className='text-muted-foreground text-sm'>Sin pasajeros registrados.</p>}
        {pasajeros.map((p) => (
          <PasajeroRow key={p.id} grupoId={grupoId} pasajero={p} />
        ))}
      </CardContent>
      <PasajeroDialog grupoId={grupoId} open={dialogOpen} onOpenChange={setDialogOpen} />
    </Card>
  );
}
