'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { useAppForm, useFormFields } from '@/components/ui/tanstack-form';
import { QuickCreateTrigger } from '@/components/shared/quick-create-trigger';
import { regionesKeys } from '../queries';
import { regionesService } from '../service';
import type { Region } from '../types';

// Formulario reducido RN-QC-06/RN-QC-08 (Docs/mantenedores.md §8): solo
// código y nombre, únicos campos de la región.
const regionQuickSchema = z.object({
  codigo: z.string().min(1, 'Requerido').max(10).trim().toUpperCase(),
  nombre: z.string().min(1, 'Requerido').max(80).trim()
});

type RegionQuickValues = z.infer<typeof regionQuickSchema>;

// Componente propio (no una función inline) para que sus hooks vivan en su
// propio ciclo de montaje/desmontaje — evita el error de "hooks condicionales"
// que se dispararía si useMutation/useAppForm se llamaran directo dentro del
// render-prop `children` de QuickCreateTrigger.
function RegionQuickForm({ close, onCreated }: { close: () => void; onCreated: (region: Region) => void }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: RegionQuickValues) => regionesService.create(values),
    onSuccess: (nueva) => {
      queryClient.invalidateQueries({ queryKey: regionesKeys.all });
      toast.success(`Región "${nueva.nombre}" creada`);
      onCreated(nueva);
      close();
    },
    onError: (e: Error) => toast.error(e.message || 'Error al crear la región')
  });

  const form = useAppForm({
    defaultValues: { codigo: '', nombre: '' } as RegionQuickValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: regionQuickSchema as any },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    }
  });

  const { FormTextField } = useFormFields<RegionQuickValues>();

  return (
    <form.AppForm>
      <form.Form id='region-quick-form' className='space-y-3'>
        <FormTextField name='codigo' label='Código' required placeholder='Ej: II' />
        <FormTextField name='nombre' label='Nombre' required placeholder='Ej: Antofagasta' />
        <div className='flex justify-end gap-2 pt-2'>
          <Button type='button' variant='outline' onClick={close}>
            Cancelar
          </Button>
          <Button type='submit' isLoading={mutation.isPending}>
            <Icons.check className='mr-1 h-4 w-4' />
            Crear región
          </Button>
        </div>
      </form.Form>
    </form.AppForm>
  );
}

export function RegionQuickCreate({ onCreated }: { onCreated: (region: Region) => void }) {
  return (
    <QuickCreateTrigger
      itemMenu='REGIONES'
      titulo='Nueva región'
      descripcion='La región queda disponible de inmediato en el selector.'
      triggerTitle='Crear nueva región'
    >
      {({ close }) => <RegionQuickForm close={close} onCreated={onCreated} />}
    </QuickCreateTrigger>
  );
}
