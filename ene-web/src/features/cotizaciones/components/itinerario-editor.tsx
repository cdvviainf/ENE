'use client';

import { useMemo, useState } from 'react';
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
import { serviciosListOptions } from '@/features/servicios/queries';
import { proveedoresListOptions } from '@/features/proveedores/queries';
import { cotizacionesService } from '../service';
import { cotizacionesKeys } from '../queries';
import { ACOMODACION_LABELS, type Acomodacion, type Bloque, type CotizacionLinea, type LineaInput, type Moneda } from '../types';
import { RecalcularPaxDialog } from './recalcular-pax-dialog';

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
    costoTotal: l.tipoLinea === 'OTRO' ? l.costoTotal : undefined,
    margenPct: l.margenPct
  }));
}

// 'borrador' escribe directo sobre la vigente (PUT); 'version' crea una versión
// nueva con motivo (renegociación, RN-VER-02); 'bloqueado' es solo lectura.
type ModoEditor = 'borrador' | 'version' | 'bloqueado';

interface Props {
  cotizacionId: number;
  lineas: CotizacionLinea[];
  moneda: Moneda;
  modo: ModoEditor;
  cantidadPaxDefault: number;
}

export function ItinerarioEditor({ cotizacionId, lineas, moneda, modo, cantidadPaxDefault }: Props) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<Row[]>(() => desdeServidor(lineas));
  const [dirty, setDirty] = useState(false);
  const [motivoOpen, setMotivoOpen] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [margenGlobal, setMargenGlobal] = useState('');
  const editable = modo !== 'bloqueado';

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

  // RN-COS-02: el margen global es una acción de interfaz que escribe el mismo
  // porcentaje en cada línea; no se guarda como valor de cabecera.
  function aplicarMargenGlobal() {
    if (!/^\d+(\.\d+)?$/.test(margenGlobal)) {
      toast.error('Margen inválido (ej: 0.30)');
      return;
    }
    setRows((prev) => prev.map((r) => ({ ...r, margenPct: margenGlobal, _ventaTotal: undefined })));
    setDirty(true);
  }

  function payloadLineas(): LineaInput[] {
    return rows.map((r, i) => ({
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
      costoTotal: r.costoTotal,
      margenPct: r.margenPct
    }));
  }

  const saveMutation = useMutation({
    mutationFn: () => cotizacionesService.guardarItinerario(cotizacionId, payloadLineas()),
    onSuccess: (cot) => {
      toast.success('Itinerario guardado');
      setDirty(false);
      setRows(desdeServidor(cot.versionVigente?.lineas ?? []));
      queryClient.invalidateQueries({ queryKey: cotizacionesKeys.detail(cotizacionId) });
    },
    onError: (e: Error) => toast.error(e.message || 'Error al guardar el itinerario')
  });

  const versionMutation = useMutation({
    mutationFn: () => cotizacionesService.nuevaVersion(cotizacionId, { motivo: motivo.trim(), lineas: payloadLineas() }),
    onSuccess: (cot) => {
      toast.success('Nueva versión creada');
      setDirty(false);
      setMotivo('');
      setMotivoOpen(false);
      setRows(desdeServidor(cot.versionVigente?.lineas ?? []));
      queryClient.invalidateQueries({ queryKey: cotizacionesKeys.detail(cotizacionId) });
      queryClient.invalidateQueries({ queryKey: cotizacionesKeys.versiones(cotizacionId) });
    },
    onError: (e: Error) => toast.error(e.message || 'No se pudo crear la versión')
  });

  function agregar(row: Omit<Row, '_key'>) {
    setRows((prev) => [...prev, { ...row, _key: `new-${Date.now()}-${prev.length}` }]);
    setDirty(true);
  }

  function quitar(key: string) {
    setRows((prev) => prev.filter((r) => r._key !== key));
    setDirty(true);
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
              <Input
                value={margenGlobal}
                onChange={(e) => setMargenGlobal(e.target.value)}
                placeholder='Margen global'
                className='h-8 w-28'
              />
              <Button variant='outline' size='sm' onClick={aplicarMargenGlobal} disabled={rows.length === 0}>
                Aplicar a todas
              </Button>
            </div>
            {/* El recálculo por pax es una operación del itinerario: vive acá para
                compartir el estado `dirty` y bloquearse si hay cambios sin guardar
                (RN-COS-06: evita que un recálculo con líneas locales sin persistir
                deje ids obsoletos que luego re-cotizarían desde el maestro). */}
            <RecalcularPaxDialog cotizacionId={cotizacionId} moneda={moneda} modo={modo === 'version' ? 'version' : 'borrador'} bloqueado={dirty} />
            <AgregarLineaDialog moneda={moneda} cantidadPaxDefault={cantidadPaxDefault} onAgregar={agregar} />
            {modo === 'borrador' ? (
              <Button size='sm' onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending} disabled={!dirty}>
                <Icons.check className='mr-2 h-4 w-4' />
                Guardar itinerario
              </Button>
            ) : (
              <Dialog open={motivoOpen} onOpenChange={setMotivoOpen}>
                <DialogTrigger asChild>
                  <Button size='sm' disabled={!dirty}>
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
                            </span>
                            <span className='flex items-center gap-3'>
                              <span className='font-medium'>{formatMonto(r._ventaTotal, moneda)}</span>
                              {editable && (
                                <Button variant='ghost' size='icon' className='h-7 w-7' onClick={() => quitar(r._key)}>
                                  <Icons.trash className='h-4 w-4' />
                                </Button>
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
        {dirty && (
          <p className='text-muted-foreground text-xs'>
            Hay cambios sin guardar. Los valores se calculan al guardar el itinerario.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function AgregarLineaDialog({
  moneda,
  cantidadPaxDefault,
  onAgregar
}: {
  moneda: Moneda;
  cantidadPaxDefault: number;
  onAgregar: (row: Omit<Row, '_key'>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [dia, setDia] = useState('1');
  const [bloque, setBloque] = useState<Bloque>('AM');
  const [tipoLinea, setTipoLinea] = useState<'ESTANDAR' | 'OTRO'>('ESTANDAR');
  const [servicioId, setServicioId] = useState<number | undefined>();
  const [proveedorId, setProveedorId] = useState<number | undefined>();
  const [acomodacion, setAcomodacion] = useState<Acomodacion | undefined>();
  const [cantidadPax, setCantidadPax] = useState(String(cantidadPaxDefault));
  const [descripcion, setDescripcion] = useState('');
  const [costoTotal, setCostoTotal] = useState('');
  const [margenPct, setMargenPct] = useState('');

  const { data: serviciosData } = useQuery(serviciosListOptions({ limit: 200 }));
  const { data: proveedoresData } = useQuery(proveedoresListOptions({ limit: 200 }));
  const servicios = serviciosData?.data ?? [];
  const proveedores = proveedoresData?.data ?? [];
  const servicioSel = servicios.find((s) => s.id === servicioId);
  const esAcomodacion = servicioSel?.modeloTarifa === 'ACOMODACION';

  function reset() {
    setServicioId(undefined);
    setProveedorId(undefined);
    setAcomodacion(undefined);
    setDescripcion('');
    setCostoTotal('');
    setMargenPct('');
    setCantidadPax(String(cantidadPaxDefault));
  }

  function confirmar() {
    const diaN = Number.parseInt(dia, 10);
    const paxN = Number.parseInt(cantidadPax, 10);
    if (!Number.isFinite(diaN) || diaN < 1) return toast.error('Día inválido');
    if (!Number.isFinite(paxN) || paxN < 1) return toast.error('Cantidad de pasajeros inválida');

    if (tipoLinea === 'ESTANDAR') {
      if (!servicioId) return toast.error('Selecciona un servicio');
      if (!proveedorId) return toast.error('Selecciona un proveedor');
      if (esAcomodacion && !acomodacion) return toast.error('Selecciona la acomodación');
    } else {
      if (!descripcion.trim()) return toast.error('La descripción es obligatoria');
      if (!/^\d+(\.\d+)?$/.test(costoTotal)) return toast.error('Costo inválido');
    }
    if (margenPct && !/^\d+(\.\d+)?$/.test(margenPct)) return toast.error('Margen inválido (ej: 0.30)');

    onAgregar({
      dia: diaN,
      bloque,
      orden: 0,
      tipoLinea,
      servicioId: tipoLinea === 'ESTANDAR' ? servicioId : undefined,
      proveedorId: tipoLinea === 'ESTANDAR' ? proveedorId : undefined,
      acomodacion: tipoLinea === 'ESTANDAR' && esAcomodacion ? acomodacion : undefined,
      cantidadPax: paxN,
      descripcion: tipoLinea === 'ESTANDAR' ? (descripcion.trim() || servicioSel?.nombre) : descripcion.trim(),
      costoTotal: tipoLinea === 'OTRO' ? costoTotal : undefined,
      margenPct: margenPct || undefined
    });
    reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size='sm' variant='outline'>
          <Icons.add className='mr-2 h-4 w-4' />
          Agregar línea
        </Button>
      </DialogTrigger>
      <DialogContent className='max-w-lg'>
        <DialogHeader>
          <DialogTitle>Agregar línea al itinerario</DialogTitle>
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
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Selecciona un proveedor...' />
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
            <Input type='number' min={1} value={cantidadPax} onChange={(e) => setCantidadPax(e.target.value)} />
          </div>
          <div className='space-y-1.5'>
            <Label>Margen (opcional)</Label>
            <Input value={margenPct} onChange={(e) => setMargenPct(e.target.value)} placeholder='0.30' />
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={confirmar}>Agregar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
