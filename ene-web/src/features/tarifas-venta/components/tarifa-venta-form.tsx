'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { Icons } from '@/components/icons';
import { useAppForm, useFormFields } from '@/components/ui/tanstack-form';
import { usePuedeEscribir } from '@/hooks/use-item-acceso';
import { SoloLectura } from '@/components/shared/solo-lectura';
import { serviciosListOptions } from '@/features/servicios/queries';
import { ValoresEditor, FILA_VACIA, type FilaValor } from '@/features/tarifas/components/valores-editor';
import type { Acomodacion, ModeloTarifa, Moneda } from '@/features/tarifas/types';
import { tarifaVentaDetailOptions, tarifasVentaKeys } from '../queries';
import { tarifasVentaService } from '../service';
import type { TarifaVentaCambioInput, TarifaVentaValorInput } from '../types';

const MONEDA_OPTIONS: { value: Moneda; label: string }[] = [
  { value: 'USD', label: 'USD' },
  { value: 'CLP', label: 'CLP' }
];

const cabeceraSchema = z
  .object({
    servicioId: z.coerce.number().int().positive('El servicio es requerido'),
    moneda: z.enum(['CLP', 'USD']),
    vigenciaDesde: z.string().min(1, 'La fecha de inicio es requerida'),
    vigenciaHasta: z.string().optional()
  })
  .refine((v) => !v.vigenciaHasta || v.vigenciaHasta >= v.vigenciaDesde, {
    path: ['vigenciaHasta'],
    message: 'El término no puede ser anterior al inicio'
  });
type CabeceraValues = z.infer<typeof cabeceraSchema>;

// Forma mínima antes de enviar; RN-TAR-02 / RN-TVE-03 los valida el backend.
function valoresListos(modelo: ModeloTarifa | null, filas: FilaValor[]): boolean {
  if (!modelo) return false;
  if (modelo === 'UNITARIO_PAX') return !!filas[0]?.valor;
  if (modelo === 'ACOMODACION') return filas.some((f) => f.acomodacion && f.valor);
  return filas.some((f) => f.paxDesde && f.valor);
}

function construirValores(modelo: ModeloTarifa, filas: FilaValor[]): TarifaVentaValorInput[] {
  if (modelo === 'UNITARIO_PAX') return [{ modelo, valor: filas[0]!.valor }];
  if (modelo === 'ACOMODACION') {
    return filas
      .filter((f) => f.acomodacion && f.valor)
      .map((f) => ({ modelo, acomodacion: f.acomodacion as Acomodacion, valor: f.valor }));
  }
  return filas
    .filter((f) => f.paxDesde && f.valor)
    .map((f) => ({ modelo, paxDesde: Number(f.paxDesde), paxHasta: f.paxHasta ? Number(f.paxHasta) : null, valor: f.valor }));
}

export type TarifaVentaFormMode =
  | { kind: 'nuevo'; servicioId?: number }
  | { kind: 'nueva-version'; tarifaId: number }
  | { kind: 'editar'; tarifaId: number };

export function TarifaVentaForm({ mode }: { mode: TarifaVentaFormMode }) {
  const esNuevo = mode.kind === 'nuevo';
  const isEditar = mode.kind === 'editar';
  const router = useRouter();
  const queryClient = useQueryClient();
  const puedeEscribir = usePuedeEscribir('TARIFAS_VENTA');

  const { data: anterior, isLoading: cargandoAnterior } = useQuery(tarifaVentaDetailOptions(esNuevo ? 0 : mode.tarifaId));
  const { data: serviciosData } = useQuery(serviciosListOptions({ limit: 500 }));
  const servicios = serviciosData?.data ?? [];

  const [valores, setValores] = useState<FilaValor[]>([{ ...FILA_VACIA }]);
  const [modelo, setModelo] = useState<ModeloTarifa | null>(null);

  const form = useAppForm({
    defaultValues: {
      servicioId: esNuevo ? (mode.servicioId ?? 0) : 0,
      moneda: 'USD',
      vigenciaDesde: '',
      vigenciaHasta: ''
    } as CabeceraValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: cabeceraSchema as any },
    onSubmit: async ({ value }) => {
      if (!valoresListos(modelo, valores)) {
        toast.error('Completa al menos un valor antes de guardar');
        return;
      }
      await mutation.mutateAsync(value);
    }
  });

  // Modo nuevo: el modelo del editor lo fija el servicio elegido (RN-TVE-02).
  // Solo se reinicia la tabla si el modelo cambia de verdad.
  function aplicarServicio(servicioId: number) {
    const nuevoModelo = servicios.find((s) => s.id === servicioId)?.modeloTarifa ?? null;
    if (nuevoModelo !== modelo) {
      setModelo(nuevoModelo);
      setValores([{ ...FILA_VACIA }]);
    }
  }

  // Servicio precargado desde el listado (?servicioId=): fija el modelo cuando
  // llega la lista de servicios.
  const servicioInicial = esNuevo ? mode.servicioId : undefined;
  const servicioFijo = servicioInicial ? servicios.find((s) => s.id === servicioInicial) : undefined;
  useEffect(() => {
    if (servicioInicial && servicios.length > 0 && modelo == null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      aplicarServicio(servicioInicial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servicioInicial, servicios.length]);

  // Nueva versión / edición: precarga desde la tarifa existente.
  useEffect(() => {
    if (!esNuevo && anterior) {
      form.setFieldValue('servicioId', anterior.servicioId);
      form.setFieldValue('moneda', anterior.moneda);
      // Al editar se conserva la vigencia; al versionar se pide una nueva.
      if (isEditar) {
        form.setFieldValue('vigenciaDesde', anterior.vigenciaDesde.slice(0, 10));
        form.setFieldValue('vigenciaHasta', anterior.vigenciaHasta ? anterior.vigenciaHasta.slice(0, 10) : '');
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setModelo(anterior.servicio?.modeloTarifa ?? anterior.valores[0]?.modelo ?? null);
      setValores(
        anterior.valores.map((v) => ({
          paxDesde: v.paxDesde != null ? String(v.paxDesde) : '',
          paxHasta: v.paxHasta != null ? String(v.paxHasta) : '',
          acomodacion: v.acomodacion ?? '',
          valor: v.valor,
          suplementoSingle: ''
        }))
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anterior, mode.kind]);

  const mutation = useMutation({
    mutationFn: async (cabecera: CabeceraValues) => {
      const cambio: TarifaVentaCambioInput = {
        vigenciaDesde: cabecera.vigenciaDesde,
        ...(cabecera.vigenciaHasta ? { vigenciaHasta: cabecera.vigenciaHasta } : {}),
        valores: construirValores(modelo!, valores)
      };
      if (mode.kind === 'editar') return tarifasVentaService.update(mode.tarifaId, cambio);
      if (mode.kind === 'nueva-version') return tarifasVentaService.nuevaVersion(mode.tarifaId, cambio);
      return tarifasVentaService.create({ ...cambio, servicioId: cabecera.servicioId, moneda: cabecera.moneda });
    },
    onSuccess: (tarifa) => {
      queryClient.invalidateQueries({ queryKey: tarifasVentaKeys.all });
      toast.success(isEditar ? 'Tarifa de venta actualizada' : mode.kind === 'nueva-version' ? 'Nueva versión creada' : 'Tarifa de venta creada');
      router.push(`/config/tarifas-venta/${tarifa.id}`);
    },
    onError: (e: Error) => toast.error(e.message || 'Error al guardar la tarifa de venta')
  });

  const { FormSelectField, FormTextField } = useFormFields<CabeceraValues>();

  if (!esNuevo && cargandoAnterior) {
    return (
      <div className='space-y-4'>
        <div className='bg-muted h-10 animate-pulse rounded' />
        <div className='bg-muted h-10 animate-pulse rounded' />
      </div>
    );
  }

  if (!puedeEscribir) {
    return <SoloLectura mensaje='Tu perfil solo tiene acceso de lectura a Tarifas de venta.' />;
  }

  return (
    <form.AppForm>
      <form.Form id='tarifa-venta-form' className='space-y-6'>
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Datos de la tarifa de venta</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid gap-4 sm:grid-cols-2'>
              {esNuevo ? (
                <>
                  {servicioInicial ? (
                    // Viene desde "Agregar tarifa" de un servicio: queda fijo.
                    <div className='space-y-1.5 sm:col-span-2'>
                      <Label>Servicio</Label>
                      <p className='text-sm font-medium'>
                        {servicioFijo ? `${servicioFijo.codigo} · ${servicioFijo.nombre}` : 'Cargando...'}
                      </p>
                    </div>
                  ) : (
                    <form.Field name='servicioId'>
                      {(field) => (
                        <div className='space-y-1.5 sm:col-span-2'>
                          <Label>
                            Servicio <span className='text-destructive'>*</span>
                          </Label>
                          <Combobox
                            options={servicios.map((s) => ({ value: String(s.id), label: `${s.codigo} · ${s.nombre}` }))}
                            value={field.state.value ? String(field.state.value) : null}
                            onChange={(v) => {
                              const id = Number.parseInt(v, 10);
                              if (!Number.isFinite(id)) return;
                              field.handleChange(id);
                              aplicarServicio(id);
                            }}
                            placeholder='Seleccionar servicio...'
                            searchPlaceholder='Buscar servicio...'
                          />
                        </div>
                      )}
                    </form.Field>
                  )}
                  <FormSelectField name='moneda' label='Moneda' required options={MONEDA_OPTIONS} placeholder='Seleccionar...' />
                  <div />
                </>
              ) : (
                <>
                  <div className='space-y-1.5'>
                    <Label>Servicio</Label>
                    <p className='text-sm font-medium'>
                      {anterior?.servicio?.codigo} · {anterior?.servicio?.nombre}
                    </p>
                  </div>
                  <div className='space-y-1.5'>
                    <Label>Moneda</Label>
                    <p className='text-sm font-medium'>{anterior?.moneda}</p>
                  </div>
                </>
              )}

              <FormTextField name='vigenciaDesde' label='Fecha de inicio' type='date' required />
              <FormTextField name='vigenciaHasta' label='Fecha de término' type='date' description='Vacío = sin término' />
            </div>

            {modelo ? (
              <ValoresEditor modeloTarifa={modelo} valores={valores} onChange={setValores} conSuplemento={false} />
            ) : (
              <p className='text-muted-foreground text-sm'>Elige un servicio para definir los valores.</p>
            )}
          </CardContent>
        </Card>

        <div className='flex items-center justify-end gap-3'>
          <Button type='button' variant='outline' onClick={() => router.push('/config/tarifas-venta')}>
            Cancelar
          </Button>
          <Button type='submit' isLoading={mutation.isPending}>
            <Icons.check className='mr-2 h-4 w-4' />
            {isEditar ? 'Guardar cambios' : mode.kind === 'nueva-version' ? 'Crear nueva versión' : 'Crear tarifa'}
          </Button>
        </div>
      </form.Form>
    </form.AppForm>
  );
}
