'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Icons } from '@/components/icons';
import { useAppForm, useFormFields } from '@/components/ui/tanstack-form';
import { proveedoresService } from '../service';
import { proveedoresKeys } from '../queries';
import type { ProveedorAlias } from '../types';

const aliasSchema = z.object({ alias: z.string().min(1, 'Requerido').max(150).trim() });
type AliasFormValues = z.infer<typeof aliasSchema>;

function AliasDialog({ proveedorId, open, onOpenChange }: { proveedorId: number; open: boolean; onOpenChange: (v: boolean) => void }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: AliasFormValues) => proveedoresService.crearAlias(proveedorId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: proveedoresKeys.detail(proveedorId) });
      toast.success('Alias agregado');
      onOpenChange(false);
      form.reset();
    },
    // RN-PRV-03: el backend rechaza un alias ya usado por otro proveedor.
    onError: (e: Error) => toast.error(e.message || 'Error al agregar el alias')
  });

  const form = useAppForm({
    defaultValues: { alias: '' } as AliasFormValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: aliasSchema as any },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    }
  });

  const { FormTextField } = useFormFields<AliasFormValues>();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-sm'>
        <DialogHeader>
          <DialogTitle>Nuevo alias</DialogTitle>
          <DialogDescription>Nombre interno, glosa bancaria o variante de escritura.</DialogDescription>
        </DialogHeader>
        <form.AppForm>
          <form.Form id='alias-form' className='space-y-3'>
            <FormTextField name='alias' label='Alias' required placeholder='Ej: Transportes JP' />
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

export function ProveedorAliasCard({ proveedorId, alias }: { proveedorId: number; alias: ProveedorAlias[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (aliasId: number) => proveedoresService.eliminarAlias(proveedorId, aliasId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: proveedoresKeys.detail(proveedorId) });
    },
    onError: (e: Error) => toast.error(e.message || 'No se pudo eliminar el alias')
  });

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between'>
        <div>
          <CardTitle className='text-base'>Alias</CardTitle>
          {/* RN-PRV-02: la búsqueda encuentra por alias en una sola consulta. */}
          <CardDescription>Sin límite. Ayudan a encontrar al proveedor al recibir una factura.</CardDescription>
        </div>
        <Button type='button' variant='outline' size='sm' onClick={() => setDialogOpen(true)}>
          <Icons.add className='mr-1 h-4 w-4' />
          Agregar
        </Button>
      </CardHeader>
      <CardContent>
        {alias.length === 0 && <p className='text-muted-foreground text-sm'>Sin alias registrados.</p>}
        <div className='flex flex-wrap gap-2'>
          {alias.map((a) => (
            <Badge key={a.id} variant='outline' className='gap-1 pr-1'>
              {a.alias}
              <button
                type='button'
                onClick={() => deleteMutation.mutate(a.id)}
                className='hover:text-destructive ml-1'
                title='Eliminar alias'
              >
                <Icons.close className='h-3 w-3' />
              </button>
            </Badge>
          ))}
        </div>
      </CardContent>
      <AliasDialog proveedorId={proveedorId} open={dialogOpen} onOpenChange={setDialogOpen} />
    </Card>
  );
}
