'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Icons } from '@/components/icons';
import { useAppForm, useFormFields } from '@/components/ui/tanstack-form';
import { usePuedeEscribir } from '@/hooks/use-item-acceso';
import { SoloLectura } from '@/components/shared/solo-lectura';
import { regionesListOptions } from '@/features/regiones/queries';
import { RegionQuickCreate } from '@/features/regiones/components/region-quick-create';
import { provinciaDetailOptions, provinciasKeys } from '../queries';
import { provinciasService } from '../service';

const provinciaSchema = z.object({
  codigo: z.string().min(1, 'El código es requerido').max(10).trim().toUpperCase(),
  nombre: z.string().min(1, 'El nombre es requerido').max(80).trim(),
  regionId: z.coerce.number().int().positive('La región es requerida')
});

type ProvinciaFormValues = z.infer<typeof provinciaSchema>;

interface ProvinciaFormProps {
  provinciaId?: number;
}

export function ProvinciaForm({ provinciaId }: ProvinciaFormProps) {
  const isEdit = !!provinciaId;
  const router = useRouter();
  const queryClient = useQueryClient();
  const puedeEscribir = usePuedeEscribir('PROVINCIAS');

  const { data: provincia, isLoading } = useQuery(provinciaDetailOptions(provinciaId ?? 0));
  const { data: regionesData } = useQuery(regionesListOptions({ limit: 200 }));
  const regiones = regionesData?.data ?? [];

  const mutation = useMutation({
    mutationFn: (values: ProvinciaFormValues) =>
      isEdit ? provinciasService.update(provinciaId!, values) : provinciasService.create(values),
    onSuccess: () => {
      toast.success(isEdit ? 'Provincia actualizada correctamente' : 'Provincia creada correctamente');
      queryClient.invalidateQueries({ queryKey: provinciasKeys.all });
      router.push('/config/provincias');
    },
    onError: (e: Error) => toast.error(e.message || 'Error al guardar la provincia')
  });

  const form = useAppForm({
    defaultValues: { codigo: '', nombre: '', regionId: 0 } as ProvinciaFormValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: provinciaSchema as any },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    }
  });

  useEffect(() => {
    if (provincia) {
      form.setFieldValue('codigo', provincia.codigo);
      form.setFieldValue('nombre', provincia.nombre);
      form.setFieldValue('regionId', provincia.regionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provincia]);

  const { FormTextField } = useFormFields<ProvinciaFormValues>();

  if (isEdit && isLoading) {
    return (
      <div className='space-y-4'>
        <div className='bg-muted h-10 animate-pulse rounded' />
        <div className='bg-muted h-10 animate-pulse rounded' />
      </div>
    );
  }

  if (!puedeEscribir) {
    return (
      <SoloLectura mensaje='Tu perfil solo tiene acceso de lectura a Mantenedores. No puedes crear ni editar provincias.' />
    );
  }

  return (
    <form.AppForm>
      <form.Form id='provincia-form' className='space-y-6'>
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Datos de la provincia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid gap-4 sm:grid-cols-2'>
              <FormTextField name='codigo' label='Código' required placeholder='Ej: 21' disabled={isEdit} />
              <FormTextField name='nombre' label='Nombre' required placeholder='Ej: El Loa' />

              <form.Field name='regionId'>
                {(field) => (
                  <div className='space-y-1.5'>
                    <Label>
                      Región <span className='text-destructive'>*</span>
                    </Label>
                    <div className='flex items-center gap-2'>
                      <Select
                        value={field.state.value ? String(field.state.value) : ''}
                        onValueChange={(v) => {
                          // Radix puede disparar onValueChange con un valor no
                          // parseable al remontar SelectContent (p. ej. al
                          // refrescar la lista tras un QuickCreate) — ignorarlo
                          // evita resetear el campo a NaN.
                          const id = Number.parseInt(v, 10);
                          if (Number.isFinite(id)) field.handleChange(id);
                        }}
                      >
                        <SelectTrigger className='flex-1'>
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
                      <RegionQuickCreate
                        onCreated={(nueva) => {
                          queryClient.invalidateQueries({ queryKey: ['regiones'] });
                          // form.setFieldValue (no field.handleChange): el callback corre
                          // después del ciclo de vida async del diálogo hijo, y solo la
                          // API del form de nivel superior queda garantizado que siga viva.
                          form.setFieldValue('regionId', nueva.id);
                        }}
                      />
                    </div>
                  </div>
                )}
              </form.Field>
            </div>
          </CardContent>
        </Card>

        <div className='flex items-center justify-end gap-3'>
          <Button type='button' variant='outline' onClick={() => router.push('/config/provincias')}>
            Cancelar
          </Button>
          <Button type='submit' isLoading={mutation.isPending}>
            <Icons.check className='mr-2 h-4 w-4' />
            {isEdit ? 'Guardar cambios' : 'Crear provincia'}
          </Button>
        </div>
      </form.Form>
    </form.AppForm>
  );
}
