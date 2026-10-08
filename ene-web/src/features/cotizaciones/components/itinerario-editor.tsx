'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { formatMonto } from '@/lib/dinero';
import { fraccionAPorcentaje, porcentajeAFraccion, recortarDecimales } from '@/lib/porcentaje';
import { serviciosListOptions } from '@/features/servicios/queries';
import { proveedoresListOptions } from '@/features/proveedores/queries';
import { formasPagoListOptions } from '@/features/formas-pago/queries';
import { cotizacionesService } from '../service';
import { cotizacionesKeys } from '../queries';
import {
  ACOMODACION_LABELS,
  FORMA_CALCULO_LABELS,
  type Acomodacion,
  type Bloque,
  type ContenidoVersionInput,
  type CotizacionLinea,
  type LineaInput,
  type Moneda
} from '../types';
import { RecalcularPaxDialog } from './recalcular-pax-dialog';

// Normaliza '' / null a undefined para no mandar strings vacíos como contenido.
function limpio(v: string): string | null {
  const t = v.trim();
  return t === '' ? null : t;
}

interface Row extends LineaInput {
  _key: string;
  _ventaTotal?: string;
}

function desdeServidor(lineas: CotizacionLinea[]): Row[] {
  return lineas.map((l, i) => ({
    _key: `srv-${l.id}-${i}`,
    _ventaTotal: l.ventaTotal,
    // RN-COS-06: conservar la identidad de la línea para que el backend
    // preserve su costo congelado en vez de re-cotizar.
    id: l.id,
    dia: l.dia,
    bloque: l.bloque,
    orden: l.orden,
    tipoLinea: l.tipoLinea,
    servicioId: l.servicioId ?? undefined,
    proveedorId: l.proveedorId ?? undefined,
    acomodacion: l.acomodacion ?? undefined,
    cantidadPax: l.cantidadPax,
    descripcion: l.descripcion,
    descripcionEn: l.descripcionEn ?? undefined,
    observacion: l.observacion ?? undefined,
    observacionEn: l.observacionEn ?? undefined,
    costoTotal: l.tipoLinea === 'OTRO' ? l.costoTotal : undefined,
    margenPct: l.margenPct
  }));
}

// 'borrador' escribe directo sobre la vigente (PUT); 'version' crea una versión
// nueva con motivo (renegociación, RN-VER-02); 'bloqueado' es solo lectura.
type ModoEditor = 'borrador' | 'version' | 'bloqueado';

interface ContenidoInicial {
  fechaVigencia: string | null;
  incluidos: string | null;
  noIncluidos: string | null;
  notasImportantes: string | null;
  formaPagoId: number | null;
}

interface Props {
  cotizacionId: number;
  lineas: CotizacionLinea[];
  moneda: Moneda;
  modo: ModoEditor;
  cantidadPaxDefault: number;
  contenidoInicial: ContenidoInicial;
}

// Solo la parte fecha (yyyy-mm-dd) de un ISO, para el <input type=date>.
function soloFecha(iso: string | null): string {
  return iso ? iso.slice(0, 10) : '';
}

export function ItinerarioEditor({ cotizacionId, lineas, moneda, modo, cantidadPaxDefault, contenidoInicial }: Props) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<Row[]>(() => desdeServidor(lineas));
  const [dirty, setDirty] = useState(false);

  // RN-PRV-11: retención/IVA referencial interna por línea (del tipo de documento
  // del proveedor). Se arma desde las líneas del servidor (traen el proveedor);
  // es solo informativo, no entra al PDF ni al presupuesto.
  const impuestoPorLineaId = useMemo(() => {
    const map = new Map<number, { label: string; pct: string }>();
    for (const l of lineas) {
      const td = l.proveedor?.tipoDocumento;
      if (td && td.formaCalculo !== 'NINGUNO') {
        map.set(l.id, { label: FORMA_CALCULO_LABELS[td.formaCalculo], pct: td.porcentaje });
      }
    }
    return map;
  }, [lineas]);

  // RN-COT-09/10/COS-08: contenido de encabezado del documento (vigencia,
  // comentarios, forma de pago). Estado local re-sembrado cuando cambia la
  // versión del servidor (mismo patrón render-vs-effect que las líneas).
  const { data: formasPagoData } = useQuery(formasPagoListOptions({ limit: 200 }));
  const formasPago = formasPagoData?.data ?? [];
  const [encabezadoDirty, setEncabezadoDirty] = useState(false);
  const [fechaVigencia, setFechaVigencia] = useState(soloFecha(contenidoInicial.fechaVigencia));
  const [incluidos, setIncluidos] = useState(contenidoInicial.incluidos ?? '');
  const [noIncluidos, setNoIncluidos] = useState(contenidoInicial.noIncluidos ?? '');
  const [notasImportantes, setNotasImportantes] = useState(contenidoInicial.notasImportantes ?? '');
  const [formaPagoId, setFormaPagoId] = useState<number | null>(contenidoInicial.formaPagoId);
  const contenidoSig = `${contenidoInicial.fechaVigencia ?? ''}|${contenidoInicial.incluidos ?? ''}|${contenidoInicial.noIncluidos ?? ''}|${contenidoInicial.notasImportantes ?? ''}|${contenidoInicial.formaPagoId ?? ''}`;
  const [contenidoSigSembrada, setContenidoSigSembrada] = useState(contenidoSig);
  if (contenidoSig !== contenidoSigSembrada && !encabezadoDirty) {
    setContenidoSigSembrada(contenidoSig);
    setFechaVigencia(soloFecha(contenidoInicial.fechaVigencia));
    setIncluidos(contenidoInicial.incluidos ?? '');
    setNoIncluidos(contenidoInicial.noIncluidos ?? '');
    setNotasImportantes(contenidoInicial.notasImportantes ?? '');
    setFormaPagoId(contenidoInicial.formaPagoId);
  }

  function contenidoActual(): ContenidoVersionInput {
    return {
      fechaVigencia: fechaVigencia ? fechaVigencia : null,
      incluidos: limpio(incluidos),
      noIncluidos: limpio(noIncluidos),
      notasImportantes: limpio(notasImportantes),
      formaPagoId: formaPagoId ?? null
    };
  }
  const [motivoOpen, setMotivoOpen] = useState(false);
  const [motivo, setMotivo] = useState('');
  // Margen global como PORCENTAJE tipeado por el usuario (ej. '50'); se persiste
  // por línea como fracción (RN-COS-02).
  const [margenGlobalPct, setMargenGlobalPct] = useState('');
  const editable = modo !== 'bloqueado';
  const sinLineas = rows.length === 0;
  // En BORRADOR el itinerario se escribe directo (RN-VER-08): cada cambio se
  // auto-guarda y el servidor devuelve los montos, así resumen, versión y PDF se
  // refrescan solos. Tras el envío (modo 'version') los cambios son una
  // renegociación con motivo obligatorio (RN-VER-02), así que NO se auto-guarda:
  // se acumulan y el usuario crea la versión explícitamente.
  const autoguardado = modo === 'borrador';

  // RN-COS-06: tras una mutación externa (p. ej. aplicar recálculo por pax, que
  // reemplaza las líneas y les cambia el id), las props traen líneas frescas. Si
  // no hay cambios locales sin guardar, re-sembramos `rows` con ellas para no
  // conservar ids obsoletos —que el server trataría como líneas nuevas y
  // re-cotizaría desde el maestro—. Con cambios pendientes NO se pisan. Se usa
  // el patrón de ajuste durante el render (no un efecto) recomendado por React
  // para reiniciar estado cuando cambian las props.
  const serverSig = useMemo(
    () => lineas.map((l) => `${l.id}:${l.costoTotal}:${l.ventaTotal}:${l.cantidadPax}:${l.margenPct}`).join('|'),
    [lineas]
  );
  const [sigSembrada, setSigSembrada] = useState(serverSig);
  if (serverSig !== sigSembrada && !dirty) {
    setSigSembrada(serverSig);
    setRows(desdeServidor(lineas));
  }

  function payloadDe(rowsFuente: Row[]): LineaInput[] {
    return rowsFuente.map((r, i) => ({
      id: r.id,
      dia: r.dia,
      bloque: r.bloque,
      orden: i,
      tipoLinea: r.tipoLinea,
      servicioId: r.servicioId,
      proveedorId: r.proveedorId,
      acomodacion: r.acomodacion,
      cantidadPax: r.cantidadPax,
      descripcion: r.descripcion,
      descripcionEn: r.descripcionEn,
      observacion: r.observacion,
      observacionEn: r.observacionEn,
      costoTotal: r.costoTotal,
      margenPct: r.margenPct
    }));
  }

  // Auto-guardado de BORRADOR: invalida detalle Y versiones para que el resumen,
  // el total de la versión y el PDF se refresquen (antes solo se invalidaba el
  // detalle y la versión quedaba en 0). Ante un error NO deja el cambio local
  // como si estuviera aplicado: restaura las filas confirmadas (`anterior`), para
  // que la lista no muestre un estado que el servidor rechazó (RN-VER-08).
  const saveMutation = useMutation({
    mutationFn: ({ next }: { next: Row[]; anterior: Row[] }) =>
      cotizacionesService.guardarItinerario(cotizacionId, payloadDe(next), contenidoActual()),
    onSuccess: (cot) => {
      setEncabezadoDirty(false);
      setRows(desdeServidor(cot.versionVigente?.lineas ?? []));
      queryClient.invalidateQueries({ queryKey: cotizacionesKeys.detail(cotizacionId) });
      queryClient.invalidateQueries({ queryKey: cotizacionesKeys.versiones(cotizacionId) });
    },
    onError: (e: Error, vars) => {
      setRows(vars.anterior);
      toast.error(e.message || 'No se pudo guardar el cambio; se revirtió');
    }
  });

  const versionMutation = useMutation({
    mutationFn: () =>
      cotizacionesService.nuevaVersion(cotizacionId, { motivo: motivo.trim(), lineas: payloadDe(rows), ...contenidoActual() }),
    onSuccess: (cot) => {
      toast.success('Nueva versión creada');
      setDirty(false);
      setEncabezadoDirty(false);
      setMotivo('');
      setMotivoOpen(false);
      setRows(desdeServidor(cot.versionVigente?.lineas ?? []));
      queryClient.invalidateQueries({ queryKey: cotizacionesKeys.detail(cotizacionId) });
      queryClient.invalidateQueries({ queryKey: cotizacionesKeys.versiones(cotizacionId) });
    },
    onError: (e: Error) => toast.error(e.message || 'No se pudo crear la versión')
  });

  const guardando = saveMutation.isPending;

  // Aplica un conjunto de líneas nuevo: en BORRADOR lo auto-guarda (el servidor
  // devuelve los montos y refresca todo); tras el envío solo marca cambios
  // pendientes para la futura versión.
  function aplicarCambio(next: Row[]) {
    if (autoguardado) {
      // `rows` acá es el último estado confirmado (las acciones se deshabilitan
      // mientras un guardado está en vuelo): sirve para revertir si el PUT falla.
      const anterior = rows;
      setRows(next);
      saveMutation.mutate({ next, anterior });
    } else {
      setRows(next);
      setDirty(true);
    }
  }

  // RN-COS-02: el margen global es una acción de interfaz que escribe el mismo
  // porcentaje en cada línea; no se guarda como valor de cabecera. Se ingresa en
  // porcentaje y se persiste como fracción.
  function aplicarMargenGlobal() {
    if (!/^\d+(\.\d+)?$/.test(margenGlobalPct)) {
      toast.error('Margen inválido (ej: 50)');
      return;
    }
    const fraccion = porcentajeAFraccion(margenGlobalPct);
    aplicarCambio(rows.map((r) => ({ ...r, margenPct: fraccion, _ventaTotal: undefined })));
  }

  function agregar(row: Omit<Row, '_key'>) {
    aplicarCambio([...rows, { ...row, _key: `new-${Date.now()}-${rows.length}` }]);
  }

  // Edita una línea ya presente conservando su identidad (`id`, `_key`) para que
  // el backend preserve su costo congelado si servicio/proveedor/acomodación no
  // cambian, y re-cotice solo si cambiaron (RN-COS-06).
  function editar(key: string, row: Omit<Row, '_key'>) {
    aplicarCambio(rows.map((r) => (r._key === key ? { ...row, _key: key } : r)));
  }

  function quitar(key: string) {
    // RN-COT-04: el itinerario no puede quedar vacío. En BORRADOR el auto-guardado
    // rechazaría un PUT sin líneas, así que se bloquea quitar la última.
    if (autoguardado && rows.length === 1) {
      toast.error('El itinerario debe tener al menos una línea; reemplázala en vez de vaciarlo');
      return;
    }
    aplicarCambio(rows.filter((r) => r._key !== key));
  }

  // Agrupa por día y bloque para mostrar (RN-COT-05).
  const porDia = useMemo(() => {
    const map = new Map<number, Row[]>();
    for (const r of rows) {
      if (!map.has(r.dia)) map.set(r.dia, []);
      map.get(r.dia)!.push(r);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [rows]);

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between'>
        <CardTitle className='text-base'>Itinerario</CardTitle>
        {editable && (
          <div className='flex flex-wrap items-center gap-2'>
            <div className='flex items-center gap-1'>
              <div className='relative'>
                <Input
                  value={margenGlobalPct}
                  onChange={(e) => setMargenGlobalPct(e.target.value.replace(/[^\d.]/g, ''))}
                  placeholder='Margen global'
                  className='h-8 w-32 pr-6'
                  inputMode='decimal'
                />
                <span className='text-muted-foreground pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-sm'>%</span>
              </div>
              <Button variant='outline' size='sm' onClick={aplicarMargenGlobal} disabled={sinLineas || guardando}>
                Aplicar a todas
              </Button>
            </div>
            {/* El recálculo por pax es una operación del itinerario. En modo
                'version' se bloquea con cambios pendientes (RN-COS-06); en BORRADOR
                se bloquea mientras un auto-guardado está en vuelo, para no dejar
                ids obsoletos que luego re-cotizarían desde el maestro. */}
            <RecalcularPaxDialog
              cotizacionId={cotizacionId}
              moneda={moneda}
              modo={modo === 'version' ? 'version' : 'borrador'}
              bloqueado={autoguardado ? guardando : dirty}
              sinLineas={sinLineas}
            />
            <LineaDialog
              moneda={moneda}
              cotizacionId={cotizacionId}
              cantidadPaxDefault={cantidadPaxDefault}
              margenGlobalPct={margenGlobalPct}
              onSubmit={agregar}
              trigger={
                <Button size='sm' variant='outline' disabled={guardando}>
                  <Icons.add className='mr-2 h-4 w-4' />
                  Agregar línea
                </Button>
              }
            />
            {modo === 'borrador' ? (
              guardando && (
                <span className='text-muted-foreground flex items-center gap-1.5 text-sm'>
                  <Icons.spinner className='h-4 w-4 animate-spin' />
                  Guardando…
                </span>
              )
            ) : (
              <Dialog open={motivoOpen} onOpenChange={setMotivoOpen}>
                <DialogTrigger asChild>
                  <Button size='sm' disabled={(!dirty && !encabezadoDirty) || sinLineas}>
                    <Icons.check className='mr-2 h-4 w-4' />
                    Crear nueva versión
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nueva versión de negociación</DialogTitle>
                  </DialogHeader>
                  <div className='space-y-1.5'>
                    <Label>Motivo (obligatorio)</Label>
                    <Textarea
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      placeholder='Ej: el cliente agregó un traslado el día 3'
                    />
                  </div>
                  <DialogFooter>
                    <Button variant='outline' onClick={() => setMotivoOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => {
                        if (!motivo.trim()) return toast.error('El motivo es obligatorio (RN-VER-06)');
                        versionMutation.mutate();
                      }}
                      isLoading={versionMutation.isPending}
                    >
                      Crear versión
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* RN-COT-09/10/COS-08: encabezado del documento — vigencia, forma de
            pago (con recargo) y comentarios. */}
        <div className='space-y-3 rounded-md border p-3'>
          <div className='text-muted-foreground text-xs font-medium uppercase'>Encabezado del documento</div>
          <div className='grid gap-3 sm:grid-cols-2'>
            <div className='space-y-1.5'>
              <Label>Válida hasta</Label>
              <Input
                type='date'
                value={fechaVigencia}
                onChange={(e) => {
                  setFechaVigencia(e.target.value);
                  setEncabezadoDirty(true);
                }}
                disabled={!editable}
              />
            </div>
            <div className='space-y-1.5'>
              <Label>Forma de pago</Label>
              <Select
                value={formaPagoId != null ? String(formaPagoId) : '__none__'}
                onValueChange={(v) => {
                  setFormaPagoId(v === '__none__' ? null : (Number.isFinite(Number.parseInt(v, 10)) ? Number.parseInt(v, 10) : null));
                  setEncabezadoDirty(true);
                }}
                disabled={!editable}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Sin forma de pago' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='__none__'>
                    <span className='text-muted-foreground'>Sin forma de pago</span>
                  </SelectItem>
                  {formasPago.map((f) => {
                    const pa = String(f.porcentajeAdicional ?? '0');
                    const conRecargo = pa !== '' && pa !== '0' && pa !== '0.0000';
                    return (
                      <SelectItem key={f.id} value={String(f.id)}>
                        {f.nombre}
                        {conRecargo ? (
                          <span className='text-muted-foreground ml-1.5 text-xs'>(+{fraccionAPorcentaje(pa)}%)</span>
                        ) : null}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className='grid gap-3 sm:grid-cols-3'>
            <div className='space-y-1.5'>
              <Label>Servicios incluidos</Label>
              <Textarea
                value={incluidos}
                onChange={(e) => {
                  setIncluidos(e.target.value);
                  setEncabezadoDirty(true);
                }}
                rows={3}
                disabled={!editable}
              />
            </div>
            <div className='space-y-1.5'>
              <Label>Servicios no incluidos</Label>
              <Textarea
                value={noIncluidos}
                onChange={(e) => {
                  setNoIncluidos(e.target.value);
                  setEncabezadoDirty(true);
                }}
                rows={3}
                disabled={!editable}
              />
            </div>
            <div className='space-y-1.5'>
              <Label>Notas importantes</Label>
              <Textarea
                value={notasImportantes}
                onChange={(e) => {
                  setNotasImportantes(e.target.value);
                  setEncabezadoDirty(true);
                }}
                rows={3}
                disabled={!editable}
              />
            </div>
          </div>
          {editable && autoguardado && (
            <div className='flex justify-end'>
              <Button
                size='sm'
                variant='outline'
                disabled={!encabezadoDirty || guardando || sinLineas}
                onClick={() => saveMutation.mutate({ next: rows, anterior: rows })}
              >
                Guardar encabezado
              </Button>
            </div>
          )}
        </div>

        {porDia.length === 0 ? (
          <p className='text-muted-foreground text-sm'>Sin líneas todavía. Agrega servicios al itinerario.</p>
        ) : (
          porDia.map(([dia, rowsDia]) => (
            <div key={dia} className='rounded-md border'>
              <div className='bg-muted/50 border-b px-3 py-2 text-sm font-semibold'>Día {dia}</div>
              <div className='divide-y'>
                {(['AM', 'PM'] as Bloque[]).map((bloque) => {
                  const items = rowsDia.filter((r) => r.bloque === bloque);
                  if (items.length === 0) return null;
                  return (
                    <div key={bloque} className='px-3 py-2'>
                      <div className='text-muted-foreground mb-1 text-xs font-medium uppercase'>
                        {bloque === 'AM' ? 'Mañana' : 'Tarde'}
                      </div>
                      <ul className='space-y-1'>
                        {items.map((r) => (
                          <li key={r._key} className='flex items-center justify-between gap-2 text-sm'>
                            <span className='flex items-center gap-2'>
                              <Badge variant='outline' className='shrink-0'>
                                {r.tipoLinea === 'OTRO' ? 'Otro' : 'Servicio'}
                              </Badge>
                              <span>{r.descripcion || '(sin descripción)'}</span>
                              {r.acomodacion && (
                                <span className='text-muted-foreground text-xs'>· {ACOMODACION_LABELS[r.acomodacion]}</span>
                              )}
                              <span className='text-muted-foreground text-xs'>· {r.cantidadPax} pax</span>
                              {/* RN-PRV-11: retención/IVA referencial interna (no sale en el PDF). */}
                              {r.id != null && impuestoPorLineaId.has(r.id) && (
                                <span className='text-muted-foreground text-xs'>
                                  · {impuestoPorLineaId.get(r.id)!.label} {fraccionAPorcentaje(impuestoPorLineaId.get(r.id)!.pct)}%
                                </span>
                              )}
                            </span>
                            <span className='flex items-center gap-3'>
                              <span className='font-medium'>{formatMonto(r._ventaTotal, moneda)}</span>
                              {editable && (
                                <>
                                  <LineaDialog
                                    moneda={moneda}
                                    cotizacionId={cotizacionId}
                                    cantidadPaxDefault={cantidadPaxDefault}
                                    margenGlobalPct={margenGlobalPct}
                                    initial={r}
                                    onSubmit={(row) => editar(r._key, row)}
                                    trigger={
                                      <Button variant='ghost' size='icon' className='h-7 w-7' title='Editar línea' disabled={guardando}>
                                        <Icons.edit className='h-4 w-4' />
                                      </Button>
                                    }
                                  />
                                  <Button variant='ghost' size='icon' className='h-7 w-7' title='Quitar línea' onClick={() => quitar(r._key)} disabled={guardando}>
                                    <Icons.trash className='h-4 w-4' />
                                  </Button>
                                </>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
        {/* Solo en modo 'version': en BORRADOR cada cambio se auto-guarda y no hay
            estado pendiente. */}
        {(dirty || encabezadoDirty) && !autoguardado && (
          <div className='flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200'>
            <Icons.warning className='h-4 w-4 shrink-0' />
            <span>Hay cambios sin guardar. Los montos, el resumen y el PDF se actualizan al crear la nueva versión.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Diálogo compartido para agregar y editar una línea del itinerario. Con
// `initial` precarga los campos de una línea existente; sin él, arranca en
// blanco para una línea nueva. Para líneas ESTANDAR muestra el costo del
// tarifario vigente y la venta en vivo (preview que no persiste), y permite
// editar el monto de venta para derivar el margen (RN-COS-04).
function LineaDialog({
  moneda,
  cotizacionId,
  cantidadPaxDefault,
  margenGlobalPct,
  initial,
  trigger,
  onSubmit
}: {
  moneda: Moneda;
  cotizacionId: number;
  cantidadPaxDefault: number;
  margenGlobalPct: string;
  initial?: Row;
  trigger: React.ReactNode;
  onSubmit: (row: Omit<Row, '_key'>) => void;
}) {
  const esEdicion = initial != null;
  const [open, setOpen] = useState(false);
  const [dia, setDia] = useState('1');
  const [bloque, setBloque] = useState<Bloque>('AM');
  const [tipoLinea, setTipoLinea] = useState<'ESTANDAR' | 'OTRO'>('ESTANDAR');
  const [servicioId, setServicioId] = useState<number | undefined>();
  const [proveedorId, setProveedorId] = useState<number | undefined>();
  const [acomodacion, setAcomodacion] = useState<Acomodacion | undefined>();
  const [cantidadPax, setCantidadPax] = useState(String(cantidadPaxDefault));
  const [descripcion, setDescripcion] = useState('');
  const [observacion, setObservacion] = useState('');
  const [costoTotal, setCostoTotal] = useState('');
  // Margen en PORCENTAJE (máscara); se convierte a fracción al confirmar.
  const [margenPctInput, setMargenPctInput] = useState('');
  // Venta editable (monto) para líneas ESTANDAR: deriva el margen al perder foco.
  const [ventaInput, setVentaInput] = useState('');
  // Venta tipeada pero aún no reflejada en el margen (derivación asíncrona
  // pendiente): mientras esté true se bloquea confirmar para no persistir un
  // margen obsoleto (RN-COS-04).
  const [ventaSinDerivar, setVentaSinDerivar] = useState(false);

  // Preview de costo/venta de la línea ESTANDAR (no persiste). `disponible:false`
  // cuando no hay tarifario vigente para la combinación (RN-COS-05).
  const [preview, setPreview] = useState<
    | { estado: 'disponible'; costoTotal: string; ventaTotal: string; margenPct: string; advertenciaVigencia: boolean }
    | { estado: 'sin-tarifario'; motivo: string }
    | { estado: 'error'; mensaje: string }
    | null
  >(null);
  const [previewCargando, setPreviewCargando] = useState(false);
  const previewReqId = useRef(0);

  const { data: serviciosData } = useQuery(serviciosListOptions({ limit: 200 }));
  const servicios = serviciosData?.data ?? [];
  const servicioSel = servicios.find((s) => s.id === servicioId);
  const esAcomodacion = servicioSel?.modeloTarifa === 'ACOMODACION';

  // RN-PRV-08: el proveedor se filtra por el tipo de servicio del servicio
  // elegido —solo los proveedores de ese tipo pueden tener tarifario para él—.
  const tipoServicioId = servicioSel?.tipoServicioId;
  const { data: proveedoresData } = useQuery({
    ...proveedoresListOptions({ limit: 200, ...(tipoServicioId ? { tipoServicioId } : {}) }),
    enabled: open && tipoServicioId != null
  });
  const proveedores = proveedoresData?.data ?? [];

  const paxN = Number.parseInt(cantidadPax, 10);
  const diaN = Number.parseInt(dia, 10);
  const costoValido = /^\d+(\.\d+)?$/.test(costoTotal);
  const paxYDiaOk = Number.isFinite(paxN) && paxN >= 1 && Number.isFinite(diaN) && diaN >= 1;
  // El preview (costo→venta→margen) aplica a ESTANDAR (costo del tarifario) y a
  // OTRO (costo digitado, RN-COT-11): ambos derivan la venta/margen en el server.
  const listoParaPreview =
    paxYDiaOk &&
    (tipoLinea === 'ESTANDAR'
      ? servicioId != null && proveedorId != null && (!esAcomodacion || acomodacion != null)
      : costoValido);

  // Resetea el preview cuando cambia cualquier insumo del COSTO (no el margen,
  // que no altera el costo). Se hace en el render —patrón sancionado por React
  // para reiniciar estado al cambiar entradas— en vez de en un efecto, para no
  // mostrar un costo obsoleto de otra combinación mientras recarga.
  const previewSig = `${tipoLinea}|${servicioId ?? ''}|${proveedorId ?? ''}|${paxN}|${acomodacion ?? ''}|${diaN}|${tipoLinea === 'OTRO' ? costoTotal : ''}`;
  const [previewSigSembrada, setPreviewSigSembrada] = useState(previewSig);
  if (previewSig !== previewSigSembrada) {
    setPreviewSigSembrada(previewSig);
    setPreview(null);
  }

  // RN-COS-06/07: una línea existente que conserva su base tiene costo y pax
  // congelados; editar pasajeros acá no tendría efecto (el cambio de pax va por
  // "Recalcular por pax"), así que el campo se bloquea para no confundir.
  const paxCongelado =
    esEdicion &&
    initial?.id != null &&
    tipoLinea === 'ESTANDAR' &&
    servicioId === initial.servicioId &&
    proveedorId === initial.proveedorId &&
    (acomodacion ?? null) === (initial.acomodacion ?? null);

  // Siembra el formulario al abrir: desde `initial` en edición, en blanco para
  // una línea nueva. Prellena el margen con el global vigente si hay (RN-COS-02).
  function sembrar() {
    if (initial) {
      setDia(String(initial.dia));
      setBloque(initial.bloque);
      setTipoLinea(initial.tipoLinea);
      setServicioId(initial.servicioId);
      setProveedorId(initial.proveedorId);
      setAcomodacion(initial.acomodacion);
      setCantidadPax(String(initial.cantidadPax ?? cantidadPaxDefault));
      setDescripcion(initial.tipoLinea === 'OTRO' ? initial.descripcion ?? '' : '');
      setObservacion(initial.observacion ?? '');
      setCostoTotal(initial.costoTotal ?? '');
      setMargenPctInput(initial.margenPct ? fraccionAPorcentaje(initial.margenPct) : '');
      setVentaInput(initial._ventaTotal ? recortarDecimales(initial._ventaTotal) : '');
    } else {
      setDia('1');
      setBloque('AM');
      setTipoLinea('ESTANDAR');
      setServicioId(undefined);
      setProveedorId(undefined);
      setAcomodacion(undefined);
      setDescripcion('');
      setObservacion('');
      setCostoTotal('');
      setMargenPctInput(margenGlobalPct.trim());
      setVentaInput('');
      setCantidadPax(String(cantidadPaxDefault));
    }
    setPreview(null);
    setVentaSinDerivar(false);
  }

  // Preview dirigido por el margen (y por los campos que definen el costo).
  // No depende de `ventaInput` para no entrar en bucle: este efecto ESCRIBE
  // ventaInput, y la derivación inversa (editar venta) vive en el onBlur.
  useEffect(() => {
    if (!open || !listoParaPreview) return;
    const reqId = ++previewReqId.current;
    const t = setTimeout(async () => {
      setPreviewCargando(true);
      try {
        const margenFraccion = margenPctInput.trim() ? porcentajeAFraccion(margenPctInput) : undefined;
        const res = await cotizacionesService.previewLinea(
          cotizacionId,
          tipoLinea === 'OTRO'
            ? { tipoLinea: 'OTRO', dia: diaN, cantidadPax: paxN, costoTotal, margenPct: margenFraccion }
            : {
                lineaId: initial?.id,
                dia: diaN,
                cantidadPax: paxN,
                servicioId: servicioId!,
                proveedorId: proveedorId!,
                acomodacion: esAcomodacion ? acomodacion : undefined,
                margenPct: margenFraccion
              }
        );
        if (reqId !== previewReqId.current) return; // respuesta obsoleta
        if (!res.disponible) {
          setPreview({ estado: 'sin-tarifario', motivo: res.motivo });
        } else {
          setPreview({
            estado: 'disponible',
            costoTotal: res.costoTotal,
            ventaTotal: res.ventaTotal,
            margenPct: res.margenPct,
            advertenciaVigencia: res.advertenciaVigencia
          });
          setVentaInput(recortarDecimales(res.ventaTotal));
          // La venta quedó recompuesta desde el margen: ya no hay nada por derivar.
          setVentaSinDerivar(false);
          // Si el usuario no fijó margen, reflejar el efectivo (sugerido del
          // servicio) en el campo para que vea sobre qué se calculó.
          if (!margenPctInput.trim()) setMargenPctInput(fraccionAPorcentaje(res.margenPct));
        }
      } catch (e) {
        if (reqId !== previewReqId.current) return;
        setPreview({ estado: 'error', mensaje: (e as Error).message || 'No se pudo calcular el costo' });
      } finally {
        if (reqId === previewReqId.current) setPreviewCargando(false);
      }
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, listoParaPreview, tipoLinea, diaN, paxN, servicioId, proveedorId, acomodacion, esAcomodacion, margenPctInput, costoTotal]);

  // Deriva el margen desde la venta digitada (RN-COS-04): al salir del campo,
  // consulta el backend con `ventaObjetivo` y escribe el margen resultante. El
  // efecto de arriba recompone luego la venta al valor realmente almacenable.
  async function derivarMargenDesdeVenta() {
    if (!listoParaPreview || !/^\d+(\.\d+)?$/.test(ventaInput)) {
      setVentaSinDerivar(false);
      return;
    }
    if (preview?.estado === 'disponible' && recortarDecimales(preview.ventaTotal) === recortarDecimales(ventaInput)) {
      setVentaSinDerivar(false);
      return;
    }
    const reqId = ++previewReqId.current;
    setPreviewCargando(true);
    try {
      const res = await cotizacionesService.previewLinea(
        cotizacionId,
        tipoLinea === 'OTRO'
          ? { tipoLinea: 'OTRO', dia: diaN, cantidadPax: paxN, costoTotal, ventaObjetivo: ventaInput }
          : {
              lineaId: initial?.id,
              dia: diaN,
              cantidadPax: paxN,
              servicioId: servicioId!,
              proveedorId: proveedorId!,
              acomodacion: esAcomodacion ? acomodacion : undefined,
              ventaObjetivo: ventaInput
            }
      );
      if (reqId !== previewReqId.current) return;
      if (!res.disponible) {
        setPreview({ estado: 'sin-tarifario', motivo: res.motivo });
      } else {
        setPreview({
          estado: 'disponible',
          costoTotal: res.costoTotal,
          ventaTotal: res.ventaTotal,
          margenPct: res.margenPct,
          advertenciaVigencia: res.advertenciaVigencia
        });
        setMargenPctInput(fraccionAPorcentaje(res.margenPct));
      }
    } catch (e) {
      if (reqId !== previewReqId.current) return;
      setPreview({ estado: 'error', mensaje: (e as Error).message || 'No se pudo calcular el costo' });
    } finally {
      if (reqId === previewReqId.current) {
        setPreviewCargando(false);
        setVentaSinDerivar(false);
      }
    }
  }

  function confirmar() {
    if (!Number.isFinite(diaN) || diaN < 1) return toast.error('Día inválido');
    if (!Number.isFinite(paxN) || paxN < 1) return toast.error('Cantidad de pasajeros inválida');

    if (tipoLinea === 'ESTANDAR') {
      if (!servicioId) return toast.error('Selecciona un servicio');
      if (!proveedorId) return toast.error('Selecciona un proveedor');
      if (esAcomodacion && !acomodacion) return toast.error('Selecciona la acomodación');
      if (preview?.estado === 'sin-tarifario') {
        return toast.error('No hay tarifario vigente para esta combinación; cárgala como línea OTRO (RN-COS-05)');
      }
    } else {
      if (!descripcion.trim()) return toast.error('La descripción es obligatoria');
      if (!/^\d+(\.\d+)?$/.test(costoTotal)) return toast.error('Costo inválido');
    }
    if (margenPctInput && !/^\d+(\.\d+)?$/.test(margenPctInput)) return toast.error('Margen inválido (ej: 50)');

    const margenFraccion = margenPctInput ? porcentajeAFraccion(margenPctInput) : undefined;
    onSubmit({
      // Conserva la identidad de la línea en edición (RN-COS-06).
      id: initial?.id,
      dia: diaN,
      bloque,
      orden: initial?.orden ?? 0,
      tipoLinea,
      servicioId: tipoLinea === 'ESTANDAR' ? servicioId : undefined,
      proveedorId: tipoLinea === 'ESTANDAR' ? proveedorId : undefined,
      acomodacion: tipoLinea === 'ESTANDAR' && esAcomodacion ? acomodacion : undefined,
      cantidadPax: paxN,
      descripcion: tipoLinea === 'ESTANDAR' ? (descripcion.trim() || servicioSel?.nombre) : descripcion.trim(),
      observacion: observacion.trim() || undefined,
      costoTotal: tipoLinea === 'OTRO' ? costoTotal : undefined,
      margenPct: margenFraccion,
      // Venta previsualizada para feedback inmediato en la lista; el valor
      // definitivo se confirma al guardar el itinerario (RN-COS-06).
      _ventaTotal: preview?.estado === 'disponible' ? preview.ventaTotal : initial?._ventaTotal
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
      <DialogContent className='max-w-lg'>
        <DialogHeader>
          <DialogTitle>{esEdicion ? 'Editar línea del itinerario' : 'Agregar línea al itinerario'}</DialogTitle>
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
            <Select value={tipoLinea} onValueChange={(v) => setTipoLinea(v as 'ESTANDAR' | 'OTRO')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='ESTANDAR'>Servicio (costo del tarifario)</SelectItem>
                <SelectItem value='OTRO'>Otro (costo digitado)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {tipoLinea === 'ESTANDAR' ? (
            <>
              <div className='col-span-2 space-y-1.5'>
                <Label>Servicio</Label>
                <Select
                  value={servicioId ? String(servicioId) : ''}
                  onValueChange={(v) => {
                    const id = Number.parseInt(v, 10);
                    if (Number.isFinite(id)) {
                      setServicioId(id);
                      // Cambiar el servicio cambia el tipo y, por tanto, la lista
                      // de proveedores válidos (RN-PRV-08): se limpia el proveedor.
                      setProveedorId(undefined);
                      setAcomodacion(undefined);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Selecciona un servicio...' />
                  </SelectTrigger>
                  <SelectContent>
                    {servicios.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.nombre}
                        <span className='text-muted-foreground ml-1.5 text-xs'>({s.codigo})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='col-span-2 space-y-1.5'>
                <Label>Proveedor</Label>
                <Select
                  value={proveedorId ? String(proveedorId) : ''}
                  onValueChange={(v) => {
                    const id = Number.parseInt(v, 10);
                    if (Number.isFinite(id)) setProveedorId(id);
                  }}
                  disabled={servicioId == null}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={servicioId == null ? 'Elige un servicio primero' : 'Selecciona un proveedor...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {proveedores.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.razonSocial}
                        <span className='text-muted-foreground ml-1.5 text-xs'>({p.codigo})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {servicioId != null && proveedores.length === 0 && (
                  <p className='text-muted-foreground text-xs'>Este servicio no tiene proveedores de su tipo cargados.</p>
                )}
              </div>
              {esAcomodacion && (
                <div className='col-span-2 space-y-1.5'>
                  <Label>Acomodación</Label>
                  <Select value={acomodacion ?? ''} onValueChange={(v) => setAcomodacion(v as Acomodacion)}>
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
          ) : (
            <>
              <div className='col-span-2 space-y-1.5'>
                <Label>Descripción</Label>
                <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder='Ej: Traslado especial' />
              </div>
              <div className='space-y-1.5'>
                <Label>Costo total ({moneda})</Label>
                <Input value={costoTotal} onChange={(e) => setCostoTotal(e.target.value)} placeholder='0' />
              </div>
            </>
          )}

          <div className='space-y-1.5'>
            <Label>Pasajeros</Label>
            <Input
              type='number'
              min={1}
              value={cantidadPax}
              onChange={(e) => setCantidadPax(e.target.value)}
              disabled={paxCongelado}
              title={paxCongelado ? 'El pax de una línea existente se cambia con "Recalcular por pax" (RN-COS-07)' : undefined}
            />
            {paxCongelado && (
              <p className='text-muted-foreground text-xs'>Usa “Recalcular por pax” para cambiar los pasajeros (RN-COS-07).</p>
            )}
          </div>
          <div className='space-y-1.5'>
            <Label>Margen</Label>
            <div className='relative'>
              <Input
                value={margenPctInput}
                onChange={(e) => setMargenPctInput(e.target.value.replace(/[^\d.]/g, ''))}
                placeholder='Ej: 50'
                className='pr-6'
                inputMode='decimal'
              />
              <span className='text-muted-foreground pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-sm'>%</span>
            </div>
          </div>
          <div className='col-span-2 space-y-1.5'>
            <Label>Observación</Label>
            <Textarea
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              placeholder='Nota de esta línea (sale en el PDF)'
              rows={2}
            />
          </div>
        </div>

        {/* Costo y venta en vivo (preview que no persiste). Para ESTANDAR el
            costo viene del tarifario; para OTRO es el costo digitado, y en ambos
            la venta es editable y deriva el margen (RN-COS-04/RN-COT-11). */}
        {(tipoLinea === 'ESTANDAR' || (tipoLinea === 'OTRO' && costoValido)) && (
          <div className='rounded-md border p-3 text-sm'>
            {!listoParaPreview ? (
              <p className='text-muted-foreground'>
                {tipoLinea === 'ESTANDAR'
                  ? `Elige servicio, proveedor${esAcomodacion ? ', acomodación' : ''} y pasajeros para ver el costo.`
                  : 'Ingresa un costo, día y pasajeros para ver la venta.'}
              </p>
            ) : preview?.estado === 'sin-tarifario' ? (
              <p className='text-destructive'>{preview.motivo}</p>
            ) : preview?.estado === 'error' ? (
              <p className='text-destructive'>{preview.mensaje}</p>
            ) : (
              <div className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <span className='text-muted-foreground'>{tipoLinea === 'ESTANDAR' ? 'Costo (tarifario)' : 'Costo'}</span>
                  <span className='font-medium'>
                    {previewCargando && !preview ? '…' : preview?.estado === 'disponible' ? formatMonto(preview.costoTotal, moneda) : '—'}
                  </span>
                </div>
                <div className='flex items-center justify-between gap-2'>
                  <span className='text-muted-foreground'>Venta</span>
                  <div className='relative w-40'>
                    <Input
                      value={ventaInput}
                      onChange={(e) => {
                        setVentaInput(e.target.value.replace(/[^\d.]/g, ''));
                        setVentaSinDerivar(true);
                      }}
                      onBlur={derivarMargenDesdeVenta}
                      placeholder='0'
                      className='h-8 text-right'
                      inputMode='decimal'
                      disabled={preview?.estado !== 'disponible'}
                    />
                  </div>
                </div>
                <p className='text-muted-foreground text-xs'>
                  Puedes editar la venta: el margen se recalcula a partir de ella (RN-COS-04).
                </p>
                {preview?.estado === 'disponible' && preview.advertenciaVigencia && (
                  <p className='text-xs text-amber-600 dark:text-amber-400'>
                    El tarifario vigente no cubre exactamente la fecha; se usó el más reciente (RN-TAR-05).
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant='outline' onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          {/* Bloqueado mientras una venta digitada aún no derivó su margen
              (RN-COS-04): evita confirmar con un margen obsoleto. */}
          <Button onClick={confirmar} disabled={previewCargando || ventaSinDerivar}>
            {esEdicion ? 'Guardar cambios' : 'Agregar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
