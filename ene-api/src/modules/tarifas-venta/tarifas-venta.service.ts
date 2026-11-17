import type { Acomodacion, Moneda } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { noEncontrado, conflicto, validacion } from '../../shared/errors.js'
import { tomarLockPorTexto, LOCK_TARIFA_VENTA_VIGENCIA } from '../../shared/advisory-locks.js'
import { seSolapanVigencias, validarModeloYTramos } from '../tarifas/tarifas.service.js'
import type { TarifarioVigente } from '../costeo/costeo.repository.js'
import type { TramoValor } from '../costeo/costeo.types.js'
import * as repo from './tarifas-venta.repository.js'
import type {
  EstadoTarifaVenta,
  ServiciosConTarifaQuery,
  TarifaVentaCambioInput,
  TarifaVentaCreateInput,
} from './tarifas-venta.schema.js'

// ============================================================================
// Tarifas de venta — Docs/reglas-negocio.md §4 bis (RN-TVE-01..06, nov-2026).
// Precio de lista por servicio, sin proveedor. Reutiliza las validaciones del
// tarifario de proveedor (modelo/tramos RN-TAR-01/02, solape de vigencias
// RN-TAR-07) con la cadena definida por servicio+moneda en vez de
// proveedor+servicio.
// ============================================================================

// ─── Estado de vigencia (RN-TVE-04) — funciones puras ───────────────────────

/** "Hoy" como fecha calendario en America/Santiago, a medianoche UTC: es la
 * misma representación con que se guardan las vigencias (fecha sin hora). */
export function hoyComoFecha(ahora: Date = new Date()): Date {
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(ahora)
  return new Date(`${ymd}T00:00:00.000Z`)
}

type Vigencia = { vigenciaDesde: Date; vigenciaHasta: Date | null }

/** Estado de UNA tarifa a una fecha. Ambos extremos de la vigencia son
 * inclusivos (misma convención que el tarifario de proveedor). */
export function estadoDeTarifa(t: Vigencia, hoy: Date): Exclude<EstadoTarifaVenta, 'SIN_TARIFA'> {
  if (t.vigenciaDesde > hoy) return 'PROGRAMADA'
  if (t.vigenciaHasta !== null && t.vigenciaHasta < hoy) return 'VENCIDA'
  return 'VIGENTE'
}

/** Tarifa representativa de un conjunto de activas (mismo servicio y moneda):
 * la vigente; si no hay, la programada más próxima; si no, la vencida más
 * reciente. */
export function representativa<T extends Vigencia>(activas: T[], hoy: Date): (T & { estado: ReturnType<typeof estadoDeTarifa> }) | null {
  if (activas.length === 0) return null
  const conEstado = activas.map((t) => ({ ...t, estado: estadoDeTarifa(t, hoy) }))
  const vigente = conEstado.find((t) => t.estado === 'VIGENTE')
  if (vigente) return vigente
  const programadas = conEstado.filter((t) => t.estado === 'PROGRAMADA').sort((a, b) => a.vigenciaDesde.getTime() - b.vigenciaDesde.getTime())
  if (programadas[0]) return programadas[0]
  return conEstado.sort((a, b) => b.vigenciaDesde.getTime() - a.vigenciaDesde.getTime())[0]!
}

/** Estado del servicio en el listado: el "mejor" entre sus monedas. */
export function estadoDeServicio(estados: EstadoTarifaVenta[]): EstadoTarifaVenta {
  for (const e of ['VIGENTE', 'PROGRAMADA', 'VENCIDA'] as const) if (estados.includes(e)) return e
  return 'SIN_TARIFA'
}

// ─── Listado de servicios con su tarifa (RN-TVE-04) ─────────────────────────

export async function listarServiciosConTarifa(query: ServiciosConTarifaQuery) {
  const hoy = hoyComoFecha()
  const servicios = await repo.serviciosConTarifasActivas(query.q)

  const filas = servicios.map(({ tarifasVenta, ...servicio }) => {
    const porMoneda = (['USD', 'CLP'] as const)
      .map((moneda) => {
        const rep = representativa(
          tarifasVenta.filter((t) => t.moneda === moneda),
          hoy,
        )
        return rep && { id: rep.id, moneda, version: rep.version, vigenciaDesde: rep.vigenciaDesde, vigenciaHasta: rep.vigenciaHasta, estado: rep.estado }
      })
      .filter((t) => t != null)
    return { ...servicio, estado: estadoDeServicio(porMoneda.map((t) => t.estado)), tarifas: porMoneda }
  })

  const filtradas = query.estado ? filas.filter((f) => f.estado === query.estado) : filas
  const total = filtradas.length
  const data = filtradas.slice((query.page - 1) * query.limit, query.page * query.limit)
  return { data, meta: { total, page: query.page, limit: query.limit, totalPages: Math.max(1, Math.ceil(total / query.limit)) } }
}

// ─── CRUD ───────────────────────────────────────────────────────────────────

export async function listarTarifasDeServicio(servicioId: number) {
  const hoy = hoyComoFecha()
  const tarifas = await repo.findTarifasDeServicio(servicioId)
  return tarifas.map((t) => ({ ...t, estado: t.activo ? estadoDeTarifa(t, hoy) : null }))
}

export async function obtenerTarifaVenta(id: number) {
  const tarifa = await repo.findTarifaVentaById(id)
  if (!tarifa) throw noEncontrado('Tarifa de venta', id)
  return { ...tarifa, estado: tarifa.activo ? estadoDeTarifa(tarifa, hoyComoFecha()) : null }
}

type Tx = Parameters<typeof repo.tarifasActivasDe>[0]

/** RN-TVE-03 [BLOQUEA]: no hay dos tarifas activas del mismo servicio y moneda
 * con vigencias solapadas. */
async function rechazarSiSolapa(
  tx: Tx,
  servicioId: number,
  moneda: Moneda,
  vigenciaDesde: Date,
  vigenciaHasta: Date | undefined,
  excluirId?: number,
) {
  const activas = await repo.tarifasActivasDe(tx, servicioId, moneda)
  const choque = activas
    .filter((t) => t.id !== excluirId)
    .find((t) => seSolapanVigencias(vigenciaDesde, vigenciaHasta ?? null, t.vigenciaDesde, t.vigenciaHasta))
  if (choque) {
    throw conflicto(`Ya existe una tarifa de venta activa (v${choque.version}) en ${moneda} para este servicio con vigencia solapada (RN-TVE-03)`)
  }
}

export async function crearTarifaVenta(input: TarifaVentaCreateInput, usuario: string) {
  return prisma.$transaction(async (tx) => {
    const servicio = await tx.servicio.findFirst({ where: { id: input.servicioId, eliminadoEn: null } })
    if (!servicio) throw noEncontrado('Servicio', input.servicioId)

    // RN-TVE-02: mismo modelo que el servicio y tramos sin solape ni huecos.
    validarModeloYTramos(input.valores, servicio.modeloTarifa)

    await tomarLockPorTexto(tx, LOCK_TARIFA_VENTA_VIGENCIA, `${input.servicioId}:${input.moneda}`)
    await rechazarSiSolapa(tx, input.servicioId, input.moneda, input.vigenciaDesde, input.vigenciaHasta)

    return repo.createTarifaVentaTx(tx, input, usuario, 1)
  })
}

/** Lee la tarifa, toma el lock de su cadena y la relee: solo la activa admite
 * cambios (RN-TVE-05). */
async function tarifaActivaBloqueada(tx: Tx, id: number) {
  const actual = await tx.tarifaVenta.findFirst({ where: { id }, include: { servicio: { select: { modeloTarifa: true } } } })
  if (!actual) throw noEncontrado('Tarifa de venta', id)
  if (actual.eliminadoEn) throw conflicto('La tarifa de venta fue eliminada')
  await tomarLockPorTexto(tx, LOCK_TARIFA_VENTA_VIGENCIA, `${actual.servicioId}:${actual.moneda}`)
  const releida = await tx.tarifaVenta.findUniqueOrThrow({ where: { id } })
  if (!releida.activo) {
    throw conflicto('Solo se puede modificar la tarifa activa de la cadena; esta ya fue reemplazada por una versión posterior (RN-TVE-05)')
  }
  return actual
}

export async function crearNuevaVersion(id: number, input: TarifaVentaCambioInput, usuario: string) {
  return prisma.$transaction(async (tx) => {
    const anterior = await tarifaActivaBloqueada(tx, id)
    validarModeloYTramos(input.valores, anterior.servicio.modeloTarifa)

    // Desactivar ANTES de chequear solape: la nueva no choca con la que reemplaza.
    await repo.desactivarTarifaVenta(tx, id, usuario)
    await rechazarSiSolapa(tx, anterior.servicioId, anterior.moneda, input.vigenciaDesde, input.vigenciaHasta)

    const nueva = await repo.createTarifaVentaTx(
      tx,
      { servicioId: anterior.servicioId, moneda: anterior.moneda, ...input },
      usuario,
      anterior.version + 1,
    )
    return { ...nueva, versionAnteriorId: anterior.id }
  })
}

export async function editarTarifaVenta(id: number, input: TarifaVentaCambioInput, usuario: string) {
  return prisma.$transaction(async (tx) => {
    const actual = await tarifaActivaBloqueada(tx, id)
    validarModeloYTramos(input.valores, actual.servicio.modeloTarifa)
    await rechazarSiSolapa(tx, actual.servicioId, actual.moneda, input.vigenciaDesde, input.vigenciaHasta, id)
    return repo.actualizarTarifaVentaTx(tx, id, input, usuario)
  })
}

// ─── Resolución para la OT directa (RN-TVE-06) ──────────────────────────────

/** Tarifa de venta aplicable a un servicio en una fecha, en la misma forma que
 * `TarifarioVigente` para reutilizar el motor de costeo (`resolverCosto`
 * calcula igual un total de venta que uno de costo). Preferencia: la activa
 * que cubre la fecha en la moneda de la OT; luego la que la cubre en otra
 * moneda (se convierte con el TC de la OT); si ninguna cubre la fecha, la más
 * reciente —prefiriendo la moneda de la OT— con advertencia (como RN-TAR-05).
 * `null` si el servicio no tiene ninguna tarifa de venta activa. */
export async function resolverTarifaVentaVigente(servicioId: number, fecha: Date, monedaPreferida: Moneda): Promise<TarifarioVigente | null> {
  const activas = await repo.tarifasActivasConValores(servicioId)
  const conValores = activas.filter((t) => t.valores.length > 0)
  if (conValores.length === 0) return null

  const cubre = (t: (typeof conValores)[number]) => t.vigenciaDesde <= fecha && (t.vigenciaHasta === null || t.vigenciaHasta >= fecha)
  const porReciente = [...conValores].sort((a, b) => b.vigenciaDesde.getTime() - a.vigenciaDesde.getTime())
  const elegida =
    conValores.find((t) => cubre(t) && t.moneda === monedaPreferida) ??
    conValores.find(cubre) ??
    porReciente.find((t) => t.moneda === monedaPreferida) ??
    porReciente[0]!

  const base = {
    tarifarioId: elegida.id,
    moneda: elegida.moneda,
    advertenciaVigencia: !cubre(elegida),
  }
  const modelo = elegida.valores[0]!.modelo
  if (modelo === 'TRAMO_PAX') {
    const tramos: TramoValor[] = elegida.valores.map((v) => ({ paxDesde: v.paxDesde!, paxHasta: v.paxHasta ?? null, valor: v.valor }))
    return { ...base, modelo, tramos }
  }
  if (modelo === 'UNITARIO_PAX') return { ...base, modelo, valorUnitario: elegida.valores[0]!.valor.toString() }
  const valoresPorAcomodacion = Object.fromEntries(
    elegida.valores.filter((v) => v.acomodacion !== null).map((v) => [v.acomodacion as Acomodacion, v.valor.toString()]),
  ) as Partial<Record<Acomodacion, string>>
  if (Object.keys(valoresPorAcomodacion).length === 0) throw validacion('La tarifa de venta no tiene valores por acomodación')
  return { ...base, modelo, valoresPorAcomodacion }
}
