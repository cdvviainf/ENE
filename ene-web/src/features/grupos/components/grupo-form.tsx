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
import { grupoDetailOptions, gruposKeys } from '../queries';
import { gruposService } from '../service';
import { GrupoPasajerosCard } from './grupo-pasajeros-card';

const grupoSchema = z.object({
  codigo: z.string().min(1, 'El código es requerido').max(20).trim(),
  apellido: z.string().min(1, 'El apellido es requerido').max(80).trim(),
  clienteId: z.coerce.number().int().positive('El cliente es requerido'),
  nacionalidad: z.string().max(60).trim().optional(),
  paisOrigen: z.string().max(60).trim().optional(),
  idioma: z.string().max(30).trim().optional(),
  cantidadPax: z.coerce.number().int().min(1),
  observaciones: z.string().optional()
});

type GrupoFormValues = z.infer<typeof grupoSchema>;

interface GrupoFormProps {
  grupoId?: number;
}

export function GrupoForm({ grupoId }: GrupoFormProps) {
  const isEdit = !!grupoId;
  const router = useRouter();
  const queryClient = useQueryClient();
  const puedeEscribir = usePuedeEscribir('GRUPOS');

  const { data: grupo, isLoading } = useQuery(grupoDetailOptions(grupoId ?? 0));
  const { data: clientesData } = useQuery(clientesListOptions({ limit: 200 }));
  const clientes = clientesData?.data ?? [];

  const mutation = useMutation({
    mutationFn: (values: GrupoFormValues) =>
      isEdit ? gruposService.update(grupoId!, values) : gruposService.create(values),
    onSuccess: (resultado) => {
      toast.success(isEdit ? 'Grupo actualizado correctamente' : 'Grupo creado correctamente');
      queryClient.invalidateQueries({ queryKey: gruposKeys.all });
      if (isEdit) {
        queryClient.invalidateQueries({ queryKey: gruposKeys.detail(grupoId!) });
      } else {
        router.push(`/config/grupos/${resultado.id}`);
      }
    },
    onError: (e: Error) => toast.error(e.message || 'Error al guardar el grupo')
  });

  const form = useAppForm({
    defaultValues: {
      codigo: '',
      apellido: '',
      clienteId: 0,
      nacionalidad: '',
      paisOrigen: '',
      idioma: '',
      cantidadPax: 1,
      observaciones: ''
    } as GrupoFormValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: grupoSchema as any },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    }
  });

  useEffect(() => {
    if (grupo) {
      form.setFieldValue('codigo', grupo.codigo);
      form.setFieldValue('apellido', grupo.apellido);
      form.setFieldValue('clienteId', grupo.clienteId);
      form.setFieldValue('nacionalidad', grupo.nacionalidad ?? '');
      form.setFieldValue('paisOrigen', grupo.paisOrigen ?? '');
      form.setFieldValue('idioma', grupo.idioma ?? '');
      form.setFieldValue('cantidadPax', grupo.cantidadPax);
      form.setFieldValue('observaciones', grupo.observaciones ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grupo]);

  const { data: codigoSugerido } = useQuery({
    queryKey: ['grupos', 'siguiente-codigo'],
    queryFn: () => gruposService.siguienteCodigo(),
    enabled: !isEdit,
    staleTime: 0
  });

  useEffect(() => {
    if (!isEdit && codigoSugerido) form.setFieldValue('codigo', codigoSugerido);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigoSugerido, isEdit]);

  const { FormTextField, FormTextareaField } = useFormFields<GrupoFormValues>();

  if (isEdit && isLoading) {
    return (
      <div className='space-y-4'>
        <div className='bg-muted h-10 animate-pulse rounded' />
        <div className='bg-muted h-10 animate-pulse rounded' />
      </div>
    );
  }

  if (!puedeEscribir) {
    return <SoloLectura mensaje='Tu perfil solo tiene acceso de lectura a Mantenedores. No puedes crear ni editar grupos.' />;
  }

  return (
    <div className='space-y-6'>
      <form.AppForm>
        <form.Form id='grupo-form' className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>Datos del grupo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='grid gap-4 sm:grid-cols-2'>
                <FormTextField name='codigo' label='Código' required placeholder='Ej: GR00001' disabled={isEdit} />
                {/* RN-OT-03: apellido es el identificador operativo, obligatorio. */}
                <FormTextField name='apellido' label='Apellido' required placeholder='Ej: Smith' />

                <form.Field name='clienteId'>
                  {(field) => (
                    <div className='space-y-1.5'>
                      <Label>
                        Cliente <span className='text-destructive'>*</span>
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
                            <SelectValue placeholder='Seleccionar cliente...' />
                          </SelectTrigger>
                          <SelectContent>
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
            <Button type='button' variant='outline' onClick={() => router.push('/config/grupos')}>
              Cancelar
            </Button>
            <Button type='submit' isLoading={mutation.isPending}>
              <Icons.check className='mr-2 h-4 w-4' />
              {isEdit ? 'Guardar cambios' : 'Crear grupo'}
            </Button>
          </div>
        </form.Form>
      </form.AppForm>

      {isEdit && grupo && <GrupoPasajerosCard grupoId={grupo.id} pasajeros={grupo.pasajeros ?? []} />}
    </div>
  );
}
