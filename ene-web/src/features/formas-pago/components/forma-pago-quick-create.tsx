'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { useAppForm, useFormFields } from '@/components/ui/tanstack-form';
import { QuickCreateTrigger } from '@/components/shared/quick-create-trigger';
import { formasPagoKeys } from '../queries';
import { formasPagoService } from '../service';
import type { FormaPago } from '../types';

// Formulario reducido RN-QC-06/RN-QC-08: código y nombre son los únicos
// campos del mantenedor, así que el quick-create es idéntico al form
// completo salvo que no navega.
const formaPagoQuickSchema = z.object({
  codigo: z.string().min(1, 'Requerido').max(20).trim().toUpperCase(),
  nombre: z.string().min(1, 'Requerido').max(80).trim()
});

type FormaPagoQuickValues = z.infer<typeof formaPagoQuickSchema>;

// Componente propio (no una función inline) para que sus hooks vivan en su
// propio ciclo de montaje/desmontaje — evita el error de "hooks condicionales"
// que se dispararía si useMutation/useAppForm se llamaran directo dentro del
// render-prop `children` de QuickCreateTrigger.
function FormaPagoQuickForm({ close, onCreated }: { close: () => void; onCreated: (formaPago: FormaPago) => void }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: FormaPagoQuickValues) => formasPagoService.create(values),
    onSuccess: (nueva) => {
      queryClient.invalidateQueries({ queryKey: formasPagoKeys.all });
      toast.success(`Forma de pago "${nueva.nombre}" creada`);
      onCreated(nueva);
      close();
    },
    onError: (e: Error) => toast.error(e.message || 'Error al crear la forma de pago')
  });

  const form = useAppForm({
    defaultValues: { codigo: '', nombre: '' } as FormaPagoQuickValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: formaPagoQuickSchema as any },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    }
  });

  const { FormTextField } = useFormFields<FormaPagoQuickValues>();

  return (
    <form.AppForm>
      <form.Form id='forma-pago-quick-form' className='space-y-3'>
        <FormTextField name='codigo' label='Código' required placeholder='Ej: TRANSFERENCIA_CLP' />
        <FormTextField name='nombre' label='Nombre' required placeholder='Ej: Transferencia bancaria CLP' />
        <div className='flex justify-end gap-2 pt-2'>
          <Button type='button' variant='outline' onClick={close}>
            Cancelar
          </Button>
          <Button type='submit' isLoading={mutation.isPending}>
            <Icons.check className='mr-1 h-4 w-4' />
            Crear forma de pago
          </Button>
        </div>
      </form.Form>
    </form.AppForm>
  );
}

export function FormaPagoQuickCreate({ onCreated }: { onCreated: (formaPago: FormaPago) => void }) {
  return (
    <QuickCreateTrigger
      itemMenu='FORMAS_PAGO'
      titulo='Nueva forma de pago'
      descripcion='La forma de pago queda disponible de inmediato en el selector.'
      triggerTitle='Crear nueva forma de pago'
    >
      {({ close }) => <FormaPagoQuickForm close={close} onCreated={onCreated} />}
    </QuickCreateTrigger>
  );
}
