'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Icons } from '@/components/icons';
import { useAppForm, useFormFields } from '@/components/ui/tanstack-form';
import { QuickCreateTrigger } from '@/components/shared/quick-create-trigger';
import { zonasListOptions } from '@/features/zonas/queries';
import { ZonaQuickCreate } from '@/features/zonas/components/zona-quick-create';
import { tiposServicioListOptions } from '@/features/tipos-servicio/queries';
import { TipoServicioQuickCreate } from '@/features/tipos-servicio/components/tipo-servicio-quick-create';
import { MODELO_TARIFA_LABELS, type ModeloTarifa } from '@/features/tipos-servicio/types';
import { serviciosKeys } from '../queries';
import { serviciosService } from '../service';
import type { Servicio } from '../types';

// Formulario reducido RN-QC-06/RN-QC-08 (Docs/mantenedores.md §8): lo mínimo
// para un servicio válido — descripción, etc. se completa después en el
// mantenedor completo. zonaId sí entra acá (opcional): la cadena de
// anidamiento "Tarifario → +Servicio → +Zona" está prevista explícitamente
// en §8 "Anidamiento" (RN-QC-04).
const servicioQuickSchema = z.object({
  codigo: z.string().min(1, 'Requerido').max(20).trim(),
  nombre: z.string().min(1, 'Requerido').max(150).trim(),
  zonaId: z.coerce.number().int().positive().optional(),
  tipoServicioId: z.coerce.number().int().positive('El tipo de servicio es requerido'),
  modeloTarifa: z.enum(['TRAMO_PAX', 'ACOMODACION', 'UNITARIO_PAX']),
  margenSugeridoPct: z.coerce.number().min(0).max(1000).default(0)
});

type ServicioQuickValues = z.infer<typeof servicioQuickSchema>;

const MODELO_OPTIONS = (Object.keys(MODELO_TARIFA_LABELS) as ModeloTarifa[]).map((value) => ({
  value,
  label: MODELO_TARIFA_LABELS[value]
}));

function ServicioQuickForm({ close, onCreated }: { close: () => void; onCreated: (servicio: Servicio) => void }) {
  const queryClient = useQueryClient();
  const { data: tiposData } = useQuery(tiposServicioListOptions({ limit: 200 }));
  const { data: zonasData } = useQuery(zonasListOptions({ limit: 200 }));
  const tipos = tiposData?.data ?? [];
  const zonas = zonasData?.data ?? [];

  const mutation = useMutation({
    mutationFn: (values: ServicioQuickValues) => {
      // RN-DIN-01: el margen viaja como string decimal, nunca number.
      const { margenSugeridoPct, ...resto } = values;
      return serviciosService.create({ ...resto, margenSugerido: (margenSugeridoPct / 100).toFixed(4) });
    },
    onSuccess: (nuevo) => {
      queryClient.invalidateQueries({ queryKey: serviciosKeys.all });
      toast.success(`Servicio "${nuevo.nombre}" creado`);
      onCreated(nuevo);
      close();
    },
    onError: (e: Error) => toast.error(e.message || 'Error al crear el servicio')
  });

  const form = useAppForm({
    defaultValues: {
      codigo: '',
      nombre: '',
      zonaId: undefined,
      tipoServicioId: 0,
      modeloTarifa: 'TRAMO_PAX',
      margenSugeridoPct: 0
    } as ServicioQuickValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: servicioQuickSchema as any },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    }
  });

  // Sugerencia de código (RN-MAN-02).
  const { data: codigoSugerido } = useQuery({
    queryKey: ['servicios', 'siguiente-codigo'],
    queryFn: () => serviciosService.siguienteCodigo(),
    staleTime: 0
  });
  useEffect(() => {
    if (codigoSugerido) form.setFieldValue('codigo', codigoSugerido);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigoSugerido]);

  const { FormTextField, FormSelectField } = useFormFields<ServicioQuickValues>();

  return (
    <form.AppForm>
      <form.Form id='servicio-quick-form' className='space-y-3'>
        <FormTextField name='codigo' label='Código' required placeholder='Ej: SV0001' />
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
                    // parseable al remontar SelectContent — ignorarlo evita
                    // resetear el campo a NaN.
                    const id = Number.parseInt(v, 10);
                    if (!Number.isFinite(id)) return;
                    field.handleChange(id);
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
                    field.handleChange(nueva.id);
                  }}
                />
              </div>
            </div>
          )}
        </form.Field>

        <FormSelectField name='modeloTarifa' label='Modelo de tarifa' required options={MODELO_OPTIONS} placeholder='Seleccionar...' />
        <FormTextField name='margenSugeridoPct' label='Margen sugerido (%)' type='number' placeholder='50' />

        <div className='flex justify-end gap-2 pt-2'>
          <Button type='button' variant='outline' onClick={close}>
            Cancelar
          </Button>
          <Button type='submit' isLoading={mutation.isPending}>
            <Icons.check className='mr-1 h-4 w-4' />
            Crear servicio
          </Button>
        </div>
      </form.Form>
    </form.AppForm>
  );
}

export function ServicioQuickCreate({ onCreated }: { onCreated: (servicio: Servicio) => void }) {
  return (
    <QuickCreateTrigger
      itemMenu='SERVICIOS'
      titulo='Nuevo servicio'
      descripcion='Queda disponible de inmediato en el selector. El resto de la ficha se completa después en Servicios.'
      triggerTitle='Crear nuevo servicio'
    >
      {({ close }) => <ServicioQuickForm close={close} onCreated={onCreated} />}
    </QuickCreateTrigger>
  );
}
