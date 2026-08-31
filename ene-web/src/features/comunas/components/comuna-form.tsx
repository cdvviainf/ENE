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
import { provinciasListOptions } from '@/features/provincias/queries';
import { ProvinciaQuickCreate } from '@/features/provincias/components/provincia-quick-create';
import { comunaDetailOptions, comunasKeys } from '../queries';
import { comunasService } from '../service';

const comunaSchema = z.object({
  codigo: z.string().min(1, 'El código es requerido').max(10).trim().toUpperCase(),
  nombre: z.string().min(1, 'El nombre es requerido').max(80).trim(),
  provinciaId: z.coerce.number().int().positive('La provincia es requerida')
});

type ComunaFormValues = z.infer<typeof comunaSchema>;

interface ComunaFormProps {
  comunaId?: number;
}

export function ComunaForm({ comunaId }: ComunaFormProps) {
  const isEdit = !!comunaId;
  const router = useRouter();
  const queryClient = useQueryClient();
  const puedeEscribir = usePuedeEscribir('COMUNAS');

  const { data: comuna, isLoading } = useQuery(comunaDetailOptions(comunaId ?? 0));
  const { data: provinciasData } = useQuery(provinciasListOptions({ limit: 200 }));
  const provincias = provinciasData?.data ?? [];

  const mutation = useMutation({
    mutationFn: (values: ComunaFormValues) =>
      isEdit ? comunasService.update(comunaId!, values) : comunasService.create(values),
    onSuccess: () => {
      toast.success(isEdit ? 'Comuna actualizada correctamente' : 'Comuna creada correctamente');
      queryClient.invalidateQueries({ queryKey: comunasKeys.all });
      router.push('/config/comunas');
    },
    onError: (e: Error) => toast.error(e.message || 'Error al guardar la comuna')
  });

  const form = useAppForm({
    defaultValues: { codigo: '', nombre: '', provinciaId: 0 } as ComunaFormValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: comunaSchema as any },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    }
  });

  useEffect(() => {
    if (comuna) {
      form.setFieldValue('codigo', comuna.codigo);
      form.setFieldValue('nombre', comuna.nombre);
      form.setFieldValue('provinciaId', comuna.provinciaId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comuna]);

  const { FormTextField } = useFormFields<ComunaFormValues>();

  if (isEdit && isLoading) {
    return (
      <div className='space-y-4'>
        <div className='bg-muted h-10 animate-pulse rounded' />
        <div className='bg-muted h-10 animate-pulse rounded' />
      </div>
    );
  }

  if (!puedeEscribir) {
    return <SoloLectura mensaje='Tu perfil solo tiene acceso de lectura a Mantenedores. No puedes crear ni editar comunas.' />;
  }

  return (
    <form.AppForm>
      <form.Form id='comuna-form' className='space-y-6'>
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Datos de la comuna</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid gap-4 sm:grid-cols-2'>
              <FormTextField name='codigo' label='Código' required placeholder='Ej: 2101' disabled={isEdit} />
              <FormTextField name='nombre' label='Nombre' required placeholder='Ej: Calama' />

              <form.Field name='provinciaId'>
                {(field) => (
                  <div className='space-y-1.5'>
                    <Label>
                      Provincia <span className='text-destructive'>*</span>
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
                      <ProvinciaQuickCreate
                        onCreated={(nueva) => {
                          queryClient.invalidateQueries({ queryKey: ['provincias'] });
                          // form.setFieldValue (no field.handleChange): el callback corre
                          // después del ciclo de vida async del diálogo hijo, y solo la
                          // API del form de nivel superior queda garantizado que siga viva.
                          form.setFieldValue('provinciaId', nueva.id);
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
          <Button type='button' variant='outline' onClick={() => router.push('/config/comunas')}>
            Cancelar
          </Button>
          <Button type='submit' isLoading={mutation.isPending}>
            <Icons.check className='mr-2 h-4 w-4' />
            {isEdit ? 'Guardar cambios' : 'Crear comuna'}
          </Button>
        </div>
      </form.Form>
    </form.AppForm>
  );
}
