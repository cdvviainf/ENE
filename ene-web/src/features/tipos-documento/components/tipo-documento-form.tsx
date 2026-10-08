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
import { fraccionAPorcentaje, porcentajeAFraccion } from '@/lib/porcentaje';
import { tipoDocumentoDetailOptions, tiposDocumentoKeys } from '../queries';
import { tiposDocumentoService } from '../service';
import { FORMA_CALCULO_LABELS, type FormaCalculo } from '../types';

const tipoDocumentoSchema = z.object({
  codigo: z
    .string()
    .min(1, 'El código es requerido')
    .max(20)
    .trim()
    .toUpperCase()
    .regex(/^\S+$/, 'El código no puede contener espacios'),
  nombre: z.string().min(1, 'El nombre es requerido').max(80).trim(),
  formaCalculo: z.enum(['NINGUNO', 'IVA', 'RETENCION']),
  // El % se edita como número en la UI y se persiste como fracción 0..1.
  porcentajePct: z.coerce.number().min(0).max(100).default(0)
});

type TipoDocumentoFormValues = z.infer<typeof tipoDocumentoSchema>;

const FORMA_CALCULO_OPTIONS = (Object.keys(FORMA_CALCULO_LABELS) as FormaCalculo[]).map((value) => ({
  value,
  label: FORMA_CALCULO_LABELS[value]
}));

interface TipoDocumentoFormProps {
  tipoDocumentoId?: number;
}

export function TipoDocumentoForm({ tipoDocumentoId }: TipoDocumentoFormProps) {
  const isEdit = !!tipoDocumentoId;
  const router = useRouter();
  const queryClient = useQueryClient();
  const puedeEscribir = usePuedeEscribir('TIPOS_DOCUMENTO');

  const { data: tipoDocumento, isLoading } = useQuery(tipoDocumentoDetailOptions(tipoDocumentoId ?? 0));

  const mutation = useMutation({
    mutationFn: (values: TipoDocumentoFormValues) => {
      const { porcentajePct, formaCalculo, ...resto } = values;
      // RN-DIN-01: el porcentaje viaja como fracción (0.19), nunca como "%".
      // Sin forma de cálculo el porcentaje no aplica → 0.
      const porcentaje = formaCalculo === 'NINGUNO' ? 0 : Number(porcentajeAFraccion(String(porcentajePct)) || '0');
      const payload = { ...resto, formaCalculo, porcentaje };
      return isEdit ? tiposDocumentoService.update(tipoDocumentoId!, payload) : tiposDocumentoService.create(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Tipo de documento actualizado correctamente' : 'Tipo de documento creado correctamente');
      queryClient.invalidateQueries({ queryKey: tiposDocumentoKeys.all });
      router.push('/config/tipos-documento');
    },
    onError: (e: Error) => toast.error(e.message || 'Error al guardar el tipo de documento')
  });

  const form = useAppForm({
    defaultValues: {
      codigo: '',
      nombre: '',
      formaCalculo: 'NINGUNO',
      porcentajePct: 0
    } as TipoDocumentoFormValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: tipoDocumentoSchema as any },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    }
  });

  useEffect(() => {
    if (tipoDocumento) {
      form.setFieldValue('codigo', tipoDocumento.codigo);
      form.setFieldValue('nombre', tipoDocumento.nombre);
      form.setFieldValue('formaCalculo', tipoDocumento.formaCalculo);
      form.setFieldValue('porcentajePct', Number(fraccionAPorcentaje(String(tipoDocumento.porcentaje)) || '0'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoDocumento]);

  const { FormTextField, FormSelectField } = useFormFields<TipoDocumentoFormValues>();

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
      <SoloLectura mensaje='Tu perfil solo tiene acceso de lectura a Mantenedores. No puedes crear ni editar tipos de documento.' />
    );
  }

  return (
    <form.AppForm>
      <form.Form id='tipo-documento-form' className='space-y-6'>
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Datos del tipo de documento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid gap-4 sm:grid-cols-2'>
              <FormTextField name='codigo' label='Código' required placeholder='Ej: FACTURA_AFECTA' disabled={isEdit} />
              <FormTextField name='nombre' label='Nombre' required placeholder='Ej: Factura afecta' />
              <FormSelectField
                name='formaCalculo'
                label='Forma de cálculo'
                required
                options={FORMA_CALCULO_OPTIONS}
                placeholder='Seleccionar...'
              />
              <form.Subscribe selector={(state) => state.values.formaCalculo}>
                {(formaCalculo) => (
                  <FormTextField
                    name='porcentajePct'
                    label='Porcentaje (%)'
                    type='number'
                    placeholder='19'
                    disabled={formaCalculo === 'NINGUNO'}
                    description='Ej: 19 para 19%. Se guarda como fracción (0,19).'
                  />
                )}
              </form.Subscribe>
            </div>
          </CardContent>
        </Card>

        <div className='flex items-center justify-end gap-3'>
          <Button type='button' variant='outline' onClick={() => router.push('/config/tipos-documento')}>
            Cancelar
          </Button>
          <Button type='submit' isLoading={mutation.isPending}>
            <Icons.check className='mr-2 h-4 w-4' />
            {isEdit ? 'Guardar cambios' : 'Crear tipo de documento'}
          </Button>
        </div>
      </form.Form>
    </form.AppForm>
  );
}
