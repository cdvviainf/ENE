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
import { zonaDetailOptions, zonasKeys } from '../queries';
import { zonasService } from '../service';

const zonaSchema = z.object({
  codigo: z.string().min(1, 'El código es requerido').max(10).trim().toUpperCase(),
  nombre: z.string().min(1, 'El nombre es requerido').max(80).trim(),
  nombreEn: z.string().max(80).trim().optional()
});

type ZonaFormValues = z.infer<typeof zonaSchema>;

interface ZonaFormProps {
  zonaId?: number;
}

export function ZonaForm({ zonaId }: ZonaFormProps) {
  const isEdit = !!zonaId;
  const router = useRouter();
  const queryClient = useQueryClient();
  const puedeEscribir = usePuedeEscribir('ZONAS');

  const { data: zona, isLoading } = useQuery(zonaDetailOptions(zonaId ?? 0));

  const mutation = useMutation({
    mutationFn: (values: ZonaFormValues) =>
      isEdit ? zonasService.update(zonaId!, values) : zonasService.create(values),
    onSuccess: () => {
      toast.success(isEdit ? 'Zona actualizada correctamente' : 'Zona creada correctamente');
      queryClient.invalidateQueries({ queryKey: zonasKeys.all });
      router.push('/config/zonas');
    },
    onError: (e: Error) => toast.error(e.message || 'Error al guardar la zona')
  });

  const form = useAppForm({
    defaultValues: { codigo: '', nombre: '', nombreEn: '' } as ZonaFormValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: zonaSchema as any },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    }
  });

  useEffect(() => {
    if (zona) {
      form.setFieldValue('codigo', zona.codigo);
      form.setFieldValue('nombre', zona.nombre);
      form.setFieldValue('nombreEn', zona.nombreEn ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zona]);

  const { FormTextField } = useFormFields<ZonaFormValues>();

  if (isEdit && isLoading) {
    return (
      <div className='space-y-4'>
        <div className='bg-muted h-10 animate-pulse rounded' />
        <div className='bg-muted h-10 animate-pulse rounded' />
      </div>
    );
  }

  if (!puedeEscribir) {
    return <SoloLectura mensaje='Tu perfil solo tiene acceso de lectura a Mantenedores. No puedes crear ni editar zonas.' />;
  }

  return (
    <form.AppForm>
      <form.Form id='zona-form' className='space-y-6'>
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Datos de la zona</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid gap-4 sm:grid-cols-2'>
              <FormTextField name='codigo' label='Código' required placeholder='Ej: SPA' disabled={isEdit} />
              <FormTextField name='nombre' label='Nombre' required placeholder='Ej: San Pedro de Atacama' />
              <FormTextField name='nombreEn' label='Nombre (inglés)' placeholder='Ej: San Pedro de Atacama' />
            </div>
          </CardContent>
        </Card>

        <div className='flex items-center justify-end gap-3'>
          <Button type='button' variant='outline' onClick={() => router.push('/config/zonas')}>
            Cancelar
          </Button>
          <Button type='submit' isLoading={mutation.isPending}>
            <Icons.check className='mr-2 h-4 w-4' />
            {isEdit ? 'Guardar cambios' : 'Crear zona'}
          </Button>
        </div>
      </form.Form>
    </form.AppForm>
  );
}
