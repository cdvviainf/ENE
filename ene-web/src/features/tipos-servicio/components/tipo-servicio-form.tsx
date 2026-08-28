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
import { tipoServicioDetailOptions, tiposServicioKeys } from '../queries';
import { tiposServicioService } from '../service';
import { MODELO_TARIFA_LABELS, type ModeloTarifa } from '../types';

const tipoServicioSchema = z.object({
  codigo: z.string().min(1, 'El código es requerido').max(20).trim().toUpperCase(),
  nombre: z.string().min(1, 'El nombre es requerido').max(60).trim(),
  modeloTarifaDefault: z.enum(['TRAMO_PAX', 'ACOMODACION', 'UNITARIO_PAX']),
  ventanaAvisoDias: z.coerce.number().int().min(1).max(365)
});

type TipoServicioFormValues = z.infer<typeof tipoServicioSchema>;

const MODELO_OPTIONS = (Object.keys(MODELO_TARIFA_LABELS) as ModeloTarifa[]).map((value) => ({
  value,
  label: MODELO_TARIFA_LABELS[value]
}));

interface TipoServicioFormProps {
  tipoServicioId?: number;
}

export function TipoServicioForm({ tipoServicioId }: TipoServicioFormProps) {
  const isEdit = !!tipoServicioId;
  const router = useRouter();
  const queryClient = useQueryClient();
  const puedeEscribir = usePuedeEscribir('TIPOS_SERVICIO');

  const { data: tipo, isLoading } = useQuery(tipoServicioDetailOptions(tipoServicioId ?? 0));

  const mutation = useMutation({
    mutationFn: (values: TipoServicioFormValues) =>
      isEdit ? tiposServicioService.update(tipoServicioId!, values) : tiposServicioService.create(values),
    onSuccess: () => {
      toast.success(isEdit ? 'Tipo de servicio actualizado' : 'Tipo de servicio creado');
      queryClient.invalidateQueries({ queryKey: tiposServicioKeys.all });
      router.push('/config/tipos-servicio');
    },
    onError: (e: Error) => toast.error(e.message || 'Error al guardar el tipo de servicio')
  });

  const form = useAppForm({
    defaultValues: {
      codigo: '',
      nombre: '',
      modeloTarifaDefault: 'TRAMO_PAX',
      ventanaAvisoDias: 30
    } as TipoServicioFormValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: tipoServicioSchema as any },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    }
  });

  useEffect(() => {
    if (tipo) {
      form.setFieldValue('codigo', tipo.codigo);
      form.setFieldValue('nombre', tipo.nombre);
      form.setFieldValue('modeloTarifaDefault', tipo.modeloTarifaDefault);
      form.setFieldValue('ventanaAvisoDias', tipo.ventanaAvisoDias);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo]);

  const { FormTextField, FormSelectField } = useFormFields<TipoServicioFormValues>();

  if (isEdit && isLoading) {
    return (
      <div className='space-y-4'>
        <div className='bg-muted h-10 animate-pulse rounded' />
        <div className='bg-muted h-10 animate-pulse rounded' />
      </div>
    );
  }

  if (!puedeEscribir) {
    return (
      <SoloLectura mensaje='Tu perfil solo tiene acceso de lectura a Mantenedores. No puedes crear ni editar tipos de servicio.' />
    );
  }

  return (
    <form.AppForm>
      <form.Form id='tipo-servicio-form' className='space-y-6'>
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Datos del tipo de servicio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid gap-4 sm:grid-cols-2'>
              <FormTextField name='codigo' label='Código' required placeholder='Ej: ALOJAMIENTO' disabled={isEdit} />
              <FormTextField name='nombre' label='Nombre' required placeholder='Ej: Alojamiento' />
              <FormSelectField
                name='modeloTarifaDefault'
                label='Modelo de tarifa por defecto'
                required
                options={MODELO_OPTIONS}
                placeholder='Seleccionar modelo...'
              />
              <FormTextField
                name='ventanaAvisoDias'
                label='Ventana de aviso (días)'
                type='number'
                required
                placeholder='30'
              />
            </div>
          </CardContent>
        </Card>

        <div className='flex items-center justify-end gap-3'>
          <Button type='button' variant='outline' onClick={() => router.push('/config/tipos-servicio')}>
            Cancelar
          </Button>
          <Button type='submit' isLoading={mutation.isPending}>
            <Icons.check className='mr-2 h-4 w-4' />
            {isEdit ? 'Guardar cambios' : 'Crear tipo de servicio'}
          </Button>
        </div>
      </form.Form>
    </form.AppForm>
  );
}
