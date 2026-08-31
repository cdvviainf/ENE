'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { useAppForm, useFormFields } from '@/components/ui/tanstack-form';
import { usePuedeEscribir } from '@/hooks/use-item-acceso';
import { SoloLectura } from '@/components/shared/solo-lectura';
import { formaPagoDetailOptions, formasPagoKeys } from '../queries';
import { formasPagoService } from '../service';

const formaPagoSchema = z.object({
  codigo: z.string().min(1, 'El código es requerido').max(20).trim().toUpperCase(),
  nombre: z.string().min(1, 'El nombre es requerido').max(80).trim()
});

type FormaPagoFormValues = z.infer<typeof formaPagoSchema>;

interface FormaPagoFormProps {
  formaPagoId?: number;
}

export function FormaPagoForm({ formaPagoId }: FormaPagoFormProps) {
  const isEdit = !!formaPagoId;
  const router = useRouter();
  const queryClient = useQueryClient();
  const puedeEscribir = usePuedeEscribir('FORMAS_PAGO');

  const { data: formaPago, isLoading } = useQuery(formaPagoDetailOptions(formaPagoId ?? 0));

  const mutation = useMutation({
    mutationFn: (values: FormaPagoFormValues) =>
      isEdit ? formasPagoService.update(formaPagoId!, values) : formasPagoService.create(values),
    onSuccess: () => {
      toast.success(isEdit ? 'Forma de pago actualizada correctamente' : 'Forma de pago creada correctamente');
      queryClient.invalidateQueries({ queryKey: formasPagoKeys.all });
      router.push('/config/formas-pago');
    },
    onError: (e: Error) => toast.error(e.message || 'Error al guardar la forma de pago')
  });

  const form = useAppForm({
    defaultValues: { codigo: '', nombre: '' } as FormaPagoFormValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: formaPagoSchema as any },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    }
  });

  useEffect(() => {
    if (formaPago) {
      form.setFieldValue('codigo', formaPago.codigo);
      form.setFieldValue('nombre', formaPago.nombre);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formaPago]);

  const { FormTextField } = useFormFields<FormaPagoFormValues>();

  if (isEdit && isLoading) {
    return (
      <div className='space-y-4'>
        <div className='bg-muted h-10 animate-pulse rounded' />
        <div className='bg-muted h-10 animate-pulse rounded' />
      </div>
    );
  }

  if (!puedeEscribir) {
    return <SoloLectura mensaje='Tu perfil solo tiene acceso de lectura a Mantenedores. No puedes crear ni editar formas de pago.' />;
  }

  return (
    <form.AppForm>
      <form.Form id='forma-pago-form' className='space-y-6'>
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Datos de la forma de pago</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid gap-4 sm:grid-cols-2'>
              <FormTextField name='codigo' label='Código' required placeholder='Ej: TRANSFERENCIA_CLP' disabled={isEdit} />
              <FormTextField name='nombre' label='Nombre' required placeholder='Ej: Transferencia bancaria CLP' />
            </div>
          </CardContent>
        </Card>

        <div className='flex items-center justify-end gap-3'>
          <Button type='button' variant='outline' onClick={() => router.push('/config/formas-pago')}>
            Cancelar
          </Button>
          <Button type='submit' isLoading={mutation.isPending}>
            <Icons.check className='mr-2 h-4 w-4' />
            {isEdit ? 'Guardar cambios' : 'Crear forma de pago'}
          </Button>
        </div>
      </form.Form>
    </form.AppForm>
  );
}
