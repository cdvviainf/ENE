'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Icons } from '@/components/icons';
import { useAppForm, useFormFields } from '@/components/ui/tanstack-form';
import { QuickCreateTrigger } from '@/components/shared/quick-create-trigger';
import { regionesListOptions } from '@/features/regiones/queries';
import { provinciasKeys } from '../queries';
import { provinciasService } from '../service';
import type { Provincia } from '../types';

// Formulario reducido RN-QC-06/RN-QC-08 (Docs/mantenedores.md §8): código,
// nombre y región vía Select simple — SIN anidar RegionQuickCreate acá,
// profundidad máxima razonable son 2 niveles porque la geografía ya viene
// sembrada completa; si falta una región es un caso raro que se resuelve
// yendo al mantenedor de Regiones directamente.
const provinciaQuickSchema = z.object({
  codigo: z.string().min(1, 'Requerido').max(10).trim().toUpperCase(),
  nombre: z.string().min(1, 'Requerido').max(80).trim(),
  regionId: z.coerce.number().int().positive('La región es requerida')
});

type ProvinciaQuickValues = z.infer<typeof provinciaQuickSchema>;

// Componente propio (no una función inline) para que sus hooks vivan en su
// propio ciclo de montaje/desmontaje — evita el error de "hooks condicionales"
// que se dispararía si useMutation/useAppForm se llamaran directo dentro del
// render-prop `children` de QuickCreateTrigger.
function ProvinciaQuickForm({ close, onCreated }: { close: () => void; onCreated: (provincia: Provincia) => void }) {
  const queryClient = useQueryClient();
  const { data: regionesData } = useQuery(regionesListOptions({ limit: 200 }));
  const regiones = regionesData?.data ?? [];

  const mutation = useMutation({
    mutationFn: (values: ProvinciaQuickValues) => provinciasService.create(values),
    onSuccess: (nueva) => {
      queryClient.invalidateQueries({ queryKey: provinciasKeys.all });
      toast.success(`Provincia "${nueva.nombre}" creada`);
      onCreated(nueva);
      close();
    },
    onError: (e: Error) => toast.error(e.message || 'Error al crear la provincia')
  });

  const form = useAppForm({
    defaultValues: { codigo: '', nombre: '', regionId: 0 } as ProvinciaQuickValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: provinciaQuickSchema as any },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    }
  });

  const { FormTextField } = useFormFields<ProvinciaQuickValues>();

  return (
    <form.AppForm>
      <form.Form id='provincia-quick-form' className='space-y-3'>
        <FormTextField name='codigo' label='Código' required placeholder='Ej: 21' />
        <FormTextField name='nombre' label='Nombre' required placeholder='Ej: El Loa' />

        <form.Field name='regionId'>
          {(field) => (
            <div className='space-y-1.5'>
              <Label>
                Región <span className='text-destructive'>*</span>
              </Label>
              <Select
                value={field.state.value ? String(field.state.value) : ''}
                onValueChange={(v) => {
                  const id = Number.parseInt(v, 10);
                  if (Number.isFinite(id)) field.handleChange(id);
                }}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='Seleccionar región...' />
                </SelectTrigger>
                <SelectContent>
                  {regiones.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </form.Field>

        <div className='flex justify-end gap-2 pt-2'>
          <Button type='button' variant='outline' onClick={close}>
            Cancelar
          </Button>
          <Button type='submit' isLoading={mutation.isPending}>
            <Icons.check className='mr-1 h-4 w-4' />
            Crear provincia
          </Button>
        </div>
      </form.Form>
    </form.AppForm>
  );
}

export function ProvinciaQuickCreate({ onCreated }: { onCreated: (provincia: Provincia) => void }) {
  return (
    <QuickCreateTrigger
      itemMenu='PROVINCIAS'
      titulo='Nueva provincia'
      descripcion='La provincia queda disponible de inmediato en el selector.'
      triggerTitle='Crear nueva provincia'
    >
      {({ close }) => <ProvinciaQuickForm close={close} onCreated={onCreated} />}
    </QuickCreateTrigger>
  );
}
