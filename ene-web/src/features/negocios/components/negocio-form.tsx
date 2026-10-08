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
import { clientesListOptions } from '@/features/clientes/queries';
import { ClienteQuickCreate } from '@/features/clientes/components/cliente-quick-create';
import { negocioDetailOptions, negociosKeys } from '../queries';
import { negociosService } from '../service';
import { NegocioPasajerosCard } from './negocio-pasajeros-card';

const negocioSchema = z.object({
  codigo: z.string().min(1, 'El código es requerido').max(20).trim(),
  apellido: z.string().min(1, 'El apellido es requerido').max(80).trim(),
  // RN-GRP-05: el cliente es opcional — solo código y apellido son obligatorios.
  clienteId: z.number().int().positive().nullable(),
  nacionalidad: z.string().max(60).trim().optional(),
  paisOrigen: z.string().max(60).trim().optional(),
  idioma: z.string().max(30).trim().optional(),
  cantidadPax: z.coerce.number().int().min(1),
  observaciones: z.string().optional()
});

type NegocioFormValues = z.infer<typeof negocioSchema>;

interface NegocioFormProps {
  negocioId?: number;
}

export function NegocioForm({ negocioId }: NegocioFormProps) {
  const isEdit = !!negocioId;
  const router = useRouter();
  const queryClient = useQueryClient();
  const puedeEscribir = usePuedeEscribir('NEGOCIOS');

  const { data: negocio, isLoading } = useQuery(negocioDetailOptions(negocioId ?? 0));
  const { data: clientesData } = useQuery(clientesListOptions({ limit: 200 }));
  const clientes = clientesData?.data ?? [];

  const mutation = useMutation({
    mutationFn: (values: NegocioFormValues) =>
      isEdit ? negociosService.update(negocioId!, values) : negociosService.create(values),
    onSuccess: (resultado) => {
      toast.success(isEdit ? 'Negocio actualizado correctamente' : 'Negocio creado correctamente');
      queryClient.invalidateQueries({ queryKey: negociosKeys.all });
      if (isEdit) {
        queryClient.invalidateQueries({ queryKey: negociosKeys.detail(negocioId!) });
      } else {
        router.push(`/config/negocios/${resultado.id}`);
      }
    },
    onError: (e: Error) => toast.error(e.message || 'Error al guardar el negocio')
  });

  const form = useAppForm({
    defaultValues: {
      codigo: '',
      apellido: '',
      clienteId: null,
      nacionalidad: '',
      paisOrigen: '',
      idioma: '',
      cantidadPax: 1,
      observaciones: ''
    } as NegocioFormValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: negocioSchema as any },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    }
  });

  useEffect(() => {
    if (negocio) {
      form.setFieldValue('codigo', negocio.codigo);
      form.setFieldValue('apellido', negocio.apellido);
      form.setFieldValue('clienteId', negocio.clienteId);
      form.setFieldValue('nacionalidad', negocio.nacionalidad ?? '');
      form.setFieldValue('paisOrigen', negocio.paisOrigen ?? '');
      form.setFieldValue('idioma', negocio.idioma ?? '');
      form.setFieldValue('cantidadPax', negocio.cantidadPax);
      form.setFieldValue('observaciones', negocio.observaciones ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [negocio]);

  const { data: codigoSugerido } = useQuery({
    queryKey: ['negocios', 'siguiente-codigo'],
    queryFn: () => negociosService.siguienteCodigo(),
    enabled: !isEdit,
    staleTime: 0
  });

  useEffect(() => {
    if (!isEdit && codigoSugerido) form.setFieldValue('codigo', codigoSugerido);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigoSugerido, isEdit]);

  const { FormTextField, FormTextareaField } = useFormFields<NegocioFormValues>();

  if (isEdit && isLoading) {
    return (
      <div className='space-y-4'>
        <div className='bg-muted h-10 animate-pulse rounded' />
        <div className='bg-muted h-10 animate-pulse rounded' />
      </div>
    );
  }

  if (!puedeEscribir) {
    return <SoloLectura mensaje='Tu perfil solo tiene acceso de lectura a Mantenedores. No puedes crear ni editar negocios.' />;
  }

  return (
    <div className='space-y-6'>
      <form.AppForm>
        <form.Form id='negocio-form' className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>Datos del negocio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='grid gap-4 sm:grid-cols-2'>
                <FormTextField name='codigo' label='Código' required placeholder='Ej: GR00001' disabled={isEdit} />
                {/* RN-OT-03: apellido es el identificador operativo, obligatorio. */}
                <FormTextField name='apellido' label='Apellido' required placeholder='Ej: Smith' />

                <form.Field name='clienteId'>
                  {(field) => (
                    <div className='space-y-1.5'>
                      {/* RN-GRP-05: el cliente es opcional. */}
                      <Label>Cliente</Label>
                      <div className='flex items-center gap-2'>
                        <Select
                          value={field.state.value ? String(field.state.value) : ''}
                          onValueChange={(v) => {
                            // "__none__" deja el negocio sin cliente (RN-GRP-05).
                            if (v === '__none__') {
                              field.handleChange(null);
                              return;
                            }
                            // Radix puede disparar onValueChange con un valor no
                            // parseable al remontar SelectContent (p. ej. al
                            // refrescar la lista tras un QuickCreate) — ignorarlo
                            // evita resetear el campo a NaN.
                            const id = Number.parseInt(v, 10);
                            if (Number.isFinite(id)) field.handleChange(id);
                          }}
                        >
                          <SelectTrigger className='flex-1'>
                            <SelectValue placeholder='Sin cliente...' />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='__none__'>
                              <span className='text-muted-foreground'>Sin cliente</span>
                            </SelectItem>
                            {clientes.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>
                                {c.razonSocial}
                                <span className='text-muted-foreground ml-1.5 text-xs'>({c.codigo})</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <ClienteQuickCreate
                          onCreated={(nuevo) => {
                            queryClient.invalidateQueries({ queryKey: ['clientes'] });
                            // form.setFieldValue (no field.handleChange): el callback
                            // corre después del ciclo de vida async del diálogo hijo.
                            form.setFieldValue('clienteId', nuevo.id);
                          }}
                        />
                      </div>
                      {field.state.meta.errors.length > 0 && (
                        <p className='text-destructive text-sm'>{String(field.state.meta.errors[0])}</p>
                      )}
                    </div>
                  )}
                </form.Field>

                <FormTextField name='cantidadPax' label='Cantidad de pasajeros' type='number' required />
                <FormTextField name='nacionalidad' label='Nacionalidad' placeholder='Opcional' />
                <FormTextField name='paisOrigen' label='País de origen' placeholder='Opcional' />
                <FormTextField name='idioma' label='Idioma del documento' placeholder='Ej: Español' />
              </div>
              <div className='mt-4'>
                <FormTextareaField name='observaciones' label='Observaciones' placeholder='Opcional' />
              </div>
            </CardContent>
          </Card>

          <div className='flex items-center justify-end gap-3'>
            <Button type='button' variant='outline' onClick={() => router.push('/config/negocios')}>
              Cancelar
            </Button>
            <Button type='submit' isLoading={mutation.isPending}>
              <Icons.check className='mr-2 h-4 w-4' />
              {isEdit ? 'Guardar cambios' : 'Crear negocio'}
            </Button>
          </div>
        </form.Form>
      </form.AppForm>

      {isEdit && negocio && <NegocioPasajerosCard negocioId={negocio.id} pasajeros={negocio.pasajeros ?? []} />}
    </div>
  );
}
