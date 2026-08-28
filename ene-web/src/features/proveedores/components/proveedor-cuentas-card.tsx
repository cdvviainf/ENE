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
import type { CuentaInput, ProveedorCuenta } from '../types';

const cuentaSchema = z.object({
  banco: z.string().min(1, 'Requerido').max(80).trim(),
  tipoCuenta: z.string().max(40).trim().optional(),
  numeroCuenta: z.string().min(1, 'Requerido').max(40).trim(),
  titular: z.string().max(150).trim().optional(),
  rutTitular: z.string().max(12).trim().optional()
});
type CuentaFormValues = z.infer<typeof cuentaSchema>;

function CuentaDialog({ proveedorId, open, onOpenChange }: { proveedorId: number; open: boolean; onOpenChange: (v: boolean) => void }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: CuentaInput) => proveedoresService.crearCuenta(proveedorId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: proveedoresKeys.detail(proveedorId) });
      toast.success('Cuenta agregada');
      onOpenChange(false);
      form.reset();
    },
    onError: (e: Error) => toast.error(e.message || 'Error al agregar la cuenta')
  });

  const form = useAppForm({
    defaultValues: { banco: '', tipoCuenta: '', numeroCuenta: '', titular: '', rutTitular: '' } as CuentaFormValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: cuentaSchema as any },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    }
  });

  const { FormTextField } = useFormFields<CuentaFormValues>();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-sm'>
        <DialogHeader>
          <DialogTitle>Nueva cuenta bancaria</DialogTitle>
          {/* RN-PRV-04: ninguna cuenta es "principal" en fase 1. */}
          <DialogDescription>Se elige cuál usar al registrar el pago.</DialogDescription>
        </DialogHeader>
        <form.AppForm>
          <form.Form id='cuenta-form' className='space-y-3'>
            <FormTextField name='banco' label='Banco' required placeholder='Ej: Banco de Chile' />
            <FormTextField name='tipoCuenta' label='Tipo de cuenta' placeholder='Ej: Corriente' />
            <FormTextField name='numeroCuenta' label='Número de cuenta' required />
            <FormTextField name='titular' label='Titular' placeholder='Opcional' />
            <FormTextField name='rutTitular' label='RUT del titular' placeholder='Opcional' />
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

function CuentaRow({ proveedorId, cuenta }: { proveedorId: number; cuenta: ProveedorCuenta }) {
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => proveedoresService.eliminarCuenta(proveedorId, cuenta.id),
    onSuccess: () => {
      toast.success('Cuenta eliminada');
      setDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: proveedoresKeys.detail(proveedorId) });
    },
    onError: (e: Error) => toast.error(e.message || 'No se pudo eliminar la cuenta')
  });

  return (
    <div className='flex items-center justify-between gap-3 rounded-md border p-3'>
      <AlertModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        title='¿Eliminar cuenta bancaria?'
      />
      <div className='min-w-0'>
        <p className='truncate font-medium'>
          {cuenta.banco} {cuenta.tipoCuenta ? `· ${cuenta.tipoCuenta}` : ''}
        </p>
        <p className='text-muted-foreground truncate text-xs'>
          {cuenta.numeroCuenta} {cuenta.titular ? `· ${cuenta.titular}` : ''}
        </p>
      </div>
      <Button variant='ghost' size='icon' className='h-8 w-8 shrink-0' onClick={() => setDeleteOpen(true)}>
        <Icons.trash className='text-destructive h-4 w-4' />
      </Button>
    </div>
  );
}

export function ProveedorCuentasCard({ proveedorId, cuentas }: { proveedorId: number; cuentas: ProveedorCuenta[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between'>
        <div>
          <CardTitle className='text-base'>Cuentas bancarias</CardTitle>
          <CardDescription>Un proveedor puede tener varias.</CardDescription>
        </div>
        <Button type='button' variant='outline' size='sm' onClick={() => setDialogOpen(true)}>
          <Icons.add className='mr-1 h-4 w-4' />
          Agregar
        </Button>
      </CardHeader>
      <CardContent className='space-y-2'>
        {cuentas.length === 0 && <p className='text-muted-foreground text-sm'>Sin cuentas registradas.</p>}
        {cuentas.map((c) => (
          <CuentaRow key={c.id} proveedorId={proveedorId} cuenta={c} />
        ))}
      </CardContent>
      <CuentaDialog proveedorId={proveedorId} open={dialogOpen} onOpenChange={setDialogOpen} />
    </Card>
  );
}
