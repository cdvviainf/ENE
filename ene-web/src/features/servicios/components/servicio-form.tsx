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
import { zonasListOptions } from '@/features/zonas/queries';
import { ZonaQuickCreate } from '@/features/zonas/components/zona-quick-create';
import { tiposServicioListOptions } from '@/features/tipos-servicio/queries';
import { TipoServicioQuickCreate } from '@/features/tipos-servicio/components/tipo-servicio-quick-create';
import { MODELO_TARIFA_LABELS, type ModeloTarifa } from '@/features/tipos-servicio/types';
import { servicioDetailOptions, serviciosKeys } from '../queries';
import { serviciosService } from '../service';

const servicioSchema = z.object({
  codigo: z.string().min(1, 'El código es requerido').max(20).trim(),
  nombre: z.string().min(1, 'El nombre es requerido').max(150).trim(),
  nombreEn: z.string().max(150).trim().optional(),
  descripcion: z.string().optional(),
  descripcionEn: z.string().optional(),
  zonaId: z.coerce.number().int().positive().optional(),
  tipoServicioId: z.coerce.number().int().positive('El tipo de servicio es requerido'),
  modeloTarifa: z.enum(['TRAMO_PAX', 'ACOMODACION', 'UNITARIO_PAX']),
  margenSugeridoPct: z.coerce.number().min(0).max(1000).default(0),
  duracionDias: z.coerce.number().int().positive().optional()
});

type ServicioFormValues = z.infer<typeof servicioSchema>;

const MODELO_OPTIONS = (Object.keys(MODELO_TARIFA_LABELS) as ModeloTarifa[]).map((value) => ({
  value,
  label: MODELO_TARIFA_LABELS[value]
}));

interface ServicioFormProps {
  servicioId?: number;
}

export function ServicioForm({ servicioId }: ServicioFormProps) {
  const isEdit = !!servicioId;
  const router = useRouter();
  const queryClient = useQueryClient();
  const puedeEscribir = usePuedeEscribir('SERVICIOS');

  const { data: servicio, isLoading } = useQuery(servicioDetailOptions(servicioId ?? 0));
  const { data: zonasData } = useQuery(zonasListOptions({ limit: 200 }));
  const { data: tiposData } = useQuery(tiposServicioListOptions({ limit: 200 }));
  const zonas = zonasData?.data ?? [];
  const tipos = tiposData?.data ?? [];

  const mutation = useMutation({
    mutationFn: (values: ServicioFormValues) => {
      // RN-DIN-01: el margen viaja como string decimal, nunca number — la
      // conversión de "%" a ratio es solo de UI, el backend valida el string.
      const { margenSugeridoPct, ...resto } = values;
      const payload = { ...resto, margenSugerido: (margenSugeridoPct / 100).toFixed(4) };
      return isEdit ? serviciosService.update(servicioId!, payload) : serviciosService.create(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Servicio actualizado correctamente' : 'Servicio creado correctamente');
      queryClient.invalidateQueries({ queryKey: serviciosKeys.all });
      router.push('/config/servicios');
    },
    onError: (e: Error) => toast.error(e.message || 'Error al guardar el servicio')
  });

  const form = useAppForm({
    defaultValues: {
      codigo: '',
      nombre: '',
      nombreEn: '',
      descripcion: '',
      descripcionEn: '',
      zonaId: undefined,
      tipoServicioId: 0,
      modeloTarifa: 'TRAMO_PAX',
      margenSugeridoPct: 0,
      duracionDias: undefined
    } as ServicioFormValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: servicioSchema as any },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    }
  });

  useEffect(() => {
    if (servicio) {
      form.setFieldValue('codigo', servicio.codigo);
      form.setFieldValue('nombre', servicio.nombre);
      form.setFieldValue('nombreEn', servicio.nombreEn ?? '');
      form.setFieldValue('descripcion', servicio.descripcion ?? '');
      form.setFieldValue('descripcionEn', servicio.descripcionEn ?? '');
      form.setFieldValue('zonaId', servicio.zonaId ?? undefined);
      form.setFieldValue('tipoServicioId', servicio.tipoServicioId);
      form.setFieldValue('modeloTarifa', servicio.modeloTarifa);
      form.setFieldValue('margenSugeridoPct', Number(servicio.margenSugerido) * 100);
      form.setFieldValue('duracionDias', servicio.duracionDias ?? undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servicio]);

  // Sugerencia de código (RN-MAN-02) — solo al crear.
  const { data: codigoSugerido } = useQuery({
    queryKey: ['servicios', 'siguiente-codigo'],
    queryFn: () => serviciosService.siguienteCodigo(),
    enabled: !isEdit,
    staleTime: 0
  });

  useEffect(() => {
    if (!isEdit && codigoSugerido) form.setFieldValue('codigo', codigoSugerido);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigoSugerido, isEdit]);

  const { FormTextField, FormSelectField, FormTextareaField } = useFormFields<ServicioFormValues>();

  if (isEdit && isLoading) {
    return (
      <div className='space-y-4'>
        <div className='bg-muted h-10 animate-pulse rounded' />
        <div className='bg-muted h-10 animate-pulse rounded' />
      </div>
    );
  }

  if (!puedeEscribir) {
    return <SoloLectura mensaje='Tu perfil solo tiene acceso de lectura a Mantenedores. No puedes crear ni editar servicios.' />;
  }

  return (
    <form.AppForm>
      <form.Form id='servicio-form' className='space-y-6'>
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Datos del servicio</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid gap-4 sm:grid-cols-2'>
              <FormTextField name='codigo' label='Código' required placeholder='Ej: SV0001' disabled={isEdit} />
              <FormTextField name='nombre' label='Nombre' required placeholder='Ej: Traslado aeropuerto - hotel' />

              <form.Field name='tipoServicioId'>
                {(field) => (
                  <div className='space-y-1.5'>
                    <Label>
                      Tipo de servicio <span className='text-destructive'>*</span>
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
                          if (!Number.isFinite(id)) return;
                          field.handleChange(id);
                          // RN-SRV-01: precarga el modelo de tarifa del tipo elegido.
                          const tipo = tipos.find((t) => t.id === id);
                          if (tipo) form.setFieldValue('modeloTarifa', tipo.modeloTarifaDefault);
                        }}
                      >
                        <SelectTrigger className='flex-1'>
                          <SelectValue placeholder='Seleccionar tipo de servicio...' />
                        </SelectTrigger>
                        <SelectContent>
                          {tipos.map((t) => (
                            <SelectItem key={t.id} value={String(t.id)}>
                              {t.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <TipoServicioQuickCreate
                        onCreated={(nuevo) => {
                          queryClient.invalidateQueries({ queryKey: ['tipos-servicio'] });
                          // form.setFieldValue (no field.handleChange): el callback corre
                          // después del ciclo de vida async del diálogo hijo, y solo la
                          // API del form de nivel superior queda garantizado que siga viva.
                          form.setFieldValue('tipoServicioId', nuevo.id);
                          form.setFieldValue('modeloTarifa', nuevo.modeloTarifaDefault);
                        }}
                      />
                    </div>
                  </div>
                )}
              </form.Field>

              <form.Field name='zonaId'>
                {(field) => (
                  <div className='space-y-1.5'>
                    <Label>Zona</Label>
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
                          <SelectValue placeholder='Sin zona específica...' />
                        </SelectTrigger>
                        <SelectContent>
                          {zonas.map((z) => (
                            <SelectItem key={z.id} value={String(z.id)}>
                              {z.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <ZonaQuickCreate
                        onCreated={(nueva) => {
                          queryClient.invalidateQueries({ queryKey: ['zonas'] });
                          form.setFieldValue('zonaId', nueva.id);
                        }}
                      />
                    </div>
                  </div>
                )}
              </form.Field>

              <FormSelectField
                name='modeloTarifa'
                label='Modelo de tarifa'
                required
                options={MODELO_OPTIONS}
                placeholder='Seleccionar...'
              />

              <FormTextField name='nombreEn' label='Nombre (inglés)' placeholder='Ej: Airport - hotel transfer' />
              <FormTextField
                name='margenSugeridoPct'
                label='Margen sugerido (%)'
                type='number'
                placeholder='50'
              />
              <FormTextField name='duracionDias' label='Duración (días)' type='number' placeholder='Opcional' />
            </div>

            <div className='grid gap-4 sm:grid-cols-2'>
              <FormTextareaField name='descripcion' label='Descripción' placeholder='Va al documento del cliente' />
              <FormTextareaField name='descripcionEn' label='Descripción (inglés)' placeholder='Optional' />
            </div>
          </CardContent>
        </Card>

        <div className='flex items-center justify-end gap-3'>
          <Button type='button' variant='outline' onClick={() => router.push('/config/servicios')}>
            Cancelar
          </Button>
          <Button type='submit' isLoading={mutation.isPending}>
            <Icons.check className='mr-2 h-4 w-4' />
            {isEdit ? 'Guardar cambios' : 'Crear servicio'}
          </Button>
        </div>
      </form.Form>
    </form.AppForm>
  );
}
