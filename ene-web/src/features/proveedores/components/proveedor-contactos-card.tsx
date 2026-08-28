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
import { proveedoresService } from '../service';
import { proveedoresKeys } from '../queries';
import type { ContactoInput, ProveedorContacto } from '../types';

const contactoSchema = z.object({
  nombre: z.string().min(1, 'Requerido').max(120).trim(),
  email: z.string().email('Email inválido').max(120).trim().optional().or(z.literal('')),
  telefono: z.string().max(40).trim().optional(),
  cargo: z.string().max(80).trim().optional()
});
type ContactoFormValues = z.infer<typeof contactoSchema>;

function ContactoDialog({ proveedorId, open, onOpenChange }: { proveedorId: number; open: boolean; onOpenChange: (v: boolean) => void }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: ContactoInput) => proveedoresService.crearContacto(proveedorId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: proveedoresKeys.detail(proveedorId) });
      toast.success('Contacto agregado');
      onOpenChange(false);
      form.reset();
    },
    onError: (e: Error) => toast.error(e.message || 'Error al agregar el contacto')
  });

  const form = useAppForm({
    defaultValues: { nombre: '', email: '', telefono: '', cargo: '' } as ContactoFormValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: contactoSchema as any },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync({ ...value, email: value.email || undefined });
    }
  });

  const { FormTextField } = useFormFields<ContactoFormValues>();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-sm'>
        <DialogHeader>
          <DialogTitle>Nuevo contacto</DialogTitle>
          <DialogDescription>Persona de contacto en el proveedor.</DialogDescription>
        </DialogHeader>
        <form.AppForm>
          <form.Form id='contacto-form' className='space-y-3'>
            <FormTextField name='nombre' label='Nombre' required placeholder='Ej: Pedro Soto' />
            <FormTextField name='email' label='Email' type='email' placeholder='pedro@proveedor.cl' />
            <FormTextField name='telefono' label='Teléfono' placeholder='+56 9 1234 5678' />
            <FormTextField name='cargo' label='Cargo' placeholder='Opcional' />
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

function ContactoRow({ proveedorId, contacto }: { proveedorId: number; contacto: ProveedorContacto }) {
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => proveedoresService.eliminarContacto(proveedorId, contacto.id),
    onSuccess: () => {
      toast.success('Contacto eliminado');
      setDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: proveedoresKeys.detail(proveedorId) });
    },
    onError: (e: Error) => toast.error(e.message || 'No se pudo eliminar el contacto')
  });

  return (
    <div className='flex items-center justify-between gap-3 rounded-md border p-3'>
      <AlertModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        title='¿Eliminar contacto?'
      />
      <div className='min-w-0'>
        <p className='truncate font-medium'>{contacto.nombre}</p>
        <p className='text-muted-foreground truncate text-xs'>
          {[contacto.cargo, contacto.email, contacto.telefono].filter(Boolean).join(' · ') || '—'}
        </p>
      </div>
      <Button variant='ghost' size='icon' className='h-8 w-8 shrink-0' onClick={() => setDeleteOpen(true)}>
        <Icons.trash className='text-destructive h-4 w-4' />
      </Button>
    </div>
  );
}

export function ProveedorContactosCard({
  proveedorId,
  contactos
}: {
  proveedorId: number;
  contactos: ProveedorContacto[];
}) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between'>
        <div>
          <CardTitle className='text-base'>Contactos</CardTitle>
          <CardDescription>Personas de contacto del proveedor.</CardDescription>
        </div>
        <Button type='button' variant='outline' size='sm' onClick={() => setDialogOpen(true)}>
          <Icons.add className='mr-1 h-4 w-4' />
          Agregar
        </Button>
      </CardHeader>
      <CardContent className='space-y-2'>
        {contactos.length === 0 && <p className='text-muted-foreground text-sm'>Sin contactos registrados.</p>}
        {contactos.map((c) => (
          <ContactoRow key={c.id} proveedorId={proveedorId} contacto={c} />
        ))}
      </CardContent>
      <ContactoDialog proveedorId={proveedorId} open={dialogOpen} onOpenChange={setDialogOpen} />
    </Card>
  );
}
