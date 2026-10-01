'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { useAppForm, useFormFields } from '@/components/ui/tanstack-form';
import { QuickCreateTrigger } from '@/components/shared/quick-create-trigger';
import { gruposKeys } from '../queries';
import { gruposService } from '../service';
import type { Grupo } from '../types';

// Formulario reducido RN-QC-06/RN-QC-08 (Docs/mantenedores.md §8): solo los
// obligatorios de RN-GRP-05 (codigo, apellido, cantidadPax). El cliente se
// hereda del contexto donde se abre el QuickCreate (p. ej. la cotización).
const grupoQuickSchema = z.object({
  codigo: z.string().min(1, 'Requerido').max(20).trim(),
  apellido: z.string().min(1, 'Requerido').max(80).trim(),
  cantidadPax: z.coerce.number().int().min(1)
});

type GrupoQuickValues = z.infer<typeof grupoQuickSchema>;

function GrupoQuickForm({
  close,
  onCreated,
  clienteId
}: {
  close: () => void;
  onCreated: (grupo: Grupo) => void;
  clienteId?: number | null;
}) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: GrupoQuickValues) =>
      gruposService.create({ ...values, clienteId: clienteId ?? undefined }),
    onSuccess: (nuevo) => {
      queryClient.invalidateQueries({ queryKey: gruposKeys.all });
      toast.success(`Grupo "${nuevo.apellido}" creado`);
      onCreated(nuevo);
      close();
    },
    onError: (e: Error) => toast.error(e.message || 'Error al crear el grupo')
  });

  const { data: codigoSugerido } = useQuery({
    queryKey: ['grupos', 'siguiente-codigo'],
    queryFn: () => gruposService.siguienteCodigo(),
    staleTime: 0
  });

  const form = useAppForm({
    defaultValues: { codigo: '', apellido: '', cantidadPax: 1 } as GrupoQuickValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: grupoQuickSchema as any },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    }
  });

  useEffect(() => {
    if (codigoSugerido) form.setFieldValue('codigo', codigoSugerido);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigoSugerido]);

  const { FormTextField } = useFormFields<GrupoQuickValues>();

  return (
    <form.AppForm>
      <form.Form id='grupo-quick-form' className='space-y-3'>
        <FormTextField name='codigo' label='Código' required placeholder='Ej: GR0001' />
        <FormTextField name='apellido' label='Apellido del grupo' required placeholder='Ej: Familia Pérez' />
        <FormTextField name='cantidadPax' label='Cantidad de pasajeros' type='number' required className='w-28' />
        <div className='flex justify-end gap-2 pt-2'>
          <Button type='button' variant='outline' onClick={close}>
            Cancelar
          </Button>
          <Button type='submit' isLoading={mutation.isPending}>
            <Icons.check className='mr-1 h-4 w-4' />
            Crear grupo
          </Button>
        </div>
      </form.Form>
    </form.AppForm>
  );
}

export function GrupoQuickCreate({
  onCreated,
  clienteId
}: {
  onCreated: (grupo: Grupo) => void;
  clienteId?: number | null;
}) {
  return (
    <QuickCreateTrigger
      itemMenu='GRUPOS'
      titulo='Nuevo grupo'
      descripcion='Queda disponible de inmediato en el selector.'
      triggerTitle='Crear nuevo grupo'
    >
      {({ close }) => <GrupoQuickForm close={close} onCreated={onCreated} clienteId={clienteId} />}
    </QuickCreateTrigger>
  );
}
