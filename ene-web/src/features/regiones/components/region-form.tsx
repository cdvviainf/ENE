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
import { regionDetailOptions, regionesKeys } from '../queries';
import { regionesService } from '../service';

const regionSchema = z.object({
  codigo: z.string().min(1, 'El código es requerido').max(10).trim().toUpperCase(),
  nombre: z.string().min(1, 'El nombre es requerido').max(80).trim()
});

type RegionFormValues = z.infer<typeof regionSchema>;

interface RegionFormProps {
  regionId?: number;
}

export function RegionForm({ regionId }: RegionFormProps) {
  const isEdit = !!regionId;
  const router = useRouter();
  const queryClient = useQueryClient();
  const puedeEscribir = usePuedeEscribir('REGIONES');

  const { data: region, isLoading } = useQuery(regionDetailOptions(regionId ?? 0));

  const mutation = useMutation({
    mutationFn: (values: RegionFormValues) =>
      isEdit ? regionesService.update(regionId!, values) : regionesService.create(values),
    onSuccess: () => {
      toast.success(isEdit ? 'Región actualizada correctamente' : 'Región creada correctamente');
      queryClient.invalidateQueries({ queryKey: regionesKeys.all });
      router.push('/config/regiones');
    },
    onError: (e: Error) => toast.error(e.message || 'Error al guardar la región')
  });

  const form = useAppForm({
    defaultValues: { codigo: '', nombre: '' } as RegionFormValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: regionSchema as any },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    }
  });

  useEffect(() => {
    if (region) {
      form.setFieldValue('codigo', region.codigo);
      form.setFieldValue('nombre', region.nombre);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region]);

  const { FormTextField } = useFormFields<RegionFormValues>();

  if (isEdit && isLoading) {
    return (
      <div className='space-y-4'>
        <div className='bg-muted h-10 animate-pulse rounded' />
        <div className='bg-muted h-10 animate-pulse rounded' />
      </div>
    );
  }

  if (!puedeEscribir) {
    return <SoloLectura mensaje='Tu perfil solo tiene acceso de lectura a Mantenedores. No puedes crear ni editar regiones.' />;
  }

  return (
    <form.AppForm>
      <form.Form id='region-form' className='space-y-6'>
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Datos de la región</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid gap-4 sm:grid-cols-2'>
              <FormTextField name='codigo' label='Código' required placeholder='Ej: II' disabled={isEdit} />
              <FormTextField name='nombre' label='Nombre' required placeholder='Ej: Antofagasta' />
            </div>
          </CardContent>
        </Card>

        <div className='flex items-center justify-end gap-3'>
          <Button type='button' variant='outline' onClick={() => router.push('/config/regiones')}>
            Cancelar
          </Button>
          <Button type='submit' isLoading={mutation.isPending}>
            <Icons.check className='mr-2 h-4 w-4' />
            {isEdit ? 'Guardar cambios' : 'Crear región'}
          </Button>
        </div>
      </form.Form>
    </form.AppForm>
  );
}
