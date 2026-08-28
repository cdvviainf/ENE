'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { useAppForm, useFormFields } from '@/components/ui/tanstack-form';
import { QuickCreateTrigger } from '@/components/shared/quick-create-trigger';
import { tiposServicioKeys } from '../queries';
import { tiposServicioService } from '../service';
import { MODELO_TARIFA_LABELS, type ModeloTarifa, type TipoServicio } from '../types';

const tipoServicioQuickSchema = z.object({
  codigo: z.string().min(1, 'Requerido').max(20).trim().toUpperCase(),
  nombre: z.string().min(1, 'Requerido').max(60).trim(),
  modeloTarifaDefault: z.enum(['TRAMO_PAX', 'ACOMODACION', 'UNITARIO_PAX']),
  ventanaAvisoDias: z.coerce.number().int().min(1).max(365)
});

type TipoServicioQuickValues = z.infer<typeof tipoServicioQuickSchema>;

const MODELO_OPTIONS = (Object.keys(MODELO_TARIFA_LABELS) as ModeloTarifa[]).map((value) => ({
  value,
  label: MODELO_TARIFA_LABELS[value]
}));

function TipoServicioQuickForm({ close, onCreated }: { close: () => void; onCreated: (tipo: TipoServicio) => void }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: TipoServicioQuickValues) => tiposServicioService.create(values),
    onSuccess: (nuevo) => {
      queryClient.invalidateQueries({ queryKey: tiposServicioKeys.all });
      toast.success(`Tipo de servicio "${nuevo.nombre}" creado`);
      onCreated(nuevo);
      close();
    },
    onError: (e: Error) => toast.error(e.message || 'Error al crear el tipo de servicio')
  });

  const form = useAppForm({
    defaultValues: {
      codigo: '',
      nombre: '',
      modeloTarifaDefault: 'TRAMO_PAX',
      ventanaAvisoDias: 30
    } as TipoServicioQuickValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: tipoServicioQuickSchema as any },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    }
  });

  const { FormTextField, FormSelectField } = useFormFields<TipoServicioQuickValues>();

  return (
    <form.AppForm>
      <form.Form id='tipo-servicio-quick-form' className='space-y-3'>
        <FormTextField name='codigo' label='Código' required placeholder='Ej: ENTRADAS' />
        <FormTextField name='nombre' label='Nombre' required placeholder='Ej: Entradas y visitas' />
        <FormSelectField
          name='modeloTarifaDefault'
          label='Modelo de tarifa'
          required
          options={MODELO_OPTIONS}
          placeholder='Seleccionar...'
        />
        <FormTextField name='ventanaAvisoDias' label='Ventana de aviso (días)' type='number' required />
        <div className='flex justify-end gap-2 pt-2'>
          <Button type='button' variant='outline' onClick={close}>
            Cancelar
          </Button>
          <Button type='submit' isLoading={mutation.isPending}>
            <Icons.check className='mr-1 h-4 w-4' />
            Crear
          </Button>
        </div>
      </form.Form>
    </form.AppForm>
  );
}

export function TipoServicioQuickCreate({ onCreated }: { onCreated: (tipo: TipoServicio) => void }) {
  return (
    <QuickCreateTrigger
      itemMenu='TIPOS_SERVICIO'
      titulo='Nuevo tipo de servicio'
      descripcion='Queda disponible de inmediato en el selector.'
      triggerTitle='Crear nuevo tipo de servicio'
    >
      {({ close }) => <TipoServicioQuickForm close={close} onCreated={onCreated} />}
    </QuickCreateTrigger>
  );
}
