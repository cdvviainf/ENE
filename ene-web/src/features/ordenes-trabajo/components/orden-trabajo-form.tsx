'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@tanstack/react-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { MultiCombobox } from '@/components/ui/multi-combobox';
import { Icons } from '@/components/icons';
import { useAppForm, useFormFields } from '@/components/ui/tanstack-form';
import { usePuedeEscribir } from '@/hooks/use-item-acceso';
import { SoloLectura } from '@/components/shared/solo-lectura';
import { formatMonto } from '@/lib/dinero';
import { porcentajeAFraccion, recortarDecimales } from '@/lib/porcentaje';
import { clientesListOptions, clienteDetailOptions } from '@/features/clientes/queries';
import { negociosListOptions, negociosKeys } from '@/features/negocios/queries';
import { NegocioQuickCreate } from '@/features/negocios/components/negocio-quick-create';
import { zonasListOptions } from '@/features/zonas/queries';
import { serviciosListOptions } from '@/features/servicios/queries';
import { proveedoresListOptions } from '@/features/proveedores/queries';
import { ordenesTrabajoService } from '../service';
import { ordenesTrabajoKeys } from '../queries';
import {
  ACOMODACION_LABELS,
  AREA_LABELS,
  type Acomodacion,
  type AreaNegocio,
  type Bloque,
  type EstadoServicio,
  type LineaVersionInput,
  type Moneda,
  type TipoLinea
} from '../types';

const cabeceraSchema = z.object({
  clienteId: z.number().int().positive({ message: 'Selecciona un cliente' }),
  ejecutivoId: z.number().int().positive().nullable(),
  negocioId: z.number().int().positive({ message: 'Selecciona un negocio' }),
  apellido: z.string().trim().min(1, 'El apellido es obligatorio (RN-OT-03)'),
  areaNegocio: z.enum(['RECEPTIVO', 'EVENTOS']),
  zonaIds: z.array(z.number().int().positive()).default([]),
  fechaOperacion: z.string().min(1, 'La fecha es requerida'),
  cantidadPax: z.coerce.number().int().min(1),
  moneda: z.enum(['CLP', 'USD']),
  tipoCambio: z.string().regex(/^\d+(\.\d+)?$/, 'Tipo de cambio inválido')
});
type CabeceraValues = z.infer<typeof cabeceraSchema>;

// Fila editable del itinerario de la OT: el costo se precarga del tarifario
// (ayuda de captura) y queda editable; el margen va en porcentaje.
interface Row {
  _key: string;
  dia: number;
  bloque: Bloque;
  orden: number;
  tipoLinea: TipoLinea;
  servicioId?: number;
  proveedorId?: number;
  acomodacion?: Acomodacion;
  cantidadPax: number;
  descripcion: string;
  descripcionEn?: string;
  costoTeorico: string;
  margenPct: string; // porcentaje, ej. '50'
  // RN-COT-11 / "el precio ingresado manda": si el usuario fija la venta, viaja
  // como ventaObjetivo y el backend la persiste exacta derivando el margen.
  ventaObjetivo?: string;
  estadoServicio: EstadoServicio;
}

function payloadDe(rows: Row[]): LineaVersionInput[] {
  return rows.map((r, i) => ({
    dia: r.dia,
    bloque: r.bloque,
    orden: i,
    tipoLinea: r.tipoLinea,
    servicioId: r.tipoLinea === 'ESTANDAR' ? r.servicioId : undefined,
    proveedorId: r.tipoLinea === 'ESTANDAR' ? r.proveedorId : undefined,
    acomodacion: r.tipoLinea === 'ESTANDAR' ? r.acomodacion : undefined,
    cantidadPax: r.cantidadPax,
    descripcion: r.descripcion,
    descripcionEn: r.descripcionEn,
    costoTeorico: r.costoTeorico,
    ...(r.ventaObjetivo
      ? { ventaObjetivo: r.ventaObjetivo }
      : { margenPct: porcentajeAFraccion(r.margenPct || '0') }),
    estadoServicio: r.estadoServicio
  }));
}

export function OrdenTrabajoForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const puedeEscribir = usePuedeEscribir('ORDENES_TRABAJO');

  const { data: clientesData } = useQuery(clientesListOptions({ limit: 200 }));
  const { data: negociosData } = useQuery(negociosListOptions({ limit: 200 }));
  const { data: zonasData } = useQuery(zonasListOptions({ limit: 200 }));
  const clientes = clientesData?.data ?? [];
  const negocios = negociosData?.data ?? [];
  const zonas = zonasData?.data ?? [];

  const [rows, setRows] = useState<Row[]>([]);

  const mutation = useMutation({
    mutationFn: (values: CabeceraValues) =>
      ordenesTrabajoService.crearDirecta({
        clienteId: values.clienteId,
        ejecutivoId: values.ejecutivoId ?? undefined,
        negocioId: values.negocioId,
        apellido: values.apellido.trim(),
        areaNegocio: values.areaNegocio,
        zonaIds: values.zonaIds,
        fechaOperacion: values.fechaOperacion,
        cantidadPax: values.cantidadPax,
        moneda: values.moneda,
        tipoCambio: values.tipoCambio,
        lineas: payloadDe(rows)
      }),
    onSuccess: (ot) => {
      toast.success(`Orden de Trabajo ${ot.numero} creada`);
      queryClient.invalidateQueries({ queryKey: ordenesTrabajoKeys.all });
      router.push(`/ordenes-trabajo/${ot.id}`);
    },
    onError: (e: Error) => toast.error(e.message || 'Error al crear la OT')
  });

  const form = useAppForm({
    defaultValues: {
      clienteId: 0 as number,
      ejecutivoId: null as number | null,
      negocioId: 0 as number,
      apellido: '',
      areaNegocio: 'RECEPTIVO' as AreaNegocio,
      zonaIds: [] as number[],
      fechaOperacion: '',
      cantidadPax: 1,
      moneda: 'USD' as Moneda,
      tipoCambio: '950'
    } as CabeceraValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: cabeceraSchema as any },
    onSubmit: async ({ value }) => {
      if (rows.length === 0) {
        toast.error('La OT debe tener al menos una línea');
        return;
      }
      await mutation.mutateAsync(value);
    }
  });

  // Ejecutivos del cliente elegido (RN-OT: el ejecutivo pertenece al cliente).
  const clienteIdSel = useStore(form.store, (s) => s.values.clienteId);
  const { data: clienteSel } = useQuery({ ...clienteDetailOptions(clienteIdSel), enabled: clienteIdSel > 0 });
  const ejecutivos = clienteSel?.ejecutivos ?? [];
  useEffect(() => {
    if (clienteIdSel <= 0 || form.state.values.ejecutivoId != null) return;
    const activos = ejecutivos.filter((e) => e.activo);
    const porDefecto = activos.find((e) => e.esRepresentanteLegal) ?? (activos.length === 1 ? activos[0] : undefined);
    if (porDefecto) form.setFieldValue('ejecutivoId', porDefecto.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteSel]);

  // Contexto de costeo que el diálogo de línea usa para el preview del tarifario.
  const moneda = useStore(form.store, (s) => s.values.moneda);
  const fechaOperacion = useStore(form.store, (s) => s.values.fechaOperacion);
  const tipoCambio = useStore(form.store, (s) => s.values.tipoCambio);
  const cantidadPaxCab = useStore(form.store, (s) => s.values.cantidadPax);
  const costeoCtx = useMemo(
    () => ({ fechaOperacion, moneda, tipoCambio }),
    [fechaOperacion, moneda, tipoCambio]
  );

  const { FormTextField } = useFormFields<CabeceraValues>();

  function agregar(row: Omit<Row, '_key'>) {
    setRows((prev) => [...prev, { ...row, _key: `new-${Date.now()}-${prev.length}` }]);
  }
  function editar(key: string, row: Omit<Row, '_key'>) {
    setRows((prev) => prev.map((r) => (r._key === key ? { ...row, _key: key } : r)));
  }
  function quitar(key: string) {
    setRows((prev) => prev.filter((r) => r._key !== key));
  }

  const porDia = useMemo(() => {
    const map = new Map<number, Row[]>();
    for (const r of rows) {
      if (!map.has(r.dia)) map.set(r.dia, []);
      map.get(r.dia)!.push(r);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [rows]);

  if (!puedeEscribir) {
    return <SoloLectura mensaje='Tu perfil solo tiene acceso de lectura a Órdenes de Trabajo. No puedes crear OT.' />;
  }

  return (
    <form.AppForm>
      <form.Form id='orden-trabajo-form' className='space-y-6'>
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Datos de la orden de trabajo</CardTitle>
          </CardHeader>
          <CardContent className='grid gap-4 sm:grid-cols-2'>
            <form.Field name='clienteId'>
              {(field) => (
                <div className='space-y-1.5'>
                  <Label>Cliente *</Label>
                  <Combobox
                    options={clientes.map((c) => ({ value: String(c.id), label: `${c.razonSocial} (${c.codigo})` }))}
                    value={field.state.value ? String(field.state.value) : null}
                    onChange={(v) => {
                      const id = Number.parseInt(v, 10);
                      if (Number.isFinite(id)) {
                        field.handleChange(id);
                        form.setFieldValue('ejecutivoId', null);
                        // Si el negocio elegido pertenece a otro cliente, se limpia.
                        const negSel = negocios.find((g) => g.id === form.state.values.negocioId);
                        if (negSel?.clienteId != null && negSel.clienteId !== id) form.setFieldValue('negocioId', 0);
                      }
                    }}
                    placeholder='Selecciona un cliente...'
                    searchPlaceholder='Buscar cliente...'
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className='text-destructive text-sm'>{String(field.state.meta.errors[0])}</p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field name='ejecutivoId'>
              {(field) => (
                <div className='space-y-1.5'>
                  <Label>Ejecutivo</Label>
                  <Combobox
                    options={[
                      { value: '__none__', label: 'Sin ejecutivo' },
                      ...ejecutivos.map((e) => ({ value: String(e.id), label: e.nombre }))
                    ]}
                    value={field.state.value ? String(field.state.value) : null}
                    onChange={(v) => {
                      if (v === '__none__') return field.handleChange(null);
                      const id = Number.parseInt(v, 10);
                      if (Number.isFinite(id)) field.handleChange(id);
                    }}
                    disabled={clienteIdSel <= 0}
                    placeholder={clienteIdSel > 0 ? 'Selecciona un ejecutivo...' : 'Elige un cliente primero'}
                    searchPlaceholder='Buscar ejecutivo...'
                  />
                </div>
              )}
            </form.Field>

            <form.Field name='negocioId'>
              {(field) => (
                <div className='space-y-1.5'>
                  <Label>Negocio *</Label>
                  <div className='flex items-center gap-2'>
                    <Combobox
                      className='flex-1'
                      // Solo negocios del cliente elegido o sin cliente (RN-GRP-05);
                      // el backend rechaza uno de otro cliente.
                      options={negocios
                        .filter((g) => g.clienteId == null || clienteIdSel <= 0 || g.clienteId === clienteIdSel)
                        .map((g) => ({ value: String(g.id), label: `${g.apellido} (${g.codigo})` }))}
                      value={field.state.value ? String(field.state.value) : null}
                      onChange={(v) => {
                        const id = Number.parseInt(v, 10);
                        if (Number.isFinite(id)) {
                          field.handleChange(id);
                          const neg = negocios.find((g) => g.id === id);
                          // RN-OT-03: el apellido del negocio es el identificador
                          // operativo; se precarga y la cantidad de pax se sugiere.
                          if (neg) {
                            if (neg.apellido) form.setFieldValue('apellido', neg.apellido);
                            if (neg.cantidadPax >= 1) form.setFieldValue('cantidadPax', neg.cantidadPax);
                          }
                        }
                      }}
                      placeholder='Selecciona un negocio...'
                      searchPlaceholder='Buscar negocio...'
                    />
                    <NegocioQuickCreate
                      clienteId={clienteIdSel > 0 ? clienteIdSel : null}
                      onCreated={(nuevo) => {
                        queryClient.invalidateQueries({ queryKey: negociosKeys.all });
                        field.handleChange(nuevo.id);
                        if (nuevo.apellido) form.setFieldValue('apellido', nuevo.apellido);
                        if (nuevo.cantidadPax >= 1) form.setFieldValue('cantidadPax', nuevo.cantidadPax);
                      }}
                    />
                  </div>
                  {field.state.meta.errors.length > 0 && (
                    <p className='text-destructive text-sm'>{String(field.state.meta.errors[0])}</p>
                  )}
                </div>
              )}
            </form.Field>

            <FormTextField name='apellido' label='Apellido del grupo' required />

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

            <form.Field name='areaNegocio'>
              {(field) => (
                <div className='space-y-1.5'>
                  <Label>Área de negocio *</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={(v) => {
                      const area = v as AreaNegocio;
                      field.handleChange(area);
                      // RN-MON-01: sugerencia de moneda por área (editable).
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between'>
            <CardTitle className='text-base'>Itinerario</CardTitle>
            <LineaDialog
              moneda={moneda}
              costeoCtx={costeoCtx}
              cantidadPaxDefault={cantidadPaxCab}
              onSubmit={agregar}
              trigger={
                <Button type='button' size='sm' variant='outline'>
                  <Icons.add className='mr-2 h-4 w-4' />
                  Agregar línea
                </Button>
              }
            />
          </CardHeader>
          <CardContent className='space-y-3'>
            {porDia.length === 0 ? (
              <p className='text-muted-foreground text-sm'>Sin líneas. Agrega al menos una.</p>
            ) : (
              porDia.map(([dia, rowsDia]) => (
                <div key={dia} className='rounded-md border'>
                  <div className='bg-muted/50 border-b px-3 py-1.5 text-sm font-semibold'>Día {dia}</div>
                  <ul className='divide-y'>
                    {rowsDia.map((r) => (
                      <li key={r._key} className='flex items-center justify-between gap-2 px-3 py-2 text-sm'>
                        <span className='flex min-w-0 flex-wrap items-center gap-2'>
                          <Badge variant='outline' className='shrink-0'>
                            {r.bloque}
                          </Badge>
                          <Badge variant='outline' className='shrink-0'>
                            {r.tipoLinea === 'OTRO' ? 'Otro' : 'Servicio'}
                          </Badge>
                          <span className='truncate'>{r.descripcion || '(sin descripción)'}</span>
                          {r.acomodacion && (
                            <span className='text-muted-foreground text-xs'>· {ACOMODACION_LABELS[r.acomodacion]}</span>
                          )}
                          <span className='text-muted-foreground text-xs'>· {r.cantidadPax} pax</span>
                          <span className='text-muted-foreground text-xs'>
                            · costo {formatMonto(r.costoTeorico, moneda)} ·{' '}
                            {r.ventaObjetivo
                              ? `venta ${formatMonto(r.ventaObjetivo, moneda)}`
                              : `margen ${r.margenPct || '0'}%`}
                          </span>
                        </span>
                        <span className='flex shrink-0 items-center gap-1'>
                          <LineaDialog
                            moneda={moneda}
                            costeoCtx={costeoCtx}
                            cantidadPaxDefault={cantidadPaxCab}
                            initial={r}
                            onSubmit={(row) => editar(r._key, row)}
                            trigger={
                              <Button type='button' variant='ghost' size='icon' className='h-7 w-7' title='Editar'>
                                <Icons.edit className='h-4 w-4' />
                              </Button>
                            }
                          />
                          <Button type='button' variant='ghost' size='icon' className='h-7 w-7' title='Quitar' onClick={() => quitar(r._key)}>
                            <Icons.trash className='h-4 w-4' />
                          </Button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className='flex items-center justify-end gap-3'>
          <Button type='button' variant='outline' onClick={() => router.push('/ordenes-trabajo')}>
            Cancelar
          </Button>
          <Button type='submit' isLoading={mutation.isPending}>
            <Icons.check className='mr-2 h-4 w-4' />
            Crear OT
          </Button>
        </div>
      </form.Form>
    </form.AppForm>
  );
}

// Diálogo para agregar/editar una línea de la OT directa. Para una línea de
// servicio (ESTANDAR) precarga el costo del tarifario vigente (preview) y lo
// deja editable; la venta la deriva el backend del margen.
function LineaDialog({
  moneda,
  costeoCtx,
  cantidadPaxDefault,
  initial,
  trigger,
  onSubmit
}: {
  moneda: Moneda;
  costeoCtx: { fechaOperacion: string; moneda: Moneda; tipoCambio: string };
  cantidadPaxDefault: number;
  initial?: Row;
  trigger: React.ReactNode;
  onSubmit: (row: Omit<Row, '_key'>) => void;
}) {
  const esEdicion = initial != null;
  const [open, setOpen] = useState(false);
  const [dia, setDia] = useState('1');
  const [bloque, setBloque] = useState<Bloque>('AM');
  const [tipoLinea, setTipoLinea] = useState<TipoLinea>('ESTANDAR');
  const [servicioId, setServicioId] = useState<number | undefined>();
  const [proveedorId, setProveedorId] = useState<number | undefined>();
  const [acomodacion, setAcomodacion] = useState<Acomodacion | undefined>();
  const [cantidadPax, setCantidadPax] = useState(String(cantidadPaxDefault));
  const [descripcion, setDescripcion] = useState('');
  const [descripcionEn, setDescripcionEn] = useState('');
  const [costoTeorico, setCostoTeorico] = useState('');
  const [margenPct, setMargenPct] = useState('');
  const [ventaObjetivo, setVentaObjetivo] = useState('');
  const [estadoServicio, setEstadoServicio] = useState<EstadoServicio>('PENDIENTE');
  // true cuando el usuario escribió el costo a mano: el preview ya no lo pisa.
  const [costoTocado, setCostoTocado] = useState(false);
  const [previewMsg, setPreviewMsg] = useState<string | null>(null);
  const [previewCargando, setPreviewCargando] = useState(false);
  const previewReqId = useRef(0);

  const { data: serviciosData } = useQuery({ ...serviciosListOptions({ limit: 500 }), enabled: open });
  const servicios = serviciosData?.data ?? [];
  const servicioSel = servicios.find((s) => s.id === servicioId);
  const esAcomodacion = servicioSel?.modeloTarifa === 'ACOMODACION';
  const tipoServicioId = servicioSel?.tipoServicioId;

  const { data: proveedoresData } = useQuery({
    ...proveedoresListOptions({ limit: 500, ...(tipoServicioId ? { tipoServicioId } : {}) }),
    enabled: open && tipoServicioId != null
  });
  const proveedores = proveedoresData?.data ?? [];

  const diaN = Number.parseInt(dia, 10);
  const paxN = Number.parseInt(cantidadPax, 10);
  const ctxCompleto = !!costeoCtx.fechaOperacion && /^\d+(\.\d+)?$/.test(costeoCtx.tipoCambio);
  const listoParaPreview =
    tipoLinea === 'ESTANDAR' &&
    servicioId != null &&
    proveedorId != null &&
    (!esAcomodacion || acomodacion != null) &&
    Number.isFinite(paxN) &&
    paxN >= 1 &&
    Number.isFinite(diaN) &&
    diaN >= 1 &&
    ctxCompleto;

  function sembrar() {
    if (initial) {
      setDia(String(initial.dia));
      setBloque(initial.bloque);
      setTipoLinea(initial.tipoLinea);
      setServicioId(initial.servicioId);
      setProveedorId(initial.proveedorId);
      setAcomodacion(initial.acomodacion);
      setCantidadPax(String(initial.cantidadPax));
      setDescripcion(initial.descripcion);
      setDescripcionEn(initial.descripcionEn ?? '');
      setCostoTeorico(initial.costoTeorico);
      setMargenPct(initial.margenPct);
      setVentaObjetivo(initial.ventaObjetivo ?? '');
      setEstadoServicio(initial.estadoServicio);
      setCostoTocado(true); // respeta el costo ya cargado; no lo pisa el preview
    } else {
      setDia('1');
      setBloque('AM');
      setTipoLinea('ESTANDAR');
      setServicioId(undefined);
      setProveedorId(undefined);
      setAcomodacion(undefined);
      setCantidadPax(String(cantidadPaxDefault));
      setDescripcion('');
      setDescripcionEn('');
      setCostoTeorico('');
      setMargenPct('');
      setVentaObjetivo('');
      setEstadoServicio('PENDIENTE');
      setCostoTocado(false);
    }
    setPreviewMsg(null);
  }

  // Precarga el costo del tarifario vigente al tener servicio+proveedor+pax+día
  // (y acomodación si aplica). No pisa un costo escrito a mano (costoTocado).
  useEffect(() => {
    if (!open || !listoParaPreview || costoTocado) return;
    const reqId = ++previewReqId.current;
    const t = setTimeout(async () => {
      setPreviewCargando(true);
      try {
        const res = await ordenesTrabajoService.previewCosto({
          fechaOperacion: costeoCtx.fechaOperacion,
          moneda: costeoCtx.moneda,
          tipoCambio: costeoCtx.tipoCambio,
          dia: diaN,
          servicioId: servicioId!,
          proveedorId: proveedorId!,
          acomodacion: esAcomodacion ? acomodacion : undefined,
          cantidadPax: paxN
        });
        if (reqId !== previewReqId.current) return;
        if (!res.disponible) {
          setPreviewMsg(res.motivo);
        } else {
          setCostoTeorico(recortarDecimales(res.costoTotal));
          setPreviewMsg(
            res.advertenciaVigencia
              ? 'El tarifario vigente no cubre exactamente la fecha; se usó el más reciente (RN-TAR-05).'
              : null
          );
        }
      } catch (e) {
        if (reqId !== previewReqId.current) return;
        setPreviewMsg((e as Error).message || 'No se pudo calcular el costo');
      } finally {
        if (reqId === previewReqId.current) setPreviewCargando(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [open, listoParaPreview, costoTocado, diaN, paxN, servicioId, proveedorId, acomodacion, esAcomodacion, costeoCtx]);

  function confirmar() {
    if (!Number.isFinite(diaN) || diaN < 1) return toast.error('Día inválido');
    if (!Number.isFinite(paxN) || paxN < 1) return toast.error('Cantidad de pasajeros inválida');
    if (!/^\d+(\.\d+)?$/.test(costoTeorico)) return toast.error('Costo inválido');
    if (margenPct && !/^\d+(\.\d+)?$/.test(margenPct)) return toast.error('Margen inválido (ej: 50)');
    if (ventaObjetivo && !/^\d+(\.\d+)?$/.test(ventaObjetivo)) return toast.error('Venta inválida');
    if (tipoLinea === 'ESTANDAR') {
      if (servicioId == null) return toast.error('Selecciona un servicio');
      if (proveedorId == null) return toast.error('Selecciona un proveedor');
      if (esAcomodacion && acomodacion == null) return toast.error('Selecciona la acomodación');
    } else if (!descripcion.trim()) {
      return toast.error('La descripción es obligatoria');
    }

    onSubmit({
      dia: diaN,
      bloque,
      orden: initial?.orden ?? 0,
      tipoLinea,
      servicioId: tipoLinea === 'ESTANDAR' ? servicioId : undefined,
      proveedorId: tipoLinea === 'ESTANDAR' ? proveedorId : undefined,
      acomodacion: tipoLinea === 'ESTANDAR' && esAcomodacion ? acomodacion : undefined,
      cantidadPax: paxN,
      descripcion: descripcion.trim() || servicioSel?.nombre || '',
      descripcionEn: descripcionEn.trim() || undefined,
      costoTeorico,
      margenPct: ventaObjetivo ? '' : margenPct,
      ventaObjetivo: ventaObjetivo || undefined,
      estadoServicio
    });
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) sembrar();
        setOpen(o);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className='max-h-[90vh] max-w-lg overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>{esEdicion ? 'Editar línea' : 'Agregar línea'}</DialogTitle>
        </DialogHeader>
        <div className='grid grid-cols-2 gap-3'>
          <div className='space-y-1.5'>
            <Label>Día</Label>
            <Input type='number' min={1} value={dia} onChange={(e) => setDia(e.target.value)} />
          </div>
          <div className='space-y-1.5'>
            <Label>Bloque</Label>
            <Select value={bloque} onValueChange={(v) => setBloque(v as Bloque)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='AM'>Mañana (AM)</SelectItem>
                <SelectItem value='PM'>Tarde (PM)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className='col-span-2 space-y-1.5'>
            <Label>Tipo de línea</Label>
            <Select
              value={tipoLinea}
              onValueChange={(v) => {
                setTipoLinea(v as TipoLinea);
                if (v === 'OTRO') {
                  setServicioId(undefined);
                  setProveedorId(undefined);
                  setAcomodacion(undefined);
                }
                setCostoTocado(v === 'OTRO'); // OTRO: costo siempre digitado
                setPreviewMsg(null);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='ESTANDAR'>Servicio (costo del tarifario)</SelectItem>
                <SelectItem value='OTRO'>Otro (costo digitado)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {tipoLinea === 'ESTANDAR' && (
            <>
              <div className='col-span-2 space-y-1.5'>
                <Label>Servicio</Label>
                <Combobox
                  options={servicios.map((s) => ({ value: String(s.id), label: `${s.nombre} (${s.codigo})` }))}
                  value={servicioId ? String(servicioId) : null}
                  onChange={(v) => {
                    const id = Number.parseInt(v, 10);
                    if (Number.isFinite(id)) {
                      setServicioId(id);
                      setProveedorId(undefined);
                      setAcomodacion(undefined);
                      setCostoTocado(false); // re-precargar el costo del tarifario
                    }
                  }}
                  placeholder='Selecciona un servicio...'
                  searchPlaceholder='Buscar servicio...'
                />
              </div>
              <div className='col-span-2 space-y-1.5'>
                <Label>Proveedor</Label>
                <Combobox
                  options={proveedores.map((p) => ({ value: String(p.id), label: `${p.razonSocial} (${p.codigo})` }))}
                  value={proveedorId ? String(proveedorId) : null}
                  onChange={(v) => {
                    const id = Number.parseInt(v, 10);
                    if (Number.isFinite(id)) {
                      setProveedorId(id);
                      setCostoTocado(false);
                    }
                  }}
                  disabled={servicioId == null}
                  placeholder={servicioId == null ? 'Elige un servicio primero' : 'Selecciona un proveedor...'}
                  searchPlaceholder='Buscar proveedor...'
                />
              </div>
              {esAcomodacion && (
                <div className='col-span-2 space-y-1.5'>
                  <Label>Acomodación</Label>
                  <Select
                    value={acomodacion ?? ''}
                    onValueChange={(v) => {
                      setAcomodacion(v as Acomodacion);
                      setCostoTocado(false);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='Selecciona la acomodación...' />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ACOMODACION_LABELS) as Acomodacion[]).map((a) => (
                        <SelectItem key={a} value={a}>
                          {ACOMODACION_LABELS[a]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          <div className='col-span-2 space-y-1.5'>
            <Label>Descripción</Label>
            <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder='Descripción de la línea' />
          </div>
          <div className='col-span-2 space-y-1.5'>
            <Label>Descripción (inglés)</Label>
            <Input value={descripcionEn} onChange={(e) => setDescripcionEn(e.target.value)} placeholder='Opcional' />
          </div>

          <div className='space-y-1.5'>
            <Label>Pasajeros</Label>
            <Input
              type='number'
              min={1}
              value={cantidadPax}
              onChange={(e) => {
                setCantidadPax(e.target.value);
                setCostoTocado(false);
              }}
            />
          </div>
          <div className='space-y-1.5'>
            <Label>Costo teórico ({moneda})</Label>
            <Input
              value={costoTeorico}
              onChange={(e) => {
                setCostoTeorico(e.target.value.replace(/[^\d.]/g, ''));
                setCostoTocado(true);
              }}
              placeholder={previewCargando ? 'Calculando…' : '0'}
              inputMode='decimal'
            />
            {tipoLinea === 'ESTANDAR' && (
              <p className='text-muted-foreground text-xs'>
                Se precarga del tarifario vigente; puedes editarlo.
              </p>
            )}
          </div>
          <div className='space-y-1.5'>
            <Label>Margen</Label>
            <div className='relative'>
              <Input
                value={margenPct}
                onChange={(e) => setMargenPct(e.target.value.replace(/[^\d.]/g, ''))}
                placeholder={ventaObjetivo ? 'Se deriva de la venta' : 'Ej: 50'}
                disabled={!!ventaObjetivo}
                className='pr-6'
                inputMode='decimal'
              />
              <span className='text-muted-foreground pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-sm'>%</span>
            </div>
          </div>
          <div className='space-y-1.5'>
            <Label>Venta total ({moneda})</Label>
            <Input
              value={ventaObjetivo}
              onChange={(e) => setVentaObjetivo(e.target.value.replace(/[^\d.]/g, ''))}
              placeholder='Opcional'
              inputMode='decimal'
            />
            <p className='text-muted-foreground text-xs'>
              Si la ingresas, se guarda exacta y el margen se deriva (RN-COT-11).
            </p>
          </div>
          <div className='space-y-1.5'>
            <Label>Estado del servicio</Label>
            <Select value={estadoServicio} onValueChange={(v) => setEstadoServicio(v as EstadoServicio)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['PENDIENTE', 'TENTATIVO', 'CONFIRMADO', 'RECHAZADO', 'CANCELADO'] as EstadoServicio[]).map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {listoParaPreview && previewMsg && <p className='text-xs text-amber-600 dark:text-amber-400'>{previewMsg}</p>}

        <DialogFooter>
          <Button type='button' variant='outline' onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type='button' onClick={confirmar}>
            {esEdicion ? 'Guardar' : 'Agregar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
