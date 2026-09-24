import type { Acomodacion, Moneda } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { advierteVigenciaVencida } from '../tarifas/tarifas.service.js'
import type { TramoValor } from './costeo.types.js'

/** RN-TAR-07: puede haber más de una cadena activa del mismo proveedor+
 * servicio si sus vigencias no se solapan (temporadas distintas negociadas
 * aparte) — por eso se buscan todas las activas y se elige según la fecha. */
async function tarifariosActivosDe(proveedorId: number, servicioId: number) {
  return prisma.tarifario.findMany({
    where: { proveedorId, servicioId, activo: true, eliminadoEn: null },
    include: { valores: true },
  })
}

export type TarifarioVigente =
  | { tarifarioId: number; moneda: Moneda; modelo: 'TRAMO_PAX'; tramos: TramoValor[]; advertenciaVigencia: boolean }
  | { tarifarioId: number; moneda: Moneda; modelo: 'UNITARIO_PAX'; valorUnitario: string; advertenciaVigencia: boolean }
  | {
      tarifarioId: number
      moneda: Moneda
      modelo: 'ACOMODACION'
      valoresPorAcomodacion: Partial<Record<Acomodacion, string>>
      advertenciaVigencia: boolean
    }

/** RN-TAR-05 [ADVIERTE]: si ningún tarifario activo cubre la fecha de
 * operación, se usa el más reciente y se advierte — nunca bloquea, la
 * decisión queda en el usuario. `null` si el proveedor+servicio no tiene
 * ningún tarifario activo: la línea debe cargarse como OTRO (RN-COS-05). */
export async function resolverTarifarioVigente(
  proveedorId: number,
  servicioId: number,
  fechaOperacion: Date,
): Promise<TarifarioVigente | null> {
  const activos = await tarifariosActivosDe(proveedorId, servicioId)
  if (activos.length === 0) return null

  const cubreFecha = (t: (typeof activos)[number]) =>
    t.vigenciaDesde <= fechaOperacion && (t.vigenciaHasta === null || t.vigenciaHasta >= fechaOperacion)

  const masReciente = [...activos].sort((a, b) => b.vigenciaDesde.getTime() - a.vigenciaDesde.getTime())[0]!
  const elegido = activos.find(cubreFecha) ?? masReciente

  const base = {
    tarifarioId: elegido.id,
    moneda: elegido.moneda,
    advertenciaVigencia: advierteVigenciaVencida(elegido.vigenciaHasta, fechaOperacion),
  }
  const modelo = elegido.valores[0]!.modelo

  if (modelo === 'TRAMO_PAX') {
    const tramos: TramoValor[] = elegido.valores.map((v) => ({ paxDesde: v.paxDesde!, paxHasta: v.paxHasta ?? null, valor: v.valor }))
    return { ...base, modelo, tramos }
  }
  if (modelo === 'UNITARIO_PAX') {
    return { ...base, modelo, valorUnitario: elegido.valores[0]!.valor.toString() }
  }
  const valoresPorAcomodacion = Object.fromEntries(
    elegido.valores.filter((v) => v.acomodacion !== null).map((v) => [v.acomodacion as Acomodacion, v.valor.toString()]),
  ) as Partial<Record<Acomodacion, string>>
  return { ...base, modelo, valoresPorAcomodacion }
}
