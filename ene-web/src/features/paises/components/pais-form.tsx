'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { useAppForm, useFormFields } from '@/components/ui/tanstack-form';
import { usePuedeEscribir } from '@/hooks/use-item-acceso';
import { SoloLectura } from '@/components/shared/solo-lectura';
import { paisDetailOptions, paisesKeys } from '../queries';
import { paisesService } from '../service';

// RN-GEO-02: `esPaisNacional` es un hecho estructural fijado por el seed
// (Chile), no un campo editable — no viaja en el schema del formulario ni en
// el payload. Se muestra solo como indicador de lectura en modo edición.
const paisSchema = z.object({
  codigo: z.string().min(1, 'El código es requerido').max(10).trim().toUpperCase(),
  nombre: z.string().min(1, 'El nombre es requerido').max(80).trim()
});

type PaisFormValues = z.infer<typeof paisSchema>;

interface PaisFormProps {
  paisId?: number;
}

export function PaisForm({ paisId }: PaisFormProps) {
  const isEdit = !!paisId;
  const router = useRouter();
  const queryClient = useQueryClient();
  const puedeEscribir = usePuedeEscribir('PAISES');

  const { data: pais, isLoading } = useQuery(paisDetailOptions(paisId ?? 0));

  const mutation = useMutation({
    mutationFn: (values: PaisFormValues) =>
      isEdit ? paisesService.update(paisId!, values) : paisesService.create(values),
    onSuccess: () => {
      toast.success(isEdit ? 'País actualizado correctamente' : 'País creado correctamente');
      queryClient.invalidateQueries({ queryKey: paisesKeys.all });
      router.push('/config/paises');
    },
    onError: (e: Error) => toast.error(e.message || 'Error al guardar el país')
  });

  const form = useAppForm({
    defaultValues: { codigo: '', nombre: '' } as PaisFormValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: paisSchema as any },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    }
  });

  useEffect(() => {
    if (pais) {
      form.setFieldValue('codigo', pais.codigo);
      form.setFieldValue('nombre', pais.nombre);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pais]);

  const { FormTextField } = useFormFields<PaisFormValues>();

  if (isEdit && isLoading) {
    return (
      <div className='space-y-4'>
        <div className='bg-muted h-10 animate-pulse rounded' />
        <div className='bg-muted h-10 animate-pulse rounded' />
      </div>
    );
  }

  if (!puedeEscribir) {
    return <SoloLectura mensaje='Tu perfil solo tiene acceso de lectura a Mantenedores. No puedes crear ni editar países.' />;
  }

  return (
    <form.AppForm>
      <form.Form id='pais-form' className='space-y-6'>
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Datos del país</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid gap-4 sm:grid-cols-2'>
              <FormTextField name='codigo' label='Código' required placeholder='Ej: CHL' disabled={isEdit} />
              <FormTextField name='nombre' label='Nombre' required placeholder='Ej: Chile' />
            </div>
            {isEdit && pais?.esPaisNacional && (
              <div className='flex items-center gap-2'>
                <Badge variant='outline'>País nacional</Badge>
                <p className='text-muted-foreground text-sm'>
                  Las direcciones de este país exigen comuna (RN-GEO-02). No es editable.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className='flex items-center justify-end gap-3'>
          <Button type='button' variant='outline' onClick={() => router.push('/config/paises')}>
            Cancelar
          </Button>
          <Button type='submit' isLoading={mutation.isPending}>
            <Icons.check className='mr-2 h-4 w-4' />
            {isEdit ? 'Guardar cambios' : 'Crear país'}
          </Button>
        </div>
      </form.Form>
    </form.AppForm>
  );
}
