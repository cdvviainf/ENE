'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { useAppForm, useFormFields } from '@/components/ui/tanstack-form';
import { QuickCreateTrigger } from '@/components/shared/quick-create-trigger';
import { negociosKeys } from '../queries';
import { negociosService } from '../service';
import type { Negocio } from '../types';

// Formulario reducido RN-QC-06/RN-QC-08 (Docs/mantenedores.md §8): solo los
// obligatorios de RN-GRP-05 (codigo, apellido, cantidadPax). El cliente se
// hereda del contexto donde se abre el QuickCreate (p. ej. la cotización).
const negocioQuickSchema = z.object({
  codigo: z.string().min(1, 'Requerido').max(20).trim(),
  apellido: z.string().min(1, 'Requerido').max(80).trim(),
  cantidadPax: z.coerce.number().int().min(1)
});

type NegocioQuickValues = z.infer<typeof negocioQuickSchema>;

function NegocioQuickForm({
  close,
  onCreated,
  clienteId
}: {
  close: () => void;
  onCreated: (negocio: Negocio) => void;
  clienteId?: number | null;
}) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: NegocioQuickValues) =>
      negociosService.create({ ...values, clienteId: clienteId ?? undefined }),
    onSuccess: (nuevo) => {
      queryClient.invalidateQueries({ queryKey: negociosKeys.all });
      toast.success(`Negocio "${nuevo.apellido}" creado`);
      onCreated(nuevo);
      close();
    },
    onError: (e: Error) => toast.error(e.message || 'Error al crear el negocio')
  });

  const { data: codigoSugerido } = useQuery({
    queryKey: ['negocios', 'siguiente-codigo'],
    queryFn: () => negociosService.siguienteCodigo(),
    staleTime: 0
  });

  const form = useAppForm({
    defaultValues: { codigo: '', apellido: '', cantidadPax: 1 } as NegocioQuickValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: negocioQuickSchema as any },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    }
  });

  useEffect(() => {
    if (codigoSugerido) form.setFieldValue('codigo', codigoSugerido);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigoSugerido]);

  const { FormTextField } = useFormFields<NegocioQuickValues>();

  return (
    <form.AppForm>
      <form.Form id='negocio-quick-form' className='space-y-3'>
        <FormTextField name='codigo' label='Código' required placeholder='Ej: GR0001' />
        <FormTextField name='apellido' label='Apellido del negocio' required placeholder='Ej: Familia Pérez' />
        <FormTextField name='cantidadPax' label='Cantidad de pasajeros' type='number' required className='w-28' />
        <div className='flex justify-end gap-2 pt-2'>
          <Button type='button' variant='outline' onClick={close}>
            Cancelar
          </Button>
          <Button type='submit' isLoading={mutation.isPending}>
            <Icons.check className='mr-1 h-4 w-4' />
            Crear negocio
          </Button>
        </div>
      </form.Form>
    </form.AppForm>
  );
}

export function NegocioQuickCreate({
  onCreated,
  clienteId
}: {
  onCreated: (negocio: Negocio) => void;
  clienteId?: number | null;
}) {
  return (
    <QuickCreateTrigger
      itemMenu='NEGOCIOS'
      titulo='Nuevo negocio'
      descripcion='Queda disponible de inmediato en el selector.'
      triggerTitle='Crear nuevo negocio'
    >
      {({ close }) => <NegocioQuickForm close={close} onCreated={onCreated} clienteId={clienteId} />}
    </QuickCreateTrigger>
  );
}
