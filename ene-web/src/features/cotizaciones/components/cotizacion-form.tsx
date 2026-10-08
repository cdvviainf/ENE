'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@tanstack/react-form';
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
import { clientesListOptions, clienteDetailOptions } from '@/features/clientes/queries';
import { negociosListOptions, negociosKeys } from '@/features/negocios/queries';
import { NegocioQuickCreate } from '@/features/negocios/components/negocio-quick-create';
import { zonasListOptions } from '@/features/zonas/queries';
import { MultiCombobox } from '@/components/ui/multi-combobox';
import { cotizacionesService } from '../service';
import { cotizacionesKeys } from '../queries';
import { AREA_LABELS, type AreaNegocio, type Moneda } from '../types';

const schema = z.object({
  clienteId: z.number().int().positive({ message: 'Selecciona un cliente' }),
  ejecutivoId: z.number().int().positive().nullable(),
  negocioId: z.number().int().positive({ message: 'Selecciona un negocio' }),
  areaNegocio: z.enum(['RECEPTIVO', 'EVENTOS']),
  zonaIds: z.array(z.number().int().positive()).default([]),
  fechaOperacion: z.string().min(1, 'La fecha es requerida'),
  cantidadPax: z.coerce.number().int().min(1),
  idiomaDocumento: z.enum(['es', 'en']),
  moneda: z.enum(['CLP', 'USD']),
  tipoCambio: z.string().regex(/^\d+(\.\d+)?$/, 'Tipo de cambio inválido')
});

type FormValues = z.infer<typeof schema>;

export function CotizacionForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const puedeEscribir = usePuedeEscribir('COTIZACIONES');

  const { data: clientesData } = useQuery(clientesListOptions({ limit: 200 }));
  const { data: negociosData } = useQuery(negociosListOptions({ limit: 200 }));
  const { data: zonasData } = useQuery(zonasListOptions({ limit: 200 }));
  const clientes = clientesData?.data ?? [];
  const negocios = negociosData?.data ?? [];
  const zonas = zonasData?.data ?? [];

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      cotizacionesService.create({
        clienteId: values.clienteId,
        ejecutivoId: values.ejecutivoId ?? undefined,
        negocioId: values.negocioId,
        areaNegocio: values.areaNegocio,
        zonaIds: values.zonaIds,
        fechaOperacion: values.fechaOperacion,
        cantidadPax: values.cantidadPax,
        idiomaDocumento: values.idiomaDocumento,
        moneda: values.moneda,
        tipoCambio: values.tipoCambio
      }),
    onSuccess: (cot) => {
      toast.success(`Cotización ${cot.numero} creada`);
      queryClient.invalidateQueries({ queryKey: cotizacionesKeys.all });
      router.push(`/cotizaciones/${cot.id}`);
    },
    onError: (e: Error) => toast.error(e.message || 'Error al crear la cotización')
  });

  const form = useAppForm({
    defaultValues: {
      clienteId: 0 as number,
      ejecutivoId: null as number | null,
      negocioId: 0 as number,
      areaNegocio: 'RECEPTIVO' as AreaNegocio,
      zonaIds: [] as number[],
      fechaOperacion: '',
      cantidadPax: 1,
      idiomaDocumento: 'es' as 'es' | 'en',
      moneda: 'USD' as Moneda,
      tipoCambio: '950'
    } as FormValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: schema as any },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    }
  });

  // Ejecutivos del cliente seleccionado (RN-COT-04: ejecutivo requerido para aprobar).
  // Se suscribe con `useStore` (no `form.state.values`, que es un snapshot no
  // reactivo): sin esto el componente no re-renderiza al elegir un cliente y la
  // consulta de ejecutivos queda con el id anterior (0), dejando el selector vacío.
  const clienteIdSel = useStore(form.store, (s) => s.values.clienteId);
  const { data: clienteSel } = useQuery({ ...clienteDetailOptions(clienteIdSel), enabled: clienteIdSel > 0 });
  const ejecutivos = clienteSel?.ejecutivos ?? [];

  // RN-COT-04: ejecutivo requerido para aprobar. Al cargar los ejecutivos del
  // cliente se autoselecciona el por defecto —el representante legal, o el único
  // activo— para no dejar el campo vacío. No pisa una elección manual: solo
  // actúa cuando el campo está en null (elegir cliente ya lo resetea a null).
  useEffect(() => {
    if (clienteIdSel <= 0 || form.state.values.ejecutivoId != null) return;
    const activos = ejecutivos.filter((e) => e.activo);
    const porDefecto = activos.find((e) => e.esRepresentanteLegal) ?? (activos.length === 1 ? activos[0] : undefined);
    if (porDefecto) form.setFieldValue('ejecutivoId', porDefecto.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteSel]);

  const { FormTextField } = useFormFields<FormValues>();

  if (!puedeEscribir) {
    return <SoloLectura mensaje='Tu perfil solo tiene acceso de lectura a Cotizaciones. No puedes crear cotizaciones.' />;
  }

  return (
    <form.AppForm>
      <form.Form id='cotizacion-form' className='space-y-6'>
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Datos de la cotización</CardTitle>
          </CardHeader>
          <CardContent className='grid gap-4 sm:grid-cols-2'>
            {/* Cliente */}
            <form.Field name='clienteId'>
              {(field) => (
                <div className='space-y-1.5'>
                  <Label>Cliente *</Label>
                  <Select
                    value={field.state.value ? String(field.state.value) : ''}
                    onValueChange={(v) => {
                      const id = Number.parseInt(v, 10);
                      if (Number.isFinite(id)) {
                        field.handleChange(id);
                        form.setFieldValue('ejecutivoId', null);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='Selecciona un cliente...' />
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
                  {field.state.meta.errors.length > 0 && (
                    <p className='text-destructive text-sm'>{String(field.state.meta.errors[0])}</p>
                  )}
                </div>
              )}
            </form.Field>

            {/* Ejecutivo */}
            <form.Field name='ejecutivoId'>
              {(field) => (
                <div className='space-y-1.5'>
                  <Label>Ejecutivo</Label>
                  <Select
                    value={field.state.value ? String(field.state.value) : ''}
                    onValueChange={(v) => {
                      if (v === '__none__') {
                        field.handleChange(null);
                        return;
                      }
                      const id = Number.parseInt(v, 10);
                      if (Number.isFinite(id)) field.handleChange(id);
                    }}
                    disabled={clienteIdSel <= 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={clienteIdSel > 0 ? 'Selecciona un ejecutivo...' : 'Elige un cliente primero'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='__none__'>
                        <span className='text-muted-foreground'>Sin ejecutivo</span>
                      </SelectItem>
                      {ejecutivos.map((e) => (
                        <SelectItem key={e.id} value={String(e.id)}>
                          {e.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>

            {/* Negocio */}
            <form.Field name='negocioId'>
              {(field) => (
                <div className='space-y-1.5'>
                  <Label>Negocio *</Label>
                  <div className='flex items-center gap-2'>
                    <Select
                      value={field.state.value ? String(field.state.value) : ''}
                      onValueChange={(v) => {
                        const id = Number.parseInt(v, 10);
                        if (Number.isFinite(id)) field.handleChange(id);
                      }}
                    >
                      <SelectTrigger className='flex-1'>
                        <SelectValue placeholder='Selecciona un negocio...' />
                      </SelectTrigger>
                      <SelectContent>
                        {negocios.map((g) => (
                          <SelectItem key={g.id} value={String(g.id)}>
                            {g.apellido}
                            <span className='text-muted-foreground ml-1.5 text-xs'>({g.codigo})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <NegocioQuickCreate
                      clienteId={clienteIdSel > 0 ? clienteIdSel : null}
                      onCreated={(nuevo) => {
                        queryClient.invalidateQueries({ queryKey: negociosKeys.all });
                        field.handleChange(nuevo.id);
                      }}
                    />
                  </div>
                  {field.state.meta.errors.length > 0 && (
                    <p className='text-destructive text-sm'>{String(field.state.meta.errors[0])}</p>
                  )}
                </div>
              )}
            </form.Field>

            {/* Zonas (RN-COT-08: múltiples) */}
            <form.Field name='zonaIds'>
              {(field) => (
                <div className='space-y-1.5'>
                  <Label>Zonas</Label>
                  <MultiCombobox
                    options={zonas.map((z) => ({ value: String(z.id), label: z.nombre }))}
                    values={(field.state.value ?? []).map((id) => String(id))}
                    onChange={(vals) => field.handleChange(vals.map((v) => Number.parseInt(v, 10)).filter(Number.isFinite))}
                    placeholder='Sin zonas...'
                    searchPlaceholder='Buscar zona...'
                  />
                </div>
              )}
            </form.Field>

            {/* Área de negocio */}
            <form.Field name='areaNegocio'>
              {(field) => (
                <div className='space-y-1.5'>
                  <Label>Área de negocio *</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={(v) => {
                      const area = v as AreaNegocio;
                      field.handleChange(area);
                      // RN-MON-01: receptivo en USD, eventos en CLP (default editable).
                      form.setFieldValue('moneda', area === 'RECEPTIVO' ? 'USD' : 'CLP');
                      form.setFieldValue('tipoCambio', area === 'RECEPTIVO' ? '950' : '1');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(['RECEPTIVO', 'EVENTOS'] as AreaNegocio[]).map((a) => (
                        <SelectItem key={a} value={a}>
                          {AREA_LABELS[a]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>

            <FormTextField name='fechaOperacion' label='Fecha de operación' type='date' required />
            <FormTextField name='cantidadPax' label='Cantidad de pasajeros' type='number' min={1} required className='w-28' />

            {/* Moneda */}
            <form.Field name='moneda'>
              {(field) => (
                <div className='space-y-1.5'>
                  <Label>Moneda *</Label>
                  <Select value={field.state.value} onValueChange={(v) => field.handleChange(v as Moneda)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='USD'>USD</SelectItem>
                      <SelectItem value='CLP'>CLP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>

            <FormTextField name='tipoCambio' label='Tipo de cambio (CLP por USD)' required />

            {/* Idioma */}
            <form.Field name='idiomaDocumento'>
              {(field) => (
                <div className='space-y-1.5'>
                  <Label>Idioma del documento *</Label>
                  <Select value={field.state.value} onValueChange={(v) => field.handleChange(v as 'es' | 'en')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='es'>Español</SelectItem>
                      <SelectItem value='en'>Inglés</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>
          </CardContent>
        </Card>

        <div className='flex items-center justify-end gap-3'>
          <Button type='button' variant='outline' onClick={() => router.push('/cotizaciones')}>
            Cancelar
          </Button>
          <Button type='submit' isLoading={mutation.isPending}>
            <Icons.check className='mr-2 h-4 w-4' />
            Crear cotización
          </Button>
        </div>
      </form.Form>
    </form.AppForm>
  );
}
