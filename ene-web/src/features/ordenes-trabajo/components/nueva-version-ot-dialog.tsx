'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Icons } from '@/components/icons';
import { formatMonto } from '@/lib/dinero';
import { fraccionAPorcentaje, porcentajeAFraccion, recortarDecimales } from '@/lib/porcentaje';
import { serviciosListOptions } from '@/features/servicios/queries';
import { proveedoresListOptions } from '@/features/proveedores/queries';
import { ordenesTrabajoService } from '../service';
import { ordenesTrabajoKeys } from '../queries';
import {
  ACOMODACION_LABELS,
  ESTADO_SERVICIO_LABELS,
  type Acomodacion,
  type Bloque,
  type EstadoServicio,
  type LineaVersionInput,
  type Moneda,
  type OrdenTrabajoLinea,
  type TipoCambioVersion,
  type TipoLinea
} from '../types';

interface Row extends Omit<LineaVersionInput, 'margenPct' | 'costoTeorico'> {
  _key: string;
  // Costo digitado y margen en PORCENTAJE, tal como los edita el usuario.
  costoTeorico: string;
  margenPct: string; // porcentaje, ej. '50'
}

// Copia la versión vigente a filas editables (punto de partida de la versión).
function desdeLineas(lineas: OrdenTrabajoLinea[]): Row[] {
  return lineas.map((l, i) => ({
    _key: `base-${l.id}-${i}`,
    dia: l.dia,
    bloque: l.bloque,
    orden: l.orden,
    tipoLinea: l.tipoLinea,
    servicioId: l.servicio?.id,
    proveedorId: l.proveedor?.id,
    acomodacion: l.acomodacion ?? undefined,
    cantidadPax: l.cantidadPax,
    descripcion: l.descripcion,
    descripcionEn: l.descripcionEn ?? undefined,
    estadoServicio: l.estadoServicio,
    costoTeorico: recortarDecimales(l.costoTeorico),
    margenPct: fraccionAPorcentaje(l.margenPct)
  }));
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
    // El backend valoriza con decimal.js; mandamos el margen como fracción.
    margenPct: porcentajeAFraccion(r.margenPct || '0'),
    estadoServicio: r.estadoServicio
  }));
}

export function NuevaVersionOtDialog({
  ordenId,
  moneda,
  lineasVigentes,
  trigger
}: {
  ordenId: number;
  moneda: Moneda;
  lineasVigentes: OrdenTrabajoLinea[];
  trigger: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tipoCambio, setTipoCambio] = useState<TipoCambioVersion>('ALCANCE');
  const [motivo, setMotivo] = useState('');
  const [aprobadoPorCliente, setAprobadoPorCliente] = useState(false);
  const [aprobacionReferencia, setAprobacionReferencia] = useState('');
  const [rows, setRows] = useState<Row[]>([]);

  function sembrar() {
    setTipoCambio('ALCANCE');
    setMotivo('');
    setAprobadoPorCliente(false);
    setAprobacionReferencia('');
    setRows(desdeLineas(lineasVigentes));
  }

  const mutation = useMutation({
    mutationFn: () =>
      ordenesTrabajoService.crearVersion(ordenId, {
        tipoCambio,
        motivo: motivo.trim(),
        aprobadoPorCliente: tipoCambio === 'ALCANCE' ? aprobadoPorCliente : undefined,
        aprobacionReferencia:
          tipoCambio === 'ALCANCE' && aprobacionReferencia.trim() ? aprobacionReferencia.trim() : undefined,
        lineas: payloadDe(rows)
      }),
    onSuccess: () => {
      toast.success('Nueva versión de la OT creada');
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ordenesTrabajoKeys.detail(ordenId) });
      queryClient.invalidateQueries({ queryKey: ordenesTrabajoKeys.all });
    },
    onError: (e: Error) => toast.error(e.message || 'No se pudo crear la versión')
  });

  function agregar(row: Omit<Row, '_key'>) {
    setRows((prev) => [...prev, { ...row, _key: `new-${Date.now()}-${prev.length}` }]);
  }
  function editar(key: string, row: Omit<Row, '_key'>) {
    setRows((prev) => prev.map((r) => (r._key === key ? { ...row, _key: key } : r)));
  }
  function quitar(key: string) {
    setRows((prev) => prev.filter((r) => r._key !== key));
  }

  function confirmar() {
    if (!motivo.trim()) return toast.error('El motivo es obligatorio (RN-VER-06)');
    if (rows.length === 0) return toast.error('Una versión nueva debe tener al menos una línea');
    if (tipoCambio === 'ALCANCE' && !aprobadoPorCliente) {
      return toast.error('Un ALCANCE exige la aprobación del cliente (RN-VER-10)');
    }
    for (const r of rows) {
      if (!r.descripcion.trim()) return toast.error('Cada línea necesita descripción');
      if (!/^\d+(\.\d+)?$/.test(r.costoTeorico)) return toast.error(`Costo inválido en "${r.descripcion || 's/d'}"`);
      if (r.margenPct && !/^\d+(\.\d+)?$/.test(r.margenPct)) return toast.error('Margen inválido (ej: 50)');
      if (r.tipoLinea === 'ESTANDAR' && (r.servicioId == null || r.proveedorId == null)) {
        return toast.error('Una línea de servicio necesita servicio y proveedor');
      }
    }
    mutation.mutate();
  }

  const porDia = useMemo(() => {
    const map = new Map<number, Row[]>();
    for (const r of rows) {
      if (!map.has(r.dia)) map.set(r.dia, []);
      map.get(r.dia)!.push(r);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [rows]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) sembrar();
        setOpen(o);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className='max-h-[90vh] max-w-2xl overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Nueva versión de la OT</DialogTitle>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='grid gap-3 sm:grid-cols-2'>
            <div className='space-y-1.5'>
              <Label>Tipo de cambio</Label>
              <Select value={tipoCambio} onValueChange={(v) => setTipoCambio(v as TipoCambioVersion)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ALCANCE'>Alcance (recotiza la venta, exige aprobación)</SelectItem>
                  <SelectItem value='CORRECCION'>Corrección (no cambia venta ni costo)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='space-y-1.5'>
            <Label>Motivo (obligatorio)</Label>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder='Ej: el cliente agregó un traslado el día 3'
              rows={2}
            />
          </div>

          {/* RN-VER-10: un ALCANCE exige la aprobación del cliente (gate persistente). */}
          {tipoCambio === 'ALCANCE' && (
            <div className='space-y-2 rounded-md border p-3'>
              <label className='flex items-center gap-2 text-sm'>
                <Checkbox
                  checked={aprobadoPorCliente}
                  onCheckedChange={(c) => setAprobadoPorCliente(c === true)}
                />
                El cliente aprobó este cambio de alcance (RN-VER-10)
              </label>
              {aprobadoPorCliente && (
                <div className='space-y-1.5'>
                  <Label>Referencia de la aprobación</Label>
                  <Input
                    value={aprobacionReferencia}
                    onChange={(e) => setAprobacionReferencia(e.target.value)}
                    placeholder='Ej: correo de Juan Pérez del 12/10, OK WhatsApp…'
                  />
                </div>
              )}
            </div>
          )}

          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <Label>Líneas de la versión</Label>
              <LineaVersionDialog
                moneda={moneda}
                onSubmit={agregar}
                trigger={
                  <Button size='sm' variant='outline'>
                    <Icons.add className='mr-2 h-4 w-4' />
                    Agregar línea
                  </Button>
                }
              />
            </div>
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
                            · costo {formatMonto(r.costoTeorico, moneda)} · margen {r.margenPct || '0'}%
                          </span>
                        </span>
                        <span className='flex shrink-0 items-center gap-1'>
                          <LineaVersionDialog
                            moneda={moneda}
                            initial={r}
                            onSubmit={(row) => editar(r._key, row)}
                            trigger={
                              <Button variant='ghost' size='icon' className='h-7 w-7' title='Editar'>
                                <Icons.edit className='h-4 w-4' />
                              </Button>
                            }
                          />
                          <Button variant='ghost' size='icon' className='h-7 w-7' title='Quitar' onClick={() => quitar(r._key)}>
                            <Icons.trash className='h-4 w-4' />
                          </Button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={confirmar} isLoading={mutation.isPending}>
            Crear versión
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Diálogo para agregar/editar una línea de la versión. El costo se DIGITA (la OT
// no re-cotiza desde el tarifario); la venta la deriva el backend del margen.
function LineaVersionDialog({
  moneda,
  initial,
  trigger,
  onSubmit
}: {
  moneda: Moneda;
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
  const [cantidadPax, setCantidadPax] = useState('1');
  const [descripcion, setDescripcion] = useState('');
  const [descripcionEn, setDescripcionEn] = useState('');
  const [costoTeorico, setCostoTeorico] = useState('');
  const [margenPct, setMargenPct] = useState('');
  const [estadoServicio, setEstadoServicio] = useState<EstadoServicio>('PENDIENTE');

  const { data: serviciosData } = useQuery({ ...serviciosListOptions({ limit: 200 }), enabled: open });
  const servicios = serviciosData?.data ?? [];
  const servicioSel = servicios.find((s) => s.id === servicioId);
  const esAcomodacion = servicioSel?.modeloTarifa === 'ACOMODACION';
  const tipoServicioId = servicioSel?.tipoServicioId;

  const { data: proveedoresData } = useQuery({
    ...proveedoresListOptions({ limit: 200, ...(tipoServicioId ? { tipoServicioId } : {}) }),
    enabled: open && tipoServicioId != null
  });
  const proveedores = proveedoresData?.data ?? [];

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
      setEstadoServicio(initial.estadoServicio ?? 'PENDIENTE');
    } else {
      setDia('1');
      setBloque('AM');
      setTipoLinea('ESTANDAR');
      setServicioId(undefined);
      setProveedorId(undefined);
      setAcomodacion(undefined);
      setCantidadPax('1');
      setDescripcion('');
      setDescripcionEn('');
      setCostoTeorico('');
      setMargenPct('');
      setEstadoServicio('PENDIENTE');
    }
  }

  function confirmar() {
    const diaN = Number.parseInt(dia, 10);
    const paxN = Number.parseInt(cantidadPax, 10);
    if (!Number.isFinite(diaN) || diaN < 1) return toast.error('Día inválido');
    if (!Number.isFinite(paxN) || paxN < 1) return toast.error('Cantidad de pasajeros inválida');
    if (!/^\d+(\.\d+)?$/.test(costoTeorico)) return toast.error('Costo inválido');
    if (margenPct && !/^\d+(\.\d+)?$/.test(margenPct)) return toast.error('Margen inválido (ej: 50)');
    if (tipoLinea === 'ESTANDAR') {
      if (servicioId == null) return toast.error('Selecciona un servicio');
      if (proveedorId == null) return toast.error('Selecciona un proveedor');
      if (esAcomodacion && acomodacion == null) return toast.error('Selecciona la acomodación');
    }
    if (!descripcion.trim() && tipoLinea === 'OTRO') return toast.error('La descripción es obligatoria');

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
      margenPct,
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
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='ESTANDAR'>Servicio</SelectItem>
                <SelectItem value='OTRO'>Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {tipoLinea === 'ESTANDAR' && (
            <>
              <div className='col-span-2 space-y-1.5'>
                <Label>Servicio</Label>
                <Select
                  value={servicioId ? String(servicioId) : ''}
                  onValueChange={(v) => {
                    const id = Number.parseInt(v, 10);
                    if (Number.isFinite(id)) {
                      setServicioId(id);
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
            <Input type='number' min={1} value={cantidadPax} onChange={(e) => setCantidadPax(e.target.value)} />
          </div>
          <div className='space-y-1.5'>
            <Label>Costo teórico ({moneda})</Label>
            <Input
              value={costoTeorico}
              onChange={(e) => setCostoTeorico(e.target.value.replace(/[^\d.]/g, ''))}
              placeholder='0'
              inputMode='decimal'
            />
          </div>
          <div className='space-y-1.5'>
            <Label>Margen</Label>
            <div className='relative'>
              <Input
                value={margenPct}
                onChange={(e) => setMargenPct(e.target.value.replace(/[^\d.]/g, ''))}
                placeholder='Ej: 50'
                className='pr-6'
                inputMode='decimal'
              />
              <span className='text-muted-foreground pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-sm'>%</span>
            </div>
          </div>
          <div className='space-y-1.5'>
            <Label>Estado del servicio</Label>
            <Select value={estadoServicio} onValueChange={(v) => setEstadoServicio(v as EstadoServicio)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ESTADO_SERVICIO_LABELS) as EstadoServicio[]).map((e) => (
                  <SelectItem key={e} value={e}>
                    {ESTADO_SERVICIO_LABELS[e]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={confirmar}>{esEdicion ? 'Guardar' : 'Agregar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
