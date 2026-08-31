'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { useAppForm, useFormFields } from '@/components/ui/tanstack-form';
import { QuickCreateTrigger } from '@/components/shared/quick-create-trigger';
import { paisesKeys } from '../queries';
import { paisesService } from '../service';
import type { Pais } from '../types';

// Formulario reducido RN-QC-06/RN-QC-08: solo código y nombre. Un país creado
// al vuelo desde un formulario de Dirección nunca es el país nacional —
// Chile ya viene sembrado con `esPaisNacional=true`.
const paisQuickSchema = z.object({
  codigo: z.string().min(1, 'Requerido').max(10).trim().toUpperCase(),
  nombre: z.string().min(1, 'Requerido').max(80).trim()
});

type PaisQuickValues = z.infer<typeof paisQuickSchema>;

// Componente propio (no una función inline) para que sus hooks vivan en su
// propio ciclo de montaje/desmontaje — evita el error de "hooks condicionales"
// que se dispararía si useMutation/useAppForm se llamaran directo dentro del
// render-prop `children` de QuickCreateTrigger.
function PaisQuickForm({ close, onCreated }: { close: () => void; onCreated: (pais: Pais) => void }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: PaisQuickValues) => paisesService.create(values),
    onSuccess: (nuevo) => {
      queryClient.invalidateQueries({ queryKey: paisesKeys.all });
      toast.success(`País "${nuevo.nombre}" creado`);
      onCreated(nuevo);
      close();
    },
    onError: (e: Error) => toast.error(e.message || 'Error al crear el país')
  });

  const form = useAppForm({
    defaultValues: { codigo: '', nombre: '' } as PaisQuickValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: paisQuickSchema as any },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    }
  });

  const { FormTextField } = useFormFields<PaisQuickValues>();

  return (
    <form.AppForm>
      <form.Form id='pais-quick-form' className='space-y-3'>
        <FormTextField name='codigo' label='Código' required placeholder='Ej: CHL' />
        <FormTextField name='nombre' label='Nombre' required placeholder='Ej: Chile' />
        <div className='flex justify-end gap-2 pt-2'>
          <Button type='button' variant='outline' onClick={close}>
            Cancelar
          </Button>
          <Button type='submit' isLoading={mutation.isPending}>
            <Icons.check className='mr-1 h-4 w-4' />
            Crear país
          </Button>
        </div>
      </form.Form>
    </form.AppForm>
  );
}

export function PaisQuickCreate({ onCreated }: { onCreated: (pais: Pais) => void }) {
  return (
    <QuickCreateTrigger
      itemMenu='PAISES'
      titulo='Nuevo país'
      descripcion='El país queda disponible de inmediato en el selector.'
      triggerTitle='Crear nuevo país'
    >
      {({ close }) => <PaisQuickForm close={close} onCreated={onCreated} />}
    </QuickCreateTrigger>
  );
}
