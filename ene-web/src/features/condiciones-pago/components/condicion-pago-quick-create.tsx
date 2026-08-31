'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { useAppForm, useFormFields } from '@/components/ui/tanstack-form';
import { QuickCreateTrigger } from '@/components/shared/quick-create-trigger';
import { condicionesPagoKeys } from '../queries';
import { condicionesPagoService } from '../service';
import type { CondicionPago, CondicionPagoCuotaInput } from '../types';
import { CuotasEditor, cuotasValidas, CUOTA_CONTADO } from './condicion-pago-form';

const condicionPagoQuickSchema = z.object({
  codigo: z.string().min(1, 'Requerido').max(20).trim().toUpperCase(),
  nombre: z.string().min(1, 'Requerido').max(80).trim()
});

type CondicionPagoQuickValues = z.infer<typeof condicionPagoQuickSchema>;

function CondicionPagoQuickForm({ close, onCreated }: { close: () => void; onCreated: (condicionPago: CondicionPago) => void }) {
  const queryClient = useQueryClient();
  const [cuotas, setCuotas] = useState<CondicionPagoCuotaInput[]>([{ ...CUOTA_CONTADO }]);

  const mutation = useMutation({
    mutationFn: (values: CondicionPagoQuickValues) => condicionesPagoService.create({ ...values, cuotas }),
    onSuccess: (nueva) => {
      queryClient.invalidateQueries({ queryKey: condicionesPagoKeys.all });
      toast.success(`Condición de pago "${nueva.nombre}" creada`);
      onCreated(nueva);
      close();
    },
    onError: (e: Error) => toast.error(e.message || 'Error al crear la condición de pago')
  });

  const form = useAppForm({
    defaultValues: { codigo: '', nombre: '' } as CondicionPagoQuickValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: condicionPagoQuickSchema as any },
    onSubmit: async ({ value }) => {
      if (!cuotasValidas(cuotas)) return;
      await mutation.mutateAsync(value);
    }
  });

  const { FormTextField } = useFormFields<CondicionPagoQuickValues>();

  return (
    <form.AppForm>
      <form.Form id='condicion-pago-quick-form' className='space-y-3'>
        <FormTextField name='codigo' label='Código' required placeholder='Ej: CONTADO' />
        <FormTextField name='nombre' label='Nombre' required placeholder='Ej: Contado' />
        <CuotasEditor cuotas={cuotas} onChange={setCuotas} />
        <div className='flex justify-end gap-2 pt-2'>
          <Button type='button' variant='outline' onClick={close}>
            Cancelar
          </Button>
          <Button type='submit' isLoading={mutation.isPending} disabled={!cuotasValidas(cuotas)}>
            <Icons.check className='mr-1 h-4 w-4' />
            Crear condición de pago
          </Button>
        </div>
      </form.Form>
    </form.AppForm>
  );
}

export function CondicionPagoQuickCreate({ onCreated }: { onCreated: (condicionPago: CondicionPago) => void }) {
  return (
    <QuickCreateTrigger
      itemMenu='CONDICIONES_PAGO'
      titulo='Nueva condición de pago'
      descripcion='Queda disponible de inmediato en el selector.'
      triggerTitle='Crear nueva condición de pago'
    >
      {({ close }) => <CondicionPagoQuickForm close={close} onCreated={onCreated} />}
    </QuickCreateTrigger>
  );
}
