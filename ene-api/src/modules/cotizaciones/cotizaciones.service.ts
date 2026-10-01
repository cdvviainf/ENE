import type { Acomodacion, Cotizacion, CotizacionLinea, Moneda, Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { noEncontrado, conflicto, validacion } from '../../shared/errors.js'
import { tomarLock, LOCK_COTIZACION_CORRELATIVO, LOCK_COTIZACION_VERSION } from '../../shared/advisory-locks.js'
import { generarNumeroAnual } from '../../shared/correlativos.js'
import { aClp, aplicarMargen, aString, desdeClp, dividir, margenDesdeVenta, monto, type Decimal, type Montoish } from '../../shared/dinero/index.js'
import { crearSiguienteVersion, exigirVersionEditable } from '../../shared/versionado/index.js'
import { cotizacionVersionable } from '../../shared/versionado/adaptadores/cotizacion.js'
import { resolverCosto, valorizar } from '../costeo/costeo.service.js'
import { resolverTarifarioVigente, type TarifarioVigente } from '../costeo/costeo.repository.js'
import type { LineaCosteo, LineaEstandar } from '../costeo/costeo.types.js'
import * as repo from './cotizaciones.repository.js'
import { TRANSICIONES_ESTADO, type LineaResuelta, type TarifarioSnapshot, type TotalesVersion } from './cotizaciones.types.js'
import type { CotizacionCreateInput, ItinerarioInput, LineaInput, NuevaVersionInput, PreviewLineaInput } from './cotizaciones.schema.js'

// ============================================================================
// Cotización — Docs/reglas-negocio.md §6. Consume el motor de costeo (Etapa 6:
// resolverCosto/valorizar), el resolvedor de tarifario vigente y el mecanismo
// de versionado compartido (shared/versionado + adaptador cotizacionVersionable).
// Ningún monto pasa nunca por number: todo por shared/dinero (RN-DIN-01).
// ============================================================================

/** Contexto de costeo de la cotización que necesita el armado de cada línea. */
interface ContextoCosteo {
  fechaOperacion: Date
  cantidadPax: number
  moneda: Moneda
  tipoCambio: string
}

function contextoDe(cot: Pick<Cotizacion, 'fechaOperacion' | 'cantidadPax' | 'moneda' | 'tipoCambio'>): ContextoCosteo {
  return {
    fechaOperacion: cot.fechaOperacion,
    cantidadPax: cot.cantidadPax,
    moneda: cot.moneda,
    tipoCambio: cot.tipoCambio.toString(),
  }
}

/** RN-MON-01 [BLOQUEA]: receptivo se cotiza en USD y eventos en CLP. La
 * correspondencia se valida en el servidor, no solo en la UI. */
function validarMonedaArea(areaNegocio: 'RECEPTIVO' | 'EVENTOS', moneda: Moneda): void {
  const esperada: Moneda = areaNegocio === 'RECEPTIVO' ? 'USD' : 'CLP'
  if (moneda !== esperada) {
    throw validacion(`El área ${areaNegocio} debe cotizarse en ${esperada}, no en ${moneda} (RN-MON-01)`)
  }
}

/** Fecha de operación del día N del itinerario (RN-COT-05): día 1 = fecha de
 * inicio de la cotización, día N = inicio + (N−1). Se resuelve en UTC para no
 * arrastrar corrimientos por horario de verano — la comparación de vigencias
 * del tarifario trabaja sobre el mismo instante (resolverTarifarioVigente). */
function fechaDelDia(inicio: Date, dia: number): Date {
  const f = new Date(inicio.getTime())
  f.setUTCDate(f.getUTCDate() + (dia - 1))
  return f
}

/** Convierte un monto de la moneda del tarifario a la de la cotización con el
 * tipo de cambio congelado de la cotización (decisión de usuario 24-sep-2026;
 * CLAUDE.md §7: tipoCambioCotizacion deriva el precio). Solo hay dos monedas:
 * CLP y USD. */
function convertirAMonedaCotizacion(valor: Montoish, desde: Moneda, hacia: Moneda, tipoCambio: string): Decimal {
  if (desde === hacia) return monto(valor)
  return desde === 'CLP' ? desdeClp(valor, tipoCambio) : aClp(valor, tipoCambio)
}

/** El margen (markup) que arranca en una línea, siempre editable después
 * (RN-COS-02/03). Precedencia: lo que venga digitado en la línea (la UI escribe
 * ahí el margen global cuando el usuario lo aplica — RN-COS-02: el global es una
 * acción de interfaz, no un valor de cabecera); si no, el margen sugerido del
 * servicio; si el servicio no lo define (queda en 0, el default del maestro), 0.
 * Las líneas OTRO no tienen servicio: si no traen margen, arrancan en 0. */
function margenDeLinea(digitado: string | undefined, margenSugerido: Decimal | null): string {
  if (digitado != null) return digitado
  if (margenSugerido != null && margenSugerido.gt(0)) return margenSugerido.toString()
  return '0'
}

/** Costo unitario informativo por línea. En TRAMO_PAX/UNITARIO_PAX es el costo
 * repartido entre los pasajeros; en ACOMODACION la línea es una habitación
 * (decisión Etapa 6), su unitario es el valor de la habitación. */
function costoUnitarioDe(modelo: LineaEstandar['modelo'], costoTotal: Decimal, pax: number): Decimal {
  return modelo === 'ACOMODACION' ? costoTotal : dividir(costoTotal, String(pax))
}

/** Arma una línea del itinerario ya valorizada, en la moneda de la cotización.
 * ESTANDAR resuelve su costo del tarifario vigente para la fecha de su día
 * (RN-COS-06, RN-TAR-05); OTRO usa el costo digitado (RN-COS-05). Lee maestros
 * con el cliente global (fuera de la transacción de escritura): son datos
 * comprometidos, no la cotización que se está guardando. */
async function armarLineaCosteo(input: LineaInput, ctx: ContextoCosteo): Promise<LineaResuelta> {
  const pax = input.cantidadPax ?? ctx.cantidadPax
  const base = {
    dia: input.dia,
    bloque: input.bloque,
    orden: input.orden,
    cantidadPax: pax,
  }

  if (input.tipoLinea === 'OTRO') {
    const margenPct = margenDeLinea(input.margenPct, null)
    const costoTotal = monto(input.costoTotal!)
    return {
      ...base,
      tipoLinea: 'OTRO',
      servicioId: null,
      proveedorId: null,
      tarifarioValorId: null,
      descripcion: input.descripcion!,
      descripcionEn: input.descripcionEn ?? null,
      acomodacion: null,
      costoUnitario: aString(costoTotal),
      costoTotal: aString(costoTotal),
      margenPct,
      ventaTotal: aString(aplicarMargen(costoTotal, margenPct)),
      advertenciaVigencia: false,
      tarifarioSnapshot: null,
    }
  }

  // ESTANDAR — servicio y proveedor deben estar vigentes (RN-MAN-05).
  const servicio = await prisma.servicio.findFirst({
    where: { id: input.servicioId!, eliminadoEn: null },
    select: { nombre: true, nombreEn: true, margenSugerido: true },
  })
  if (!servicio) throw noEncontrado('Servicio', input.servicioId!)
  const proveedor = await prisma.proveedor.findFirst({ where: { id: input.proveedorId!, eliminadoEn: null }, select: { id: true } })
  if (!proveedor) throw noEncontrado('Proveedor', input.proveedorId!)

  const fecha = fechaDelDia(ctx.fechaOperacion, input.dia)
  const tarifario = await resolverTarifarioVigente(input.proveedorId!, input.servicioId!, fecha)
  if (!tarifario) {
    throw validacion(
      `No hay tarifario vigente para el servicio ${input.servicioId} y el proveedor ${input.proveedorId} en la fecha del día ${input.dia}; ` +
        `cargue la línea como OTRO (RN-COS-05)`,
    )
  }

  // RN-COS-06: se congela la base tarifaria en la línea. Desde acá se costea al
  // capturar Y se recalculará por pax, sin volver a leer el maestro.
  const snapshot = snapshotDeTarifario(tarifario)
  const lineaEstandar = lineaEstandarDeSnapshot(snapshot, input.acomodacion, pax)
  const acomodacion: Acomodacion | null = snapshot.modelo === 'ACOMODACION' ? input.acomodacion! : null
  const margenPct = margenDeLinea(input.margenPct, servicio.margenSugerido)

  return {
    ...valorizarEstandar(base, lineaEstandar, snapshot, margenPct, pax, ctx),
    servicioId: input.servicioId!,
    proveedorId: input.proveedorId!,
    descripcion: input.descripcion ?? servicio.nombre,
    descripcionEn: input.descripcionEn ?? servicio.nombreEn,
    acomodacion,
    advertenciaVigencia: tarifario.advertenciaVigencia,
  }
}

/** Construye el snapshot congelable (RN-COS-06) desde el tarifario vigente
 * resuelto. */
function snapshotDeTarifario(t: TarifarioVigente): TarifarioSnapshot {
  if (t.modelo === 'TRAMO_PAX') {
    return { modelo: 'TRAMO_PAX', moneda: t.moneda, tramos: t.tramos.map((tr) => ({ paxDesde: tr.paxDesde, paxHasta: tr.paxHasta, valor: String(tr.valor) })) }
  }
  if (t.modelo === 'UNITARIO_PAX') {
    return { modelo: 'UNITARIO_PAX', moneda: t.moneda, valorUnitario: t.valorUnitario }
  }
  return { modelo: 'ACOMODACION', moneda: t.moneda, valoresPorAcomodacion: t.valoresPorAcomodacion }
}

/** Reconstruye la LineaEstandar del motor de costeo desde el snapshot congelado
 * (RN-COS-06) para una cantidad de pasajeros dada. */
function lineaEstandarDeSnapshot(snapshot: TarifarioSnapshot, acomodacion: Acomodacion | undefined, pax: number): LineaEstandar {
  const placeholder = { tipoLinea: 'ESTANDAR' as const, cantidadPax: pax, margenPct: '0', costoUnitario: '0', costoTotal: '0', ventaTotal: '0' }
  if (snapshot.modelo === 'TRAMO_PAX') {
    return { ...placeholder, modelo: 'TRAMO_PAX', tramos: snapshot.tramos }
  }
  if (snapshot.modelo === 'UNITARIO_PAX') {
    return { ...placeholder, modelo: 'UNITARIO_PAX', valorUnitario: snapshot.valorUnitario }
  }
  if (!acomodacion) {
    throw validacion(`La acomodación es obligatoria para un servicio con modelo ACOMODACION (RN-TAR-01)`)
  }
  const valorHabitacion = snapshot.valoresPorAcomodacion[acomodacion]
  if (valorHabitacion == null) {
    throw validacion(`El tarifario no tiene valor para la acomodación ${acomodacion}`)
  }
  return { ...placeholder, modelo: 'ACOMODACION', acomodacion, valorHabitacion }
}

/** Valoriza una línea ESTANDAR desde su LineaEstandar de costeo y el snapshot,
 * convirtiendo a la moneda de la cotización con el TC congelado. Devuelve los
 * campos comunes; el llamador completa servicio/proveedor/descripción. */
function valorizarEstandar(
  base: { dia: number; bloque: LineaResuelta['bloque']; orden: number; cantidadPax: number },
  lineaEstandar: LineaEstandar,
  snapshot: TarifarioSnapshot,
  margenPct: string,
  pax: number,
  ctx: ContextoCosteo,
): LineaResuelta {
  // resolverCosto puede lanzar RN-TAR-03 (ningún tramo cubre el pax).
  const costoTarifario = resolverCosto(lineaEstandar)
  const costoTotal = convertirAMonedaCotizacion(costoTarifario, snapshot.moneda, ctx.moneda, ctx.tipoCambio)
  return {
    ...base,
    tipoLinea: 'ESTANDAR',
    servicioId: null,
    proveedorId: null,
    // RN-COS-06: el costo queda plasmado; la base congelada vive en tarifarioSnapshot.
    tarifarioValorId: null,
    descripcion: '',
    descripcionEn: null,
    acomodacion: null,
    costoUnitario: aString(costoUnitarioDe(snapshot.modelo, costoTotal, pax)),
    costoTotal: aString(costoTotal),
    margenPct,
    ventaTotal: aString(aplicarMargen(costoTotal, margenPct)),
    advertenciaVigencia: false,
    tarifarioSnapshot: snapshot,
  }
}

/** Línea persistida de la versión vigente (todos sus escalares, incluido
 * tarifarioSnapshot). Sirve tanto la lectura con includes como la lectura plana
 * dentro de una transacción. */
type VigenteLinea = CotizacionLinea

/** Conserva una línea ESTANDAR existente (RN-COS-06): mantiene su costo y su
 * base tarifaria congelados, aplicando solo el margen (editable, RN-COS-02/03)
 * y los cambios de presentación (día/bloque/orden/descripción). NO consulta el
 * maestro. */
function conservarLineaEstandar(existing: VigenteLinea, input: LineaInput): LineaResuelta {
  const costoTotal = existing.costoTotal.toString()
  const margenPct = input.margenPct ?? existing.margenPct.toString()
  return {
    id: existing.id,
    dia: input.dia,
    bloque: input.bloque,
    orden: input.orden,
    tipoLinea: 'ESTANDAR',
    servicioId: existing.servicioId,
    proveedorId: existing.proveedorId,
    tarifarioValorId: null,
    descripcion: input.descripcion ?? existing.descripcion,
    descripcionEn: input.descripcionEn ?? existing.descripcionEn,
    // El costo está congelado para esta cantidad de pasajeros (RN-COS-06); no
    // se toca acá. Cambiar el pax pasa por el recálculo explícito (RN-COS-07).
    cantidadPax: existing.cantidadPax,
    acomodacion: existing.acomodacion,
    costoUnitario: existing.costoUnitario.toString(),
    costoTotal,
    margenPct,
    ventaTotal: aString(aplicarMargen(costoTotal, margenPct)),
    advertenciaVigencia: false,
    tarifarioSnapshot: (existing.tarifarioSnapshot as TarifarioSnapshot | null),
  }
}

/** Arma las líneas del itinerario preservando las existentes (RN-COS-06). Una
 * línea ESTANDAR con `id` que ya existía y mantiene su servicio, proveedor y
 * acomodación conserva su costo congelado; cualquier otra (nueva, o con
 * servicio/proveedor/acomodación cambiados = sustitución) resuelve el maestro
 * una vez. Las líneas OTRO siempre toman su costo del input (RN-COS-05). */
async function armarLineasConservando(
  inputs: LineaInput[],
  ctx: ContextoCosteo,
  vigenteLineas: VigenteLinea[],
): Promise<LineaResuelta[]> {
  const porId = new Map(vigenteLineas.map((l) => [l.id, l]))
  const lineas: LineaResuelta[] = []
  for (const input of inputs) {
    if (input.tipoLinea === 'ESTANDAR' && input.id != null) {
      const existing = porId.get(input.id)
      const mismaBase =
        existing != null &&
        existing.tipoLinea === 'ESTANDAR' &&
        existing.servicioId === input.servicioId &&
        existing.proveedorId === input.proveedorId &&
        (existing.acomodacion ?? null) === (input.acomodacion ?? null)
      if (mismaBase) {
        lineas.push(conservarLineaEstandar(existing, input))
        continue
      }
    }
    lineas.push(await armarLineaCosteo(input, ctx))
  }
  return lineas
}

/** Totales de la versión (RN-COS-04): se reusa `valorizar` del motor de costeo
 * tratando cada línea ya convertida como una OTRO (su costoTotal es el costo
 * final en la moneda de la cotización). La venta es la suma de las líneas y el
 * margen se deriva; no se guarda un margen global aparte. */
function totalesDeLineas(lineas: LineaResuelta[]): TotalesVersion {
  const comoCosteo: LineaCosteo[] = lineas.map((l) => ({
    tipoLinea: 'OTRO',
    cantidadPax: l.cantidadPax,
    margenPct: l.margenPct,
    costoUnitario: l.costoUnitario,
    costoTotal: l.costoTotal,
    ventaTotal: l.ventaTotal,
  }))
  const { costoTotal, margenTotal, ventaTotal } = valorizar(comoCosteo)
  return { costoTotal: aString(costoTotal), margenTotal: margenTotal.toString(), ventaTotal: aString(ventaTotal) }
}

// ─── Casos de uso ───────────────────────────────────────────────────────────

export async function listarCotizaciones(
  page: number,
  limit: number,
  filtros: Parameters<typeof repo.findAllCotizaciones>[2],
) {
  const { data, total } = await repo.findAllCotizaciones(page, limit, filtros)
  return { data, meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } }
}

export async function obtenerCotizacion(id: number) {
  const cot = await repo.findCotizacionById(id)
  if (!cot) throw noEncontrado('Cotización', id)
  return cot
}

export async function crearCotizacion(input: CotizacionCreateInput, usuario: string) {
  validarMonedaArea(input.areaNegocio, input.moneda)
  const id = await prisma.$transaction(async (tx) => {
    const cliente = await tx.cliente.findFirst({ where: { id: input.clienteId, eliminadoEn: null } })
    if (!cliente) throw noEncontrado('Cliente', input.clienteId)
    const grupo = await tx.grupo.findFirst({ where: { id: input.grupoId, eliminadoEn: null } })
    if (!grupo) throw noEncontrado('Grupo', input.grupoId)
    if (input.ejecutivoId != null) {
      const ej = await tx.clienteEjecutivo.findFirst({ where: { id: input.ejecutivoId, clienteId: input.clienteId, eliminadoEn: null } })
      if (!ej) throw noEncontrado('Ejecutivo del cliente', input.ejecutivoId)
    }
    if (input.zonaId != null) {
      const zona = await tx.zona.findFirst({ where: { id: input.zonaId, eliminadoEn: null } })
      if (!zona) throw noEncontrado('Zona', input.zonaId)
    }

    // Correlativo anual COT-{YYYY}-{NNNN} por año de creación (CLAUDE.md §7).
    const anio = new Date().getFullYear()
    await tomarLock(tx, LOCK_COTIZACION_CORRELATIVO, anio)
    const numero = await generarNumeroAnual(tx, 'COTIZACION', anio)

    const cabecera = await repo.crearCabeceraTx(
      tx,
      {
        clienteId: input.clienteId,
        ejecutivoId: input.ejecutivoId ?? null,
        grupoId: input.grupoId,
        areaNegocio: input.areaNegocio,
        zonaId: input.zonaId ?? null,
        fechaOperacion: input.fechaOperacion,
        cantidadPax: input.cantidadPax,
        idiomaDocumento: input.idiomaDocumento,
        moneda: input.moneda,
        tipoCambio: input.tipoCambio,
        estado: 'BORRADOR',
      },
      numero,
      usuario,
    )

    // Versión 1 vacía (la línea base se llena con PUT /itinerario). Reusa el
    // mecanismo de versionado compartido en vez de crear la versión a mano.
    await crearSiguienteVersion(tx, cotizacionVersionable, {
      cabeceraId: cabecera.id,
      datos: { costoTotal: '0', margenTotal: '0', ventaTotal: '0' },
      usuario,
    })

    return cabecera.id
  })

  return repo.findCotizacionById(id)
}

/** Cotización con su versión vigente y las líneas de esa versión — la forma
 * mínima que necesitan el armado y el recálculo. */
type CotizacionConLineas = Cotizacion & { versionVigente: { lineas: CotizacionLinea[] } | null }

/** Relee la cotización con las líneas de su versión vigente DENTRO de una
 * transacción (RN-COT-02 [BLOQUEA], concurrencia): tomar el lock y releer acá
 * evita que una operación concurrente cambie el estado entre la validación y la
 * escritura. */
function cargarCotConLineasTx(tx: Prisma.TransactionClient, id: number) {
  return tx.cotizacion.findUnique({
    where: { id },
    include: { versionVigente: { include: { lineas: true } } },
  })
}

/** PUT /itinerario — reemplaza las líneas de la versión vigente. Solo en
 * BORRADOR (RN-VER-08): una vez enviada, los cambios se hacen creando una
 * versión nueva (RN-VER-02). Serializada por cotización (lock 491007) y con la
 * validación de estado dentro de la transacción (RN-COT-02). */
export async function guardarItinerario(id: number, input: ItinerarioInput, usuario: string) {
  await prisma.$transaction(async (tx) => {
    await tomarLock(tx, LOCK_COTIZACION_VERSION, id)
    const cot = await cargarCotConLineasTx(tx, id)
    if (!cot || cot.eliminadoEn) throw noEncontrado('Cotización', id)
    if (cot.estado !== 'BORRADOR') {
      throw conflicto(
        `El itinerario solo se edita mientras la cotización está en BORRADOR; en ${cot.estado} los cambios se hacen creando una versión nueva (RN-VER-02, RN-COT-01)`,
      )
    }
    if (cot.versionVigenteId == null || !cot.versionVigente) throw conflicto('La cotización no tiene versión vigente')

    const lineas = await armarLineasConservando(input.lineas, contextoDe(cot), cot.versionVigente.lineas)
    const totales = totalesDeLineas(lineas)
    await exigirVersionEditable(tx, cotizacionVersionable, id, cot.versionVigenteId)
    await repo.reemplazarLineasTx(tx, cot.versionVigenteId, lineas, totales)
    await tx.cotizacion.update({ where: { id }, data: { actualizadoPor: usuario } })
  })

  return repo.findCotizacionById(id)
}

/** POST /versiones — nueva versión de negociación tras el envío (RN-VER-02).
 * En BORRADOR no aplica: ahí el itinerario se edita directo (RN-VER-08).
 * Serializada por cotización con validación de estado dentro de la transacción
 * (RN-COT-02). */
export async function crearNuevaVersion(id: number, input: NuevaVersionInput, usuario: string) {
  await prisma.$transaction(async (tx) => {
    await tomarLock(tx, LOCK_COTIZACION_VERSION, id)
    const cot = await cargarCotConLineasTx(tx, id)
    if (!cot || cot.eliminadoEn) throw noEncontrado('Cotización', id)
    if (cot.estado === 'BORRADOR') {
      throw conflicto('En BORRADOR el itinerario se edita directamente (PUT /itinerario); las versiones nuevas son para renegociar tras el envío (RN-VER-08)')
    }
    if (cot.estado === 'APROBADA' || cot.estado === 'PERDIDA' || cot.estado === 'DESISTIDA') {
      throw conflicto(`Una cotización ${cot.estado} no admite nuevas versiones (RN-COT-02, RN-COT-03)`)
    }

    const lineas = await armarLineasConservando(input.lineas, contextoDe(cot), cot.versionVigente?.lineas ?? [])
    const totales = totalesDeLineas(lineas)
    const nueva = await crearSiguienteVersion(tx, cotizacionVersionable, {
      cabeceraId: id,
      datos: totales,
      usuario,
      motivo: input.motivo,
    })
    // crearSiguienteVersion copió las líneas de la versión anterior; las
    // reemplazamos por las nuevas (preservando el costo de las conservadas).
    await repo.reemplazarLineasTx(tx, nueva.id, lineas, totales)
    // Crear una versión nueva es renegociar: vuelve a EN_NEGOCIACION.
    await tx.cotizacion.update({ where: { id }, data: { estado: 'EN_NEGOCIACION', actualizadoPor: usuario } })
  })

  return repo.findCotizacionById(id)
}

/** Recalcula las líneas de la versión vigente para una nueva cantidad de
 * pasajeros (RN-COS-07). ESTANDAR se recalcula contra su snapshot congelado
 * (RN-COS-06): NUNCA se re-resuelve el maestro, así una modificación posterior
 * del tarifario no altera la cotización. OTRO conserva su costo digitado
 * (RN-COS-05) pero sincroniza su cantidadPax a la nueva base para que cabecera
 * y líneas queden coherentes (decisión de usuario 24-sep-2026). Función pura de
 * armado: no persiste. */
function recalcularLineas(cot: CotizacionConLineas, nuevoPax: number): LineaResuelta[] {
  if (!cot.versionVigente) throw conflicto('La cotización no tiene versión vigente')
  const ctx = contextoDe(cot)
  return cot.versionVigente.lineas.map((l) => {
    if (l.tipoLinea === 'OTRO') {
      return {
        // Conserva el id (RN-COS-06): al aplicar, reemplazarLineasTx actualiza
        // en su lugar en vez de recrear, para que el id no cambie.
        id: l.id,
        dia: l.dia,
        bloque: l.bloque,
        orden: l.orden,
        tipoLinea: 'OTRO',
        servicioId: null,
        proveedorId: null,
        tarifarioValorId: null,
        descripcion: l.descripcion,
        descripcionEn: l.descripcionEn,
        cantidadPax: nuevoPax,
        acomodacion: null,
        costoUnitario: l.costoUnitario.toString(),
        costoTotal: l.costoTotal.toString(),
        margenPct: l.margenPct.toString(),
        ventaTotal: l.ventaTotal.toString(),
        advertenciaVigencia: false,
        tarifarioSnapshot: null,
      }
    }

    const snapshot = l.tarifarioSnapshot as TarifarioSnapshot | null
    if (!snapshot) {
      // Una línea ESTANDAR siempre se guardó con snapshot (RN-COS-06). Si falta,
      // es un dato corrupto: no se puede recalcular sin re-leer el maestro.
      throw conflicto(`La línea ${l.id} no tiene base tarifaria congelada; no se puede recalcular (RN-COS-06)`)
    }
    const lineaEstandar = lineaEstandarDeSnapshot(snapshot, l.acomodacion ?? undefined, nuevoPax)
    const margenPct = l.margenPct.toString()
    return {
      ...valorizarEstandar({ dia: l.dia, bloque: l.bloque, orden: l.orden, cantidadPax: nuevoPax }, lineaEstandar, snapshot, margenPct, nuevoPax, ctx),
      id: l.id,
      servicioId: l.servicioId,
      proveedorId: l.proveedorId,
      descripcion: l.descripcion,
      descripcionEn: l.descripcionEn,
      acomodacion: l.acomodacion,
    }
  })
}

/** POST /recalcular-pax — preview del recálculo (RN-COS-07). NO persiste:
 * devuelve las líneas recalculadas para que el frontend muestre el diff antes
 * de aplicar. */
export async function previewRecalcularPax(id: number, nuevoPax: number) {
  const cot = await repo.findCotizacionById(id)
  if (!cot) throw noEncontrado('Cotización', id)
  const lineas = recalcularLineas(cot, nuevoPax)
  return { lineas, totales: totalesDeLineas(lineas) }
}

/** POST /:id/preview-linea — valoriza una línea ESTANDAR sin persistir, para
 * que el diálogo del itinerario muestre el costo del tarifario vigente y la
 * venta ANTES de guardar (ítems de UX del cotizador). Reutiliza `armarLineaCosteo`
 * —la MISMA ruta de costeo que el guardado real (RN-COS-06)—, sin duplicar
 * lógica. Si no hay tarifario vigente para la combinación, devuelve
 * `{ disponible: false }` en vez de lanzar: el diálogo lo muestra inline y
 * sugiere cargar la línea como OTRO (RN-COS-05), sin esperar al guardado.
 * `ventaObjetivo` deriva el margen desde la venta digitada (RN-COS-04) con
 * decimal.js en el servidor; ningún monto pasa por number (RN-DIN-01). */
export async function previewLinea(id: number, input: PreviewLineaInput) {
  const cot = await repo.findCotizacionById(id)
  if (!cot) throw noEncontrado('Cotización', id)
  const ctx = contextoDe(cot)

  // RN-COS-06: si es una línea YA PERSISTIDA de la versión vigente que conserva
  // su base (servicio/proveedor/acomodación), el costo está congelado y NO se
  // re-resuelve del maestro —espejo exacto de conservarLineaEstandar, para que
  // el preview coincida con lo que persiste el guardado aunque el tarifario haya
  // cambiado después—. El costo congelado ya está en la moneda de la cotización.
  if (input.lineaId != null) {
    const existing = cot.versionVigente?.lineas.find((l) => l.id === input.lineaId)
    const mismaBase =
      existing != null &&
      existing.tipoLinea === 'ESTANDAR' &&
      existing.servicioId === input.servicioId &&
      existing.proveedorId === input.proveedorId &&
      (existing.acomodacion ?? null) === (input.acomodacion ?? null)
    if (mismaBase && existing) {
      const costoTotal = existing.costoTotal.toString()
      const { margenPct, ventaTotal } = resolverMargenYVenta(costoTotal, input.margenPct ?? existing.margenPct.toString(), input.ventaObjetivo)
      return {
        disponible: true as const,
        moneda: ctx.moneda,
        costoUnitario: existing.costoUnitario.toString(),
        costoTotal,
        margenPct,
        ventaTotal,
        advertenciaVigencia: false,
      }
    }
  }

  // Línea nueva o sustitución (cambió servicio/proveedor/acomodación): se
  // resuelve el maestro. Pre-chequeo de disponibilidad: el caso "sin tarifario"
  // es respuesta normal, no error (RN-TAR-07: la vigencia se resuelve en el
  // servidor con la fecha).
  const fecha = fechaDelDia(ctx.fechaOperacion, input.dia)
  const tarifario = await resolverTarifarioVigente(input.proveedorId, input.servicioId, fecha)
  if (!tarifario) {
    return {
      disponible: false as const,
      motivo: `No hay tarifario vigente para este servicio y proveedor en la fecha del día ${input.dia}; cárguela como línea OTRO (RN-COS-05).`,
    }
  }

  // Misma valorización que el guardado real (margen sugerido del servicio si no
  // viene uno, RN-COS-02). `armarLineaCosteo` puede lanzar RN-TAR-03 (ningún
  // tramo cubre el pax): eso sí es un error de captura y se propaga.
  const linea = await armarLineaCosteo(
    {
      dia: input.dia,
      bloque: 'AM',
      orden: 0,
      tipoLinea: 'ESTANDAR',
      servicioId: input.servicioId,
      proveedorId: input.proveedorId,
      acomodacion: input.acomodacion,
      cantidadPax: input.cantidadPax,
      margenPct: input.margenPct,
    },
    ctx,
  )

  const { margenPct, ventaTotal } = resolverMargenYVenta(linea.costoTotal, linea.margenPct, input.ventaObjetivo)
  return {
    disponible: true as const,
    moneda: ctx.moneda,
    costoUnitario: linea.costoUnitario,
    costoTotal: linea.costoTotal,
    margenPct,
    ventaTotal,
    advertenciaVigencia: linea.advertenciaVigencia,
  }
}

/** Margen y venta a mostrar en el preview. Si el usuario digitó una venta
 * objetivo, el margen se DERIVA de ella (RN-COS-04: venta/costo − 1) y la venta
 * se recompone desde ese margen ya redondeado a Decimal(7,4), para que el valor
 * mostrado sea el que quedaría guardado y no el objetivo crudo. Si no, se aplica
 * el margen base (el del input o el sugerido/congelado). Todo con decimal.js
 * (RN-DIN-01). */
function resolverMargenYVenta(costoTotal: string, margenBase: string, ventaObjetivo?: string): { margenPct: string; ventaTotal: string } {
  if (ventaObjetivo != null) {
    const margenPct = margenDesdeVenta(costoTotal, ventaObjetivo).toFixed(4)
    return { margenPct, ventaTotal: aString(aplicarMargen(costoTotal, margenPct)) }
  }
  return { margenPct: margenBase, ventaTotal: aString(aplicarMargen(costoTotal, margenBase)) }
}

/** PATCH /cantidad-pax — aplica el recálculo (RN-COS-07) de forma transaccional,
 * dejando cabecera y líneas coherentes en la misma base de pasajeros. En
 * BORRADOR escribe directo sobre la versión vigente (RN-VER-08); tras el envío
 * (ENVIADA/EN_NEGOCIACION) crea una versión nueva con `motivo` obligatorio
 * (RN-VER-02/06), sin tocar las versiones históricas. */
export async function aplicarRecalculoPax(id: number, nuevoPax: number, motivo: string | undefined, usuario: string) {
  await prisma.$transaction(async (tx) => {
    await tomarLock(tx, LOCK_COTIZACION_VERSION, id)
    const cot = await cargarCotConLineasTx(tx, id)
    if (!cot || cot.eliminadoEn) throw noEncontrado('Cotización', id)
    if (cot.versionVigenteId == null) throw conflicto('La cotización no tiene versión vigente')

    const lineas = recalcularLineas(cot, nuevoPax)
    const totales = totalesDeLineas(lineas)

    if (cot.estado === 'BORRADOR') {
      await exigirVersionEditable(tx, cotizacionVersionable, id, cot.versionVigenteId)
      await repo.reemplazarLineasTx(tx, cot.versionVigenteId, lineas, totales)
      await tx.cotizacion.update({ where: { id }, data: { cantidadPax: nuevoPax, actualizadoPor: usuario } })
      return
    }
    if (cot.estado === 'ENVIADA' || cot.estado === 'EN_NEGOCIACION') {
      if (!motivo?.trim()) throw validacion('El motivo es obligatorio para cambiar la cantidad de pasajeros tras el envío (RN-VER-06)')
      const nueva = await crearSiguienteVersion(tx, cotizacionVersionable, { cabeceraId: id, datos: totales, usuario, motivo })
      await repo.reemplazarLineasTx(tx, nueva.id, lineas, totales)
      await tx.cotizacion.update({ where: { id }, data: { cantidadPax: nuevoPax, estado: 'EN_NEGOCIACION', actualizadoPor: usuario } })
      return
    }
    throw conflicto(`Una cotización ${cot.estado} no admite cambios de cantidad de pasajeros (RN-COT-02, RN-COT-03)`)
  })

  return repo.findCotizacionById(id)
}

/** PATCH /estado — transición comercial validada (RN-COT-01). APROBADA no pasa
 * por acá (lo bloquea el schema): se alcanza solo con POST /aprobar.
 * Serializada por cotización con la validación dentro de la transacción
 * (RN-COT-02, concurrencia). */
export async function cambiarEstado(id: number, nuevoEstado: (typeof TRANSICIONES_ESTADO)['BORRADOR'][number], usuario: string) {
  return prisma.$transaction(async (tx) => {
    await tomarLock(tx, LOCK_COTIZACION_VERSION, id)
    const cot = await tx.cotizacion.findUnique({ where: { id } })
    if (!cot || cot.eliminadoEn) throw noEncontrado('Cotización', id)
    if (!TRANSICIONES_ESTADO[cot.estado].includes(nuevoEstado)) {
      throw conflicto(`Transición de estado inválida: ${cot.estado} → ${nuevoEstado} (RN-COT-01)`)
    }
    return tx.cotizacion.update({ where: { id }, data: { estado: nuevoEstado, actualizadoPor: usuario } })
  })
}

/** POST /aprobar — valida RN-COT-04 y marca APROBADA. La generación de la OT es
 * el punto de entrada de la Etapa 8 (decisión de usuario 24-sep-2026): acá la
 * cotización queda lista e inmutable (RN-COT-02), sin crear OT todavía.
 * Serializada por cotización con la validación dentro de la transacción para que
 * una operación concurrente no reabra una cotización terminal (RN-COT-02). */
export async function aprobar(id: number, usuario: string) {
  return prisma.$transaction(async (tx) => {
    await tomarLock(tx, LOCK_COTIZACION_VERSION, id)
    const cot = await tx.cotizacion.findUnique({ where: { id } })
    if (!cot || cot.eliminadoEn) throw noEncontrado('Cotización', id)
    if (cot.estado === 'APROBADA') throw conflicto('La cotización ya está aprobada (RN-COT-02)')
    if (!TRANSICIONES_ESTADO[cot.estado].includes('APROBADA')) {
      throw conflicto(`No se puede aprobar una cotización en estado ${cot.estado} (RN-COT-01)`)
    }

    const faltantes: string[] = []
    if (cot.ejecutivoId == null) faltantes.push('ejecutivo')
    if (cot.cantidadPax < 1) faltantes.push('cantidad de pasajeros')
    if (cot.versionVigenteId == null) {
      faltantes.push('itinerario')
    } else if ((await tx.cotizacionLinea.count({ where: { cotizacionVersionId: cot.versionVigenteId } })) < 1) {
      faltantes.push('al menos una línea valorizada')
    }
    if (faltantes.length > 0) {
      throw validacion(`No se puede aprobar la cotización sin: ${faltantes.join(', ')} (RN-COT-04)`)
    }

    return tx.cotizacion.update({ where: { id }, data: { estado: 'APROBADA', actualizadoPor: usuario } })
  })
}

export async function listarVersiones(id: number) {
  await obtenerCotizacion(id)
  return repo.listVersiones(id)
}

/** RN-VER-09: la versión histórica se devuelve tal como se guardó. */
export async function obtenerVersion(id: number, version: number) {
  await obtenerCotizacion(id)
  const v = await repo.findVersionConLineas(id, version)
  if (!v) throw noEncontrado(`Versión ${version} de la cotización`, id)
  return v
}
