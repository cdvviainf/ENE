import type { Acomodacion, EstadoOT, EstadoServicio, Moneda, Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { noEncontrado, conflicto, validacion } from '../../shared/errors.js'
import {
  tomarLock,
  LOCK_ORDEN_TRABAJO_CORRELATIVO,
  LOCK_ORDEN_TRABAJO_VERSION,
} from '../../shared/advisory-locks.js'
import { generarNumeroAnual } from '../../shared/correlativos.js'
import { crearSiguienteVersion } from '../../shared/versionado/index.js'
import { ordenTrabajoVersionable } from '../../shared/versionado/adaptadores/ordenTrabajo.js'
import {
  aClp,
  aplicarMargen,
  aString,
  desdeClp,
  margenDesdeVenta,
  monto,
  restar,
  sumar,
  type Decimal,
  type Montoish,
} from '../../shared/dinero/index.js'
import { resolverTarifarioVigente, type TarifarioVigente } from '../costeo/costeo.repository.js'
import { resolverCosto } from '../costeo/costeo.service.js'
import type { LineaEstandar } from '../costeo/costeo.types.js'
import * as repo from './ordenes-trabajo.repository.js'
import type { FiltrosOrdenTrabajo } from './ordenes-trabajo.types.js'
import type { CrearOrdenDirectaInput, NuevaVersionOTInput, PreviewCostoInput } from './ordenes-trabajo.schema.js'
import { decorarLineasConImpuesto } from '../costeo/impuestos.js'
import { obtenerIndicadores } from '../config/indicadores/indicadores.service.js'

// ============================================================================
// Orden de Trabajo — Docs/reglas-negocio.md §7 (RN-OT-01..08). La OT nace de una
// cotización aprobada, copiando y CONGELANDO su programa, o se crea directa sin
// cotización (RN-OT-01 enmendada); en ambos casos la versión 1 es la línea base
// (RN-VER-12). Consume el correlativo anual (OT-{YYYY}-
// {NNNN}) y el mecanismo de versionado compartido (adaptador ordenTrabajoVersionable).
// ============================================================================

/** Fecha de operación del día N del itinerario (RN-COT-05): día 1 = fecha de
 * inicio de la OT, día N = inicio + (N−1). Se resuelve en UTC para no arrastrar
 * corrimientos por horario de verano (mismo criterio que la cotización). */
function fechaDelDia(inicio: Date, dia: number): Date {
  const f = new Date(inicio.getTime())
  f.setUTCDate(f.getUTCDate() + (dia - 1))
  return f
}

/**
 * RN-OT-01/02 [BLOQUEA]: genera la OT desde una cotización aprobada, copiando y
 * congelando cabecera + versión 1 (línea base) + líneas. Se invoca DENTRO de la
 * transacción de `cotizaciones.aprobar`, después de validar RN-COT-04 y antes de
 * marcar APROBADA. No se crea una OT a mano: su único invocador es la aprobación
 * (RN-OT-01). El `@unique cotizacionId` de OrdenTrabajo impide una segunda OT para
 * la misma cotización como backstop de RN-COT-02 (el guard de estado la rechaza antes).
 */
export async function generarDesdeCotizacion(
  tx: Prisma.TransactionClient,
  cotizacionId: number,
  usuario: string,
) {
  const cot = await tx.cotizacion.findUnique({
    where: { id: cotizacionId },
    include: {
      negocio: { select: { apellido: true } },
      zonas: { select: { zonaId: true } },
      versionVigente: { select: { id: true, costoTotal: true, margenTotal: true, ventaTotal: true } },
    },
  })
  if (!cot) throw noEncontrado('Cotización', cotizacionId)
  // RN-COT-04 ya garantiza la versión vigente con líneas al aprobar; este guard
  // es defensa en profundidad por si se invocara fuera de ese flujo.
  if (!cot.versionVigente) {
    throw conflicto('La cotización no tiene itinerario vigente para generar la OT (RN-COT-04).')
  }
  // RN-OT-03 [BLOQUEA]: el apellido del negocio es el identificador operativo de la OT.
  if (!cot.negocio.apellido?.trim()) {
    throw validacion('El negocio de la cotización no tiene apellido; es obligatorio en la OT (RN-OT-03).')
  }

  // Correlativo anual OT-{YYYY}-{NNNN} por año de creación (CLAUDE.md §7).
  const anio = new Date().getFullYear()
  await tomarLock(tx, LOCK_ORDEN_TRABAJO_CORRELATIVO, anio)
  const numero = await generarNumeroAnual(tx, 'ORDEN_TRABAJO', anio)

  // Cabecera congelada (RN-OT-02): programa, moneda y TC de cotización. Las zonas
  // se heredan de la cotización (RN-COT-08 → OrdenTrabajoZona).
  const ot = await tx.ordenTrabajo.create({
    data: {
      numero,
      cotizacionId: cot.id,
      clienteId: cot.clienteId,
      ejecutivoId: cot.ejecutivoId,
      negocioId: cot.negocioId,
      apellido: cot.negocio.apellido,
      areaNegocio: cot.areaNegocio,
      fechaOperacion: cot.fechaOperacion,
      cantidadPax: cot.cantidadPax,
      moneda: cot.moneda,
      tipoCambioCotizacion: cot.tipoCambio,
      estado: 'CONFIRMADA',
      creadoPor: usuario,
      zonas: { create: cot.zonas.map((z) => ({ zonaId: z.zonaId })) },
    },
  })

  // Versión 1 = línea base congelada (RN-VER-12). Con numero=1 el orquestador
  // omite motivo/validación/copia de líneas y fija la vigente; el tipoCambio
  // queda en el default del schema (ALCANCE), que en la v1 no se usa.
  const v1 = await crearSiguienteVersion(tx, ordenTrabajoVersionable, {
    cabeceraId: ot.id,
    datos: {
      costoTeoricoTotal: cot.versionVigente.costoTotal.toString(),
      margenTotal: cot.versionVigente.margenTotal.toString(),
      ventaTotal: cot.versionVigente.ventaTotal.toString(),
    },
    usuario,
    motivo: 'Línea base',
  })

  // Copia de líneas desde la versión vigente de la cotización (RN-OT-02). El costo
  // teórico de la línea queda plasmado; `fechaServicio` se deriva del día del
  // itinerario. Las líneas nacen con estadoServicio PENDIENTE.
  const lineas = await tx.cotizacionLinea.findMany({
    where: { cotizacionVersionId: cot.versionVigente.id },
    orderBy: [{ dia: 'asc' }, { bloque: 'asc' }, { orden: 'asc' }],
  })
  if (lineas.length > 0) {
    await tx.ordenTrabajoLinea.createMany({
      data: lineas.map((l) => ({
        ordenTrabajoVersionId: v1.id,
        dia: l.dia,
        bloque: l.bloque,
        orden: l.orden,
        tipoLinea: l.tipoLinea,
        servicioId: l.servicioId,
        proveedorId: l.proveedorId,
        descripcion: l.descripcion,
        descripcionEn: l.descripcionEn,
        cantidadPax: l.cantidadPax,
        acomodacion: l.acomodacion,
        costoTeorico: l.costoTotal,
        margenPct: l.margenPct,
        ventaLinea: l.ventaTotal,
        estadoServicio: 'PENDIENTE',
        fechaServicio: fechaDelDia(cot.fechaOperacion, l.dia),
      })),
    })
  }

  return ot
}

/** Convierte un monto de la moneda del tarifario a la de la OT con el TC
 * digitado. Solo hay dos monedas (mismo criterio que la cotización). */
function convertirMoneda(valor: Montoish, desde: Moneda, hacia: Moneda, tipoCambio: string): Decimal {
  if (desde === hacia) return monto(valor)
  return desde === 'CLP' ? desdeClp(valor, tipoCambio) : aClp(valor, tipoCambio)
}

/** Arma la línea de costeo desde el tarifario vigente resuelto (espejo de
 * `lineaEstandarDeSnapshot` de la cotización, pero desde el maestro: la OT no
 * congela snapshot). */
function lineaEstandarDeTarifario(t: TarifarioVigente, acomodacion: Acomodacion | undefined, pax: number): LineaEstandar {
  const base = { tipoLinea: 'ESTANDAR' as const, cantidadPax: pax, margenPct: '0', costoUnitario: '0', costoTotal: '0', ventaTotal: '0' }
  if (t.modelo === 'TRAMO_PAX') return { ...base, modelo: 'TRAMO_PAX', tramos: t.tramos }
  if (t.modelo === 'UNITARIO_PAX') return { ...base, modelo: 'UNITARIO_PAX', valorUnitario: t.valorUnitario }
  if (!acomodacion) throw validacion('La acomodación es obligatoria para un servicio con modelo ACOMODACION (RN-TAR-01)')
  const valorHabitacion = t.valoresPorAcomodacion[acomodacion]
  if (valorHabitacion == null) throw validacion(`El tarifario no tiene valor para la acomodación ${acomodacion}`)
  return { ...base, modelo: 'ACOMODACION', acomodacion, valorHabitacion }
}

/** POST /preview-costo — resuelve el costo del tarifario vigente para una línea
 * ESTANDAR, en la moneda de la OT, SIN persistir. Ayuda de captura del formulario
 * de OT directa (el costo precargado queda editable). `disponible:false` si no
 * hay tarifario vigente (la línea se carga como OTRO, RN-COS-05). */
export async function previewCostoLinea(input: PreviewCostoInput) {
  const fecha = fechaDelDia(input.fechaOperacion, input.dia)
  const tarifario = await resolverTarifarioVigente(input.proveedorId, input.servicioId, fecha)
  if (!tarifario) {
    return {
      disponible: false as const,
      motivo: `No hay tarifario vigente para este servicio y proveedor en la fecha del día ${input.dia}; cárguela como línea OTRO (RN-COS-05).`,
    }
  }
  try {
    const lineaEstandar = lineaEstandarDeTarifario(tarifario, input.acomodacion, input.cantidadPax)
    const costoTarifario = resolverCosto(lineaEstandar) // puede lanzar RN-TAR-03 (ningún tramo cubre el pax)
    const costoTotal = convertirMoneda(costoTarifario, tarifario.moneda, input.moneda, input.tipoCambio)
    return {
      disponible: true as const,
      moneda: input.moneda,
      costoTotal: aString(costoTotal),
      advertenciaVigencia: tarifario.advertenciaVigencia,
    }
  } catch (e) {
    return { disponible: false as const, motivo: (e as Error).message }
  }
}

/** POST /ordenes-trabajo — crea una OT directa (RN-OT-01 enmendada, oct-2026),
 * digitando los datos que de otro modo se importan de la cotización. Mismo armado
 * que `generarDesdeCotizacion` (cabecera + v1 línea base + líneas valorizadas),
 * pero `cotizacionId` queda null y todo viene del payload. Transaccional y
 * serializado por el correlativo anual (lock 491002). */
export async function crearOrdenDirecta(input: CrearOrdenDirectaInput, usuario: string) {
  const ot = await prisma.$transaction(async (tx) => {
    const cliente = await tx.cliente.findFirst({ where: { id: input.clienteId, eliminadoEn: null }, select: { id: true } })
    if (!cliente) throw noEncontrado('Cliente', input.clienteId)

    const negocio = await tx.negocio.findFirst({
      where: { id: input.negocioId, eliminadoEn: null },
      select: { id: true, apellido: true, clienteId: true },
    })
    if (!negocio) throw noEncontrado('Negocio', input.negocioId)
    // Decisión de usuario (nov-2026, QA-R2): un negocio asociado a OTRO cliente
    // no puede usarse; uno sin cliente sí (RN-GRP-05).
    if (negocio.clienteId != null && negocio.clienteId !== input.clienteId) {
      throw validacion('El negocio seleccionado pertenece a otro cliente.')
    }

    if (input.ejecutivoId != null) {
      const ejecutivo = await tx.clienteEjecutivo.findFirst({
        where: { id: input.ejecutivoId, clienteId: input.clienteId, eliminadoEn: null },
        select: { id: true },
      })
      if (!ejecutivo) throw validacion('El ejecutivo no pertenece al cliente seleccionado o no está vigente.')
    }

    // RN-OT-03: el apellido es el identificador operativo; si no se digita, se
    // toma del negocio.
    const apellido = input.apellido?.trim() || negocio.apellido?.trim()
    if (!apellido) throw validacion('El apellido es obligatorio en la OT (RN-OT-03).')

    const zonaIds = [...new Set(input.zonaIds)]
    if (zonaIds.length > 0) {
      const existentes = await tx.zona.count({ where: { id: { in: zonaIds }, eliminadoEn: null } })
      if (existentes !== zonaIds.length) throw validacion('Alguna de las zonas indicadas no existe o fue eliminada.')
    }

    // QA-R2-002: los servicios y proveedores de las líneas ESTANDAR deben estar
    // vigentes (soft delete, RN-MAN-05). Se valida en bloque dentro de la
    // transacción; si alguno fue eliminado se rechaza la OT completa.
    const estandar = input.lineas.filter((l) => l.tipoLinea === 'ESTANDAR')
    const servicioIds = [...new Set(estandar.map((l) => l.servicioId!))]
    const proveedorIds = [...new Set(estandar.map((l) => l.proveedorId!))]
    if (servicioIds.length > 0) {
      const vigentes = await tx.servicio.count({ where: { id: { in: servicioIds }, eliminadoEn: null } })
      if (vigentes !== servicioIds.length) throw validacion('Algún servicio de las líneas no existe o fue eliminado.')
    }
    if (proveedorIds.length > 0) {
      const vigentes = await tx.proveedor.count({ where: { id: { in: proveedorIds }, eliminadoEn: null } })
      if (vigentes !== proveedorIds.length) throw validacion('Algún proveedor de las líneas no existe o fue eliminado.')
    }

    // Correlativo anual OT-{YYYY}-{NNNN} (mismo namespace que la conversión).
    const anio = new Date().getFullYear()
    await tomarLock(tx, LOCK_ORDEN_TRABAJO_CORRELATIVO, anio)
    const numero = await generarNumeroAnual(tx, 'ORDEN_TRABAJO', anio)

    const ot = await tx.ordenTrabajo.create({
      data: {
        numero,
        cotizacionId: null,
        clienteId: input.clienteId,
        ejecutivoId: input.ejecutivoId ?? null,
        negocioId: input.negocioId,
        apellido,
        areaNegocio: input.areaNegocio,
        fechaOperacion: input.fechaOperacion,
        cantidadPax: input.cantidadPax,
        moneda: input.moneda,
        tipoCambioCotizacion: input.tipoCambio,
        estado: 'CONFIRMADA',
        creadoPor: usuario,
        zonas: { create: zonaIds.map((zonaId) => ({ zonaId })) },
      },
    })

    // Líneas valorizadas (reusa el mismo valorizador que las versiones).
    const valorizadas = input.lineas.map(valorizarLinea)
    const totales = totalesDe(valorizadas)

    // Versión 1 = línea base congelada (RN-VER-12), igual que en la conversión.
    const v1 = await crearSiguienteVersion(tx, ordenTrabajoVersionable, {
      cabeceraId: ot.id,
      datos: totales,
      usuario,
      motivo: 'Línea base',
    })

    await tx.ordenTrabajoLinea.createMany({
      data: valorizadas.map((l) => ({
        ordenTrabajoVersionId: v1.id,
        dia: l.dia,
        bloque: l.bloque,
        orden: l.orden,
        tipoLinea: l.tipoLinea,
        servicioId: l.servicioId,
        proveedorId: l.proveedorId,
        descripcion: l.descripcion,
        descripcionEn: l.descripcionEn,
        cantidadPax: l.cantidadPax,
        acomodacion: l.acomodacion,
        costoTeorico: l.costoTeorico,
        margenPct: l.margenPct,
        ventaLinea: l.ventaLinea,
        estadoServicio: l.estadoServicio,
        fechaServicio: fechaDelDia(input.fechaOperacion, l.dia),
      })),
    })

    return ot
  })
  return obtenerOrden(ot.id)
}

export async function listarOrdenes(page: number, limit: number, filtros: FiltrosOrdenTrabajo) {
  const { data, total } = await repo.findAllOrdenes(page, limit, filtros)
  return { data, meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } }
}

export async function obtenerOrden(id: number) {
  const ot = await repo.findOrdenById(id)
  if (!ot) throw noEncontrado('Orden de Trabajo', id)
  const versiones = await repo.listVersionesOT(id)
  if (!ot.versionVigente) return { ...ot, versiones }
  // RN-PRV-11/RN-IMP-02: IVA/retención referencial por línea de la versión
  // vigente. Solo lectura: no toca costo, margen ni venta.
  const tasas = await obtenerIndicadores()
  const { lineas, impuestos } = decorarLineasConImpuesto(ot.versionVigente.lineas, (l) => l.costoTeorico, tasas)
  return { ...ot, versionVigente: { ...ot.versionVigente, lineas, impuestos }, versiones }
}

/** GET /:id/versiones/:version — RN-VER-09: la versión histórica tal como quedó
 * guardada (líneas + evidencia de aprobación), no reconstruida desde los maestros. */
export async function obtenerVersionHistorica(id: number, version: number) {
  const v = await repo.findVersionOT(id, version)
  if (!v) throw noEncontrado(`Versión ${version} de la Orden de Trabajo`, id)
  return v
}

// RN-OT-04: ciclo de estados de la OT. RN-OT-06 [BLOQUEA]: una OT CANCELADA es
// terminal y no pasa a cierre como servicio realizado; NO_SHOW sí cierra. EN_ESPERA
// es un estado de larga duración (RN-OT-05), no una anomalía.
const TRANSICIONES_OT: Record<EstadoOT, EstadoOT[]> = {
  CONFIRMADA: ['EN_ESPERA', 'EN_PREPARACION', 'CANCELADA', 'NO_SHOW'],
  EN_ESPERA: ['EN_PREPARACION', 'CANCELADA', 'NO_SHOW'],
  EN_PREPARACION: ['EN_OPERACION', 'CANCELADA', 'NO_SHOW'],
  EN_OPERACION: ['EJECUTADA', 'CANCELADA', 'NO_SHOW'],
  EJECUTADA: ['CERRADA'],
  NO_SHOW: ['CERRADA'], // RN-OT-06: el no-show cierra como realizado.
  CANCELADA: [], // RN-OT-06: terminal; no alcanza CERRADA.
  CERRADA: [],
}

/** PATCH /estado — transición del ciclo de vida de la OT (RN-OT-04), con bloqueo
 * del cierre de una OT cancelada (RN-OT-06). La escritura es CONDICIONAL al estado
 * leído (`updateMany` WHERE estado = estadoLeído): si otra transición concurrente
 * cambió el estado entremedio, el lock de fila de Postgres serializa ambas y el
 * WHERE de la perdedora ya no calza → `count 0` → CONFLICT, en vez de reactivar
 * una OT recién cancelada (QA-IMP-016). */
export async function cambiarEstado(id: number, nuevoEstado: EstadoOT, usuario: string) {
  await prisma.$transaction(async (tx) => {
    const ot = await tx.ordenTrabajo.findUnique({
      where: { id },
      select: { id: true, estado: true, eliminadoEn: true },
    })
    if (!ot || ot.eliminadoEn) throw noEncontrado('Orden de Trabajo', id)
    if (ot.estado === nuevoEstado) return // no-op idempotente

    if (!TRANSICIONES_OT[ot.estado].includes(nuevoEstado)) {
      if (ot.estado === 'CANCELADA' && nuevoEstado === 'CERRADA') {
        throw conflicto('Una OT CANCELADA no pasa a cierre como servicio realizado (RN-OT-06).')
      }
      throw conflicto(`Transición de estado inválida: ${ot.estado} → ${nuevoEstado} (RN-OT-04).`)
    }

    const { count } = await tx.ordenTrabajo.updateMany({
      where: { id, estado: ot.estado },
      data: { estado: nuevoEstado, actualizadoPor: usuario },
    })
    if (count !== 1) {
      throw conflicto('El estado de la OT cambió durante la operación; reintente (RN-OT-04).')
    }
  })
  return obtenerOrden(id)
}

/** PATCH /lineas/:lid/estado-servicio — estado operativo de una línea
 * (PENDIENTE/TENTATIVO/CONFIRMADO/RECHAZADO/CANCELADO). Solo se registra sobre la
 * versión vigente; el historial es inmutable (RN-VER-08). */
export async function cambiarEstadoServicio(
  id: number,
  lineaId: number,
  estadoServicio: EstadoServicio,
  usuario: string,
) {
  await prisma.$transaction(async (tx) => {
    // QA-IMP-018: serializa contra POST /versiones (que toma el MISMO lock). Sin
    // esto, una versión nueva creada entremedio podría dejar la línea en una
    // versión histórica DESPUÉS de haberla leído como vigente, editando el
    // historial (viola RN-VER-02/03/08). Con el lock tomado, la lectura de
    // versionVigenteId de abajo es fresca y consistente con el update.
    await tomarLock(tx, LOCK_ORDEN_TRABAJO_VERSION, id)
    const ot = await tx.ordenTrabajo.findUnique({
      where: { id },
      select: { id: true, versionVigenteId: true, eliminadoEn: true },
    })
    if (!ot || ot.eliminadoEn) throw noEncontrado('Orden de Trabajo', id)
    const linea = await tx.ordenTrabajoLinea.findUnique({
      where: { id: lineaId },
      select: { id: true, ordenTrabajoVersionId: true },
    })
    if (!linea) throw noEncontrado('Línea de OT', lineaId)
    if (linea.ordenTrabajoVersionId !== ot.versionVigenteId) {
      throw conflicto(
        'La línea pertenece a una versión histórica de la OT y su estado de servicio no se puede modificar (RN-VER-08).',
      )
    }
    // RN-PER-03: registra el usuario de la sesión en la mutación operativa.
    await tx.ordenTrabajoLinea.update({
      where: { id: lineaId },
      data: { estadoServicio, actualizadoPor: usuario },
    })
  })
  return obtenerOrden(id)
}

/** Valoriza una línea recibida con decimal.js (RN-DIN-01). La venta sale de
 * `ventaObjetivo` (y el margen se deriva, RN-COT-11) o de `margenPct` aplicado al
 * costo (RN-COS-02). Nunca pasa por `number`. */
function valorizarLinea(l: NuevaVersionOTInput['lineas'][number]) {
  const costo = monto(l.costoTeorico)
  let venta: ReturnType<typeof monto>
  let margenPct: ReturnType<typeof monto>
  if (l.ventaObjetivo != null) {
    venta = monto(l.ventaObjetivo)
    margenPct = costo.isZero() ? monto('0') : margenDesdeVenta(costo, venta)
  } else {
    margenPct = monto(l.margenPct as string)
    venta = aplicarMargen(costo, margenPct)
  }
  return {
    dia: l.dia,
    bloque: l.bloque,
    orden: l.orden,
    tipoLinea: l.tipoLinea,
    servicioId: l.servicioId ?? null,
    proveedorId: l.proveedorId ?? null,
    descripcion: l.descripcion,
    descripcionEn: l.descripcionEn ?? null,
    cantidadPax: l.cantidadPax,
    acomodacion: l.acomodacion ?? null,
    estadoServicio: l.estadoServicio,
    costoTeorico: aString(costo),
    margenPct: aString(margenPct),
    ventaLinea: aString(venta),
  }
}

function totalesDe(lineas: ReturnType<typeof valorizarLinea>[]) {
  const costoTeoricoTotal = sumar(...lineas.map((l) => l.costoTeorico))
  const ventaTotal = sumar(...lineas.map((l) => l.ventaLinea))
  const margenTotal = restar(ventaTotal, costoTeoricoTotal)
  return {
    costoTeoricoTotal: aString(costoTeoricoTotal),
    margenTotal: aString(margenTotal),
    ventaTotal: aString(ventaTotal),
  }
}

/** POST /versiones — nueva versión de OT (RN-VER-02). El adaptador valida RN-VER-10
 * (ALCANCE exige aprobación del cliente; CORRECCION no cambia la venta) y RN-VER-11
 * (CORRECCION no cambia el costo). Las líneas llegan ya valorizadas y se totalizan
 * con decimal.js; la aprobación del ALCANCE queda persistida (RN-VER-10 / QA-VER-001).
 * Serializado por el advisory lock del adaptador. */
export async function crearNuevaVersion(id: number, input: NuevaVersionOTInput, usuario: string) {
  await prisma.$transaction(async (tx) => {
    const ot = await tx.ordenTrabajo.findUnique({
      where: { id },
      select: { id: true, estado: true, fechaOperacion: true, eliminadoEn: true },
    })
    if (!ot || ot.eliminadoEn) throw noEncontrado('Orden de Trabajo', id)
    if (ot.estado === 'CERRADA' || ot.estado === 'CANCELADA') {
      throw conflicto(`Una OT ${ot.estado} no admite nuevas versiones.`)
    }

    const valorizadas = input.lineas.map(valorizarLinea)
    const totales = totalesDe(valorizadas)

    // Solo un ALCANCE aprobado persiste evidencia; una CORRECCION no aprueba nada.
    const alcanceAprobado = input.tipoCambio === 'ALCANCE' && input.aprobadoPorCliente

    // crearSiguienteVersion valida RN-VER-10/11, crea la versión, copia las líneas
    // de la vigente y fija la nueva como vigente. Luego reemplazamos esa copia por
    // las líneas valorizadas recibidas.
    const nueva = await crearSiguienteVersion(tx, ordenTrabajoVersionable, {
      cabeceraId: id,
      datos: {
        tipoCambio: input.tipoCambio,
        aprobadoPorCliente: alcanceAprobado,
        aprobacionReferencia: alcanceAprobado ? (input.aprobacionReferencia ?? null) : null,
        aprobacionEn: alcanceAprobado ? new Date() : null,
        ...totales,
      },
      usuario,
      motivo: input.motivo,
    })

    await tx.ordenTrabajoLinea.deleteMany({ where: { ordenTrabajoVersionId: nueva.id } })
    await tx.ordenTrabajoLinea.createMany({
      data: valorizadas.map((l) => ({
        ordenTrabajoVersionId: nueva.id,
        dia: l.dia,
        bloque: l.bloque,
        orden: l.orden,
        tipoLinea: l.tipoLinea,
        servicioId: l.servicioId,
        proveedorId: l.proveedorId,
        descripcion: l.descripcion,
        descripcionEn: l.descripcionEn,
        cantidadPax: l.cantidadPax,
        acomodacion: l.acomodacion,
        costoTeorico: l.costoTeorico,
        margenPct: l.margenPct,
        ventaLinea: l.ventaLinea,
        estadoServicio: l.estadoServicio,
        fechaServicio: fechaDelDia(ot.fechaOperacion, l.dia),
      })),
    })
  })
  return obtenerOrden(id)
}
