import { validacion } from '../../shared/errors.js'
import { aplicarMargen, dividir, margenDesdeVenta, monto, multiplicar, sumar, type Decimal } from '../../shared/dinero/index.js'
import { buscarTramoQueCubra } from '../tarifas/tarifas.service.js'
import type { LineaCosteo, LineaEstandar, TotalesCosteo, TramoValor } from './costeo.types.js'

// ============================================================================
// Motor de costeo — Docs/reglas-negocio.md §3 (RN-COS-01 a RN-COS-07).
// Lógica pura: no importa Prisma. costeo.repository.ts resuelve el tarifario
// vigente y arma las estructuras de este módulo; acá solo se calcula.
//
// Es el corazón del sistema y el mayor riesgo económico del proyecto — ver
// Docs/plan-implementacion.md, Etapa 6. RN-COS-01 [BLOQUEA]: el margen es un
// markup sobre el costo (venta = costo × (1 + margen)), nunca margen sobre
// venta. Costo 3.000.000 con margen 0,50 → venta 4.500.000, no 6.000.000.
// ============================================================================

/** RN-TAR-03: sin tramo que cubra `pax`, la línea no se puede valorizar por
 * tarifario — el llamador debe pedirla como OTRO. */
function tramoOFalla(tramos: TramoValor[], pax: number): TramoValor {
  const tramo = buscarTramoQueCubra(tramos, pax)
  if (!tramo) throw validacion(`Ningún tramo cubre ${pax} pasajeros (RN-TAR-03); cargue la línea como OTRO`)
  return tramo
}

/** Resuelve el costo de una línea ESTANDAR según su modelo de tarifa.
 * - TRAMO_PAX: el valor del tramo cubre el servicio completo, no se
 *   multiplica por pax.
 * - ACOMODACION: el valor es por habitación; una línea es una habitación
 *   (decisión de usuario, Etapa 6), tampoco se multiplica.
 * - UNITARIO_PAX: se multiplica por la cantidad de pasajeros. */
export function resolverCosto(linea: LineaEstandar): Decimal {
  switch (linea.modelo) {
    case 'TRAMO_PAX':
      return monto(tramoOFalla(linea.tramos, linea.cantidadPax).valor)
    case 'ACOMODACION':
      return monto(linea.valorHabitacion)
    case 'UNITARIO_PAX':
      return multiplicar(linea.valorUnitario, String(linea.cantidadPax))
  }
}

function costoDeLinea(linea: LineaCosteo): Decimal {
  return linea.tipoLinea === 'OTRO' ? monto(linea.costoTotal) : resolverCosto(linea)
}

/** RN-COS-01/02/04: aplica el margen guardado en cada línea (markup sobre su
 * costo) y totaliza. El valor de venta de la operación es la suma de las
 * líneas valorizadas, nunca el costo total por un margen global. El margen
 * total se DERIVA (venta/costo − 1); no es un dato que se guarde aparte. */
export function valorizar(lineas: LineaCosteo[]): TotalesCosteo {
  const costos = lineas.map((l) => costoDeLinea(l))
  const costoTotal = sumar(...costos)
  const ventaTotal = sumar(...lineas.map((l, i) => aplicarMargen(costos[i]!, l.margenPct)))
  const margenTotal = costoTotal.isZero() ? monto('0') : margenDesdeVenta(costoTotal, ventaTotal)
  return { costoTotal, margenTotal, ventaTotal }
}

/** RN-COS-07: cambiar la cantidad de pasajeros recalcula costo y venta de
 * todas las líneas ESTANDAR de la versión en edición — con tarifas por tramo
 * el costo salta de forma escalonada, no proporcional. Las líneas OTRO no se
 * tocan (RN-COS-05): su valor es digitado y no depende del tarifario. El
 * margenPct de cada línea se conserva (RN-COS-02: el margen es de la línea,
 * no se recalcula solo). */
export function recalcularPorPax(lineas: LineaCosteo[], nuevoPax: number): LineaCosteo[] {
  return lineas.map((linea) => {
    if (linea.tipoLinea === 'OTRO') return linea

    const actualizada = { ...linea, cantidadPax: nuevoPax }
    const costoTotal = resolverCosto(actualizada)
    return {
      ...actualizada,
      costoTotal,
      costoUnitario: dividir(costoTotal, String(nuevoPax)),
      ventaTotal: aplicarMargen(costoTotal, linea.margenPct),
    }
  })
}
