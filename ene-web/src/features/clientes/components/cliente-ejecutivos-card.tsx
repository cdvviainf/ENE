'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
import { clientesService } from '../service';
import { clientesKeys } from '../queries';
import type { ClienteEjecutivo, EjecutivoInput } from '../types';

const ejecutivoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(120).trim(),
  email: z.string().email('Email inválido').max(120).trim().optional().or(z.literal('')),
  telefono: z.string().max(40).trim().optional(),
  cargo: z.string().max(80).trim().optional()
});

type EjecutivoFormValues = z.infer<typeof ejecutivoSchema>;

function EjecutivoDialog({
  clienteId,
  open,
  onOpenChange
}: {
  clienteId: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: EjecutivoInput) => clientesService.crearEjecutivo(clienteId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientesKeys.detail(clienteId) });
      toast.success('Ejecutivo agregado');
      onOpenChange(false);
      form.reset();
    },
    onError: (e: Error) => toast.error(e.message || 'Error al agregar el ejecutivo')
  });

  const form = useAppForm({
    defaultValues: { nombre: '', email: '', telefono: '', cargo: '' } as EjecutivoFormValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: ejecutivoSchema as any },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync({ ...value, email: value.email || undefined });
    }
  });

  const { FormTextField } = useFormFields<EjecutivoFormValues>();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-sm'>
        <DialogHeader>
          <DialogTitle>Nuevo ejecutivo</DialogTitle>
          <DialogDescription>Contacto del cliente para cotizaciones y coordinación.</DialogDescription>
        </DialogHeader>
        <form.AppForm>
          <form.Form id='ejecutivo-form' className='space-y-3'>
            <FormTextField name='nombre' label='Nombre' required placeholder='Ej: Ana Pérez' />
            <FormTextField name='email' label='Email' type='email' placeholder='ana@agencia.com' />
            <FormTextField name='telefono' label='Teléfono' placeholder='+56 9 1234 5678' />
            <FormTextField name='cargo' label='Cargo' placeholder='Ej: Ejecutiva de cuenta' />
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

function EjecutivoRow({ clienteId, ejecutivo }: { clienteId: number; ejecutivo: ClienteEjecutivo }) {
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const toggleMutation = useMutation({
    mutationFn: (activo: boolean) => clientesService.actualizarEjecutivo(clienteId, ejecutivo.id, { activo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientesKeys.detail(clienteId) });
    },
    // RN-CLI-04: el backend rechaza desactivar el último ejecutivo activo de
    // un cliente con operaciones abiertas — se muestra el motivo real.
    onError: (e: Error) => toast.error(e.message || 'No se pudo actualizar el ejecutivo')
  });

  const deleteMutation = useMutation({
    mutationFn: () => clientesService.eliminarEjecutivo(clienteId, ejecutivo.id),
    onSuccess: () => {
      toast.success('Ejecutivo eliminado');
      setDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: clientesKeys.detail(clienteId) });
    },
    onError: (e: Error) => toast.error(e.message || 'No se pudo eliminar el ejecutivo')
  });

  return (
    <div className='flex items-center justify-between gap-3 rounded-md border p-3'>
      <AlertModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        title='¿Eliminar ejecutivo?'
        description='No se puede eliminar si es el último ejecutivo activo de un cliente con operaciones abiertas (RN-CLI-04).'
      />
      <div className='min-w-0'>
        <p className='truncate font-medium'>{ejecutivo.nombre}</p>
        <p className='text-muted-foreground truncate text-xs'>
          {[ejecutivo.cargo, ejecutivo.email, ejecutivo.telefono].filter(Boolean).join(' · ') || '—'}
        </p>
      </div>
      <div className='flex shrink-0 items-center gap-3'>
        {!ejecutivo.activo && <Badge variant='outline'>Inactivo</Badge>}
        <Switch
          checked={ejecutivo.activo}
          onCheckedChange={(v) => toggleMutation.mutate(v)}
          disabled={toggleMutation.isPending}
        />
        <Button variant='ghost' size='icon' className='h-8 w-8' onClick={() => setDeleteOpen(true)}>
          <Icons.trash className='text-destructive h-4 w-4' />
        </Button>
      </div>
    </div>
  );
}

// RN-CLI-03: los ejecutivos se editan dentro de la ficha del cliente, no en
// un mantenedor propio.
export function ClienteEjecutivosCard({
  clienteId,
  ejecutivos
}: {
  clienteId: number;
  ejecutivos: ClienteEjecutivo[];
}) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between'>
        <div>
          <CardTitle className='text-base'>Ejecutivos</CardTitle>
          <CardDescription>Contactos de este cliente para cotización y coordinación.</CardDescription>
        </div>
        <Button type='button' variant='outline' size='sm' onClick={() => setDialogOpen(true)}>
          <Icons.add className='mr-1 h-4 w-4' />
          Agregar
        </Button>
      </CardHeader>
      <CardContent className='space-y-2'>
        {ejecutivos.length === 0 && <p className='text-muted-foreground text-sm'>Sin ejecutivos registrados.</p>}
        {ejecutivos.map((e) => (
          <EjecutivoRow key={e.id} clienteId={clienteId} ejecutivo={e} />
        ))}
      </CardContent>
      <EjecutivoDialog clienteId={clienteId} open={dialogOpen} onOpenChange={setDialogOpen} />
    </Card>
  );
}
