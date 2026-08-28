'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { useAppForm, useFormFields } from '@/components/ui/tanstack-form';
import { QuickCreateTrigger } from '@/components/shared/quick-create-trigger';
import { zonasKeys } from '../queries';
import { zonasService } from '../service';
import type { Zona } from '../types';

// Formulario reducido RN-QC-06/RN-QC-08 (Docs/mantenedores.md §8): solo
// código y nombre, el resto se completa después en el mantenedor completo.
const zonaQuickSchema = z.object({
  codigo: z.string().min(1, 'Requerido').max(10).trim().toUpperCase(),
  nombre: z.string().min(1, 'Requerido').max(80).trim()
});

type ZonaQuickValues = z.infer<typeof zonaQuickSchema>;

// Componente propio (no una función inline) para que sus hooks vivan en su
// propio ciclo de montaje/desmontaje — evita el error de "hooks condicionales"
// que se dispararía si useMutation/useAppForm se llamaran directo dentro del
// render-prop `children` de QuickCreateTrigger.
function ZonaQuickForm({ close, onCreated }: { close: () => void; onCreated: (zona: Zona) => void }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: ZonaQuickValues) => zonasService.create(values),
    onSuccess: (nueva) => {
      queryClient.invalidateQueries({ queryKey: zonasKeys.all });
      toast.success(`Zona "${nueva.nombre}" creada`);
      onCreated(nueva);
      close();
    },
    onError: (e: Error) => toast.error(e.message || 'Error al crear la zona')
  });

  const form = useAppForm({
    defaultValues: { codigo: '', nombre: '' } as ZonaQuickValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: zonaQuickSchema as any },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    }
  });

  const { FormTextField } = useFormFields<ZonaQuickValues>();

  return (
    <form.AppForm>
      <form.Form id='zona-quick-form' className='space-y-3'>
        <FormTextField name='codigo' label='Código' required placeholder='Ej: SPA' />
        <FormTextField name='nombre' label='Nombre' required placeholder='Ej: San Pedro de Atacama' />
        <div className='flex justify-end gap-2 pt-2'>
          <Button type='button' variant='outline' onClick={close}>
            Cancelar
          </Button>
          <Button type='submit' isLoading={mutation.isPending}>
            <Icons.check className='mr-1 h-4 w-4' />
            Crear zona
          </Button>
        </div>
      </form.Form>
    </form.AppForm>
  );
}

export function ZonaQuickCreate({ onCreated }: { onCreated: (zona: Zona) => void }) {
  return (
    <QuickCreateTrigger
      itemMenu='ZONAS'
      titulo='Nueva zona'
      descripcion='La zona queda disponible de inmediato en el selector.'
      triggerTitle='Crear nueva zona'
    >
      {({ close }) => <ZonaQuickForm close={close} onCreated={onCreated} />}
    </QuickCreateTrigger>
  );
}
