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
import { provinciasListOptions } from '@/features/provincias/queries';
import { comunasKeys } from '../queries';
import { comunasService } from '../service';
import type { Comuna } from '../types';

// Formulario reducido RN-QC-06/RN-QC-08 (Docs/mantenedores.md §8): código,
// nombre y provincia vía Select simple — SIN anidar ProvinciaQuickCreate acá,
// profundidad máxima razonable son 2 niveles porque la geografía ya viene
// sembrada completa; si falta una provincia es un caso raro que se resuelve
// yendo al mantenedor de Provincias directamente.
const comunaQuickSchema = z.object({
  codigo: z.string().min(1, 'Requerido').max(10).trim().toUpperCase(),
  nombre: z.string().min(1, 'Requerido').max(80).trim(),
  provinciaId: z.coerce.number().int().positive('La provincia es requerida')
});

type ComunaQuickValues = z.infer<typeof comunaQuickSchema>;

function ComunaQuickForm({ close, onCreated }: { close: () => void; onCreated: (comuna: Comuna) => void }) {
  const queryClient = useQueryClient();
  const { data: provinciasData } = useQuery(provinciasListOptions({ limit: 200 }));
  const provincias = provinciasData?.data ?? [];

  const mutation = useMutation({
    mutationFn: (values: ComunaQuickValues) => comunasService.create(values),
    onSuccess: (nueva) => {
      queryClient.invalidateQueries({ queryKey: comunasKeys.all });
      toast.success(`Comuna "${nueva.nombre}" creada`);
      onCreated(nueva);
      close();
    },
    onError: (e: Error) => toast.error(e.message || 'Error al crear la comuna')
  });

  const form = useAppForm({
    defaultValues: { codigo: '', nombre: '', provinciaId: 0 } as ComunaQuickValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: comunaQuickSchema as any },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    }
  });

  const { FormTextField } = useFormFields<ComunaQuickValues>();

  return (
    <form.AppForm>
      <form.Form id='comuna-quick-form' className='space-y-3'>
        <FormTextField name='codigo' label='Código' required placeholder='Ej: 2101' />
        <FormTextField name='nombre' label='Nombre' required placeholder='Ej: Calama' />

        <form.Field name='provinciaId'>
          {(field) => (
            <div className='space-y-1.5'>
              <Label>
                Provincia <span className='text-destructive'>*</span>
              </Label>
              <Select
                value={field.state.value ? String(field.state.value) : ''}
                onValueChange={(v) => {
                  const id = Number.parseInt(v, 10);
                  if (Number.isFinite(id)) field.handleChange(id);
                }}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='Seleccionar provincia...' />
                </SelectTrigger>
                <SelectContent>
                  {provincias.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.nombre}
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
            Crear comuna
          </Button>
        </div>
      </form.Form>
    </form.AppForm>
  );
}

export function ComunaQuickCreate({ onCreated }: { onCreated: (comuna: Comuna) => void }) {
  return (
    <QuickCreateTrigger
      itemMenu='COMUNAS'
      titulo='Nueva comuna'
      descripcion='La comuna queda disponible de inmediato en el selector.'
      triggerTitle='Crear nueva comuna'
    >
      {({ close }) => <ComunaQuickForm close={close} onCreated={onCreated} />}
    </QuickCreateTrigger>
  );
}
