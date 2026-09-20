'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { useAppForm, useFormFields } from '@/components/ui/tanstack-form';
import { usePuedeEscribir } from '@/hooks/use-item-acceso';
import { SoloLectura } from '@/components/shared/solo-lectura';
import { proveedoresListOptions } from '@/features/proveedores/queries';
import { ProveedorQuickCreate } from '@/features/proveedores/components/proveedor-quick-create';
import { serviciosListOptions } from '@/features/servicios/queries';
import { ServicioQuickCreate } from '@/features/servicios/components/servicio-quick-create';
import { tarifarioDetailOptions, tarifasKeys } from '../queries';
import { tarifasService } from '../service';
import { ValoresEditor, FILA_VACIA, type FilaValor } from './valores-editor';
import type {
  Moneda,
  ModeloTarifa,
  Acomodacion,
  TarifarioValorInput,
  TarifarioNuevaVersionInput,
  TarifarioConAdvertencias
} from '../types';

const MONEDA_OPTIONS: { value: Moneda; label: string }[] = [
  { value: 'USD', label: 'USD' },
  { value: 'CLP', label: 'CLP' }
];

const cabeceraSchema = z.object({
  proveedorId: z.coerce.number().int().positive('El proveedor es requerido'),
  moneda: z.enum(['CLP', 'USD']),
  vigenciaDesde: z.string().min(1, 'La vigencia desde es requerida'),
  vigenciaHasta: z.string().optional()
});
type CabeceraValues = z.infer<typeof cabeceraSchema>;

// El backend valida RN-TAR-02/RN-TAR-07 con la BD — acá solo se chequea forma
// mínima antes de mandar el payload (que cada fila tenga sus campos base).
function valoresListosParaEnviar(modelo: ModeloTarifa | null, filas: FilaValor[]): boolean {
  if (!modelo) return false;
  if (modelo === 'UNITARIO_PAX') return !!filas[0]?.valor;
  if (modelo === 'ACOMODACION') return filas.some((f) => f.acomodacion && f.valor);
  return filas.some((f) => f.paxDesde && f.valor);
}

function construirValoresPayload(modelo: ModeloTarifa, filas: FilaValor[]): TarifarioValorInput[] {
  if (modelo === 'UNITARIO_PAX') {
    return [{ modelo, valor: filas[0]!.valor }];
  }
  if (modelo === 'ACOMODACION') {
    return filas
      .filter((f) => f.acomodacion && f.valor)
      .map((f) => ({
        modelo,
        acomodacion: f.acomodacion as Acomodacion,
        valor: f.valor,
        ...(f.suplementoSingle ? { suplementoSingle: f.suplementoSingle } : {})
      }));
  }
  return filas
    .filter((f) => f.paxDesde && f.valor)
    .map((f) => ({
      modelo,
      paxDesde: Number(f.paxDesde),
      paxHasta: f.paxHasta ? Number(f.paxHasta) : null,
      valor: f.valor
    }));
}

type TarifarioFormMode = { kind: 'nuevo' } | { kind: 'nueva-version'; tarifarioId: number };

export function TarifarioForm({ mode }: { mode: TarifarioFormMode }) {
  const isNuevaVersion = mode.kind === 'nueva-version';
  const router = useRouter();
  const queryClient = useQueryClient();
  const puedeEscribir = usePuedeEscribir('TARIFAS');

  const { data: anterior, isLoading: cargandoAnterior } = useQuery(
    tarifarioDetailOptions(mode.kind === 'nueva-version' ? mode.tarifarioId : 0)
  );
  const { data: proveedoresData } = useQuery(proveedoresListOptions({ limit: 200 }));
  const { data: serviciosData } = useQuery(serviciosListOptions({ limit: 200 }));
  const proveedores = proveedoresData?.data ?? [];
  const servicios = serviciosData?.data ?? [];

  const [valores, setValores] = useState<FilaValor[]>([{ ...FILA_VACIA }]);
  const [modeloTarifaActual, setModeloTarifaActual] = useState<ModeloTarifa | null>(null);
  // Varios servicios pueden compartir la misma tarifa (mismo proveedor,
  // vigencia y valores) — se crea un Tarifario independiente por cada uno.
  // Solo aplica en modo "nuevo": nueva-version está atada a un único id.
  const [servicioIds, setServicioIds] = useState<number[]>([]);

  const form = useAppForm({
    defaultValues: {
      proveedorId: 0,
      moneda: 'USD',
      vigenciaDesde: '',
      vigenciaHasta: ''
    } as CabeceraValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: cabeceraSchema as any },
    onSubmit: async ({ value }) => {
      if (!valoresListosParaEnviar(modeloTarifaActual, valores)) {
        toast.error('Completa al menos un valor antes de guardar');
        return;
      }
      if (mode.kind === 'nuevo' && servicioIds.length === 0) {
        toast.error('Selecciona al menos un servicio');
        return;
      }
      await mutation.mutateAsync(value);
    }
  });

  // Nueva versión: precarga cabecera y valores desde el tarifario que se versiona.
  useEffect(() => {
    if (mode.kind === 'nueva-version' && anterior) {
      form.setFieldValue('proveedorId', anterior.proveedorId);
      form.setFieldValue('moneda', anterior.moneda);
      // Precarga única al llegar la data async de `anterior` — mismo criterio
      // que el resto del efecto (ver servicio-form.tsx para el mismo patrón).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setModeloTarifaActual(anterior.servicio?.modeloTarifa ?? null);
      setValores(
        anterior.valores.map((v) => ({
          paxDesde: v.paxDesde != null ? String(v.paxDesde) : '',
          paxHasta: v.paxHasta != null ? String(v.paxHasta) : '',
          acomodacion: v.acomodacion ?? '',
          valor: v.valor,
          suplementoSingle: v.suplementoSingle ?? ''
        }))
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anterior, mode.kind]);

  const mutation = useMutation({
    mutationFn: async (cabecera: CabeceraValues) => {
      const valoresPayload = construirValoresPayload(modeloTarifaActual!, valores);
      if (mode.kind === 'nueva-version') {
        const payload: TarifarioNuevaVersionInput = {
          moneda: cabecera.moneda,
          vigenciaDesde: cabecera.vigenciaDesde,
          ...(cabecera.vigenciaHasta ? { vigenciaHasta: cabecera.vigenciaHasta } : {}),
          valores: valoresPayload
        };
        return { tipo: 'nueva-version' as const, resultado: await tarifasService.nuevaVersion(mode.tarifarioId, payload) };
      }
      // Un POST /tarifas por servicio seleccionado: son tarifarios
      // independientes (cada uno con su propia validación RN-TAR-07 por
      // proveedor+servicio), así que uno puede fallar sin tumbar a los demás.
      const resultados = await Promise.allSettled(
        servicioIds.map((servicioId) =>
          tarifasService.create({
            proveedorId: cabecera.proveedorId,
            servicioId,
            moneda: cabecera.moneda,
            vigenciaDesde: cabecera.vigenciaDesde,
            ...(cabecera.vigenciaHasta ? { vigenciaHasta: cabecera.vigenciaHasta } : {}),
            valores: valoresPayload
          })
        )
      );
      return { tipo: 'nuevo' as const, servicioIds, resultados };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: tarifasKeys.all });

      if (data.tipo === 'nueva-version') {
        toast.success('Nueva versión creada');
        data.resultado.advertencias.forEach((a) => toast.warning(a.mensaje));
        router.push(`/config/tarifas/${data.resultado.id}`);
        return;
      }

      const exitosos: TarifarioConAdvertencias[] = [];
      data.resultados.forEach((r, i) => {
        const servicio = servicios.find((s) => s.id === data.servicioIds[i]);
        if (r.status === 'fulfilled') {
          exitosos.push(r.value);
          r.value.advertencias.forEach((a) => toast.warning(`${servicio?.nombre ?? 'Servicio'}: ${a.mensaje}`));
        } else {
          toast.error(`${servicio?.nombre ?? 'Servicio'}: ${(r.reason as Error)?.message || 'Error al crear'}`);
        }
      });

      if (exitosos.length > 0) {
        toast.success(exitosos.length === 1 ? 'Tarifario creado' : `${exitosos.length} tarifarios creados`);
        router.push(exitosos.length === 1 ? `/config/tarifas/${exitosos[0]!.id}` : '/config/tarifas');
      }
      // Si todos fallaron, se queda en el formulario para reintentar.
    },
    onError: (e: Error) => toast.error(e.message || 'Error al guardar el tarifario')
  });

  const { FormSelectField, FormTextField } = useFormFields<CabeceraValues>();

  if (isNuevaVersion && cargandoAnterior) {
    return (
      <div className='space-y-4'>
        <div className='bg-muted h-10 animate-pulse rounded' />
        <div className='bg-muted h-10 animate-pulse rounded' />
      </div>
    );
  }

  if (!puedeEscribir) {
    return <SoloLectura mensaje='Tu perfil solo tiene acceso de lectura a Tarifas. No puedes crear ni versionar tarifarios.' />;
  }

  return (
    <form.AppForm>
      <form.Form id='tarifario-form' className='space-y-6'>
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Datos del tarifario</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid gap-4 sm:grid-cols-2'>
              {isNuevaVersion ? (
                <>
                  <div className='space-y-1.5 sm:col-span-2'>
                    <Label>Proveedor</Label>
                    <p className='text-sm font-medium'>{anterior?.proveedor?.razonSocial}</p>
                  </div>
                  <div className='space-y-1.5 sm:col-span-2'>
                    <Label>Servicio</Label>
                    <p className='text-sm font-medium'>{anterior?.servicio?.nombre}</p>
                  </div>
                </>
              ) : (
                <>
                  <form.Field name='proveedorId'>
                    {(field) => (
                      <div className='space-y-1.5 sm:col-span-2'>
                        <Label>
                          Proveedor <span className='text-destructive'>*</span>
                        </Label>
                        <div className='flex items-center gap-2'>
                          <Select
                            value={field.state.value ? String(field.state.value) : ''}
                            onValueChange={(v) => {
                              const id = Number.parseInt(v, 10);
                              if (Number.isFinite(id)) field.handleChange(id);
                            }}
                          >
                            <SelectTrigger className='flex-1'>
                              <SelectValue placeholder='Seleccionar proveedor...' />
                            </SelectTrigger>
                            <SelectContent>
                              {proveedores.map((p) => (
                                <SelectItem key={p.id} value={String(p.id)}>
                                  {p.razonSocial}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <ProveedorQuickCreate
                            onCreated={(nuevo) => {
                              queryClient.invalidateQueries({ queryKey: ['proveedores'] });
                              form.setFieldValue('proveedorId', nuevo.id);
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </form.Field>

                  <div className='space-y-1.5 sm:col-span-2'>
                    <Label>
                      Servicios <span className='text-destructive'>*</span>
                    </Label>
                    <p className='text-muted-foreground text-xs'>
                      Selecciona varios si comparten la misma tarifa — se crea un tarifario por cada uno.
                    </p>
                    <div className='flex flex-wrap items-center gap-2'>
                      {servicios.map((s) => {
                        const activo = servicioIds.includes(s.id);
                        const bloqueado = !activo && modeloTarifaActual != null && s.modeloTarifa !== modeloTarifaActual;
                        return (
                          <Badge
                            key={s.id}
                            variant={activo ? 'default' : 'outline'}
                            className={cn('cursor-pointer select-none', bloqueado && 'cursor-not-allowed opacity-40')}
                            title={bloqueado ? 'No comparte el mismo modelo de tarifa que los ya seleccionados' : undefined}
                            onClick={() => {
                              if (bloqueado) return;
                              const nuevos = activo ? servicioIds.filter((id) => id !== s.id) : [...servicioIds, s.id];
                              setServicioIds(nuevos);
                              const primero = nuevos[0] ? servicios.find((x) => x.id === nuevos[0]) : undefined;
                              setModeloTarifaActual(primero?.modeloTarifa ?? null);
                              if (nuevos.length <= 1) setValores([{ ...FILA_VACIA }]);
                            }}
                          >
                            {s.nombre}
                          </Badge>
                        );
                      })}
                      <ServicioQuickCreate
                        onCreated={(nuevo) => {
                          queryClient.invalidateQueries({ queryKey: ['servicios'] });
                          const nuevos = [...servicioIds, nuevo.id];
                          setServicioIds(nuevos);
                          if (nuevos.length === 1) {
                            setModeloTarifaActual(nuevo.modeloTarifa);
                            setValores([{ ...FILA_VACIA }]);
                          }
                        }}
                      />
                    </div>
                  </div>
                </>
              )}

              <FormTextField name='vigenciaDesde' label='Vigencia desde' type='date' required />
              <FormTextField name='vigenciaHasta' label='Vigencia hasta' type='date' description='Vacío = sin término' />
              <FormSelectField name='moneda' label='Moneda' required options={MONEDA_OPTIONS} placeholder='Seleccionar...' />
            </div>

            {modeloTarifaActual ? (
              <ValoresEditor modeloTarifa={modeloTarifaActual} valores={valores} onChange={setValores} />
            ) : (
              <p className='text-muted-foreground text-sm'>Elige uno o más servicios para definir los valores.</p>
            )}
          </CardContent>
        </Card>

        <div className='flex items-center justify-end gap-3'>
          <Button type='button' variant='outline' onClick={() => router.push('/config/tarifas')}>
            Cancelar
          </Button>
          <Button type='submit' isLoading={mutation.isPending}>
            <Icons.check className='mr-2 h-4 w-4' />
            {isNuevaVersion ? 'Crear nueva versión' : servicioIds.length > 1 ? `Crear ${servicioIds.length} tarifarios` : 'Crear tarifario'}
          </Button>
        </div>
      </form.Form>
    </form.AppForm>
  );
}
