import { describe, it, expect } from 'vitest'
import { resolverCosto, valorizar, recalcularPorPax } from '../src/modules/costeo/costeo.service.js'
import { desdeClp } from '../src/shared/dinero/index.js'
import type { LineaAcomodacion, LineaCosteo, LineaOtro, LineaTramoPax, LineaUnitarioPax } from '../src/modules/costeo/costeo.types.js'

// ============================================================================
// Motor de costeo — Docs/plan-implementacion.md, Etapa 6. Los seis casos de
// esta suite son los "números exactos" que cierran la etapa (RN-COS-01 a
// RN-COS-07). costeo.service.ts no importa Prisma: estos tests corren sin
// base de datos.
// ============================================================================

function lineaOtro(costoTotal: string, margenPct: string, cantidadPax = 1): LineaOtro {
  return { tipoLinea: 'OTRO', cantidadPax, margenPct, costoUnitario: costoTotal, costoTotal, ventaTotal: costoTotal }
}

describe('RN-COS-01 [BLOQUEA]: el margen es markup sobre el costo, no sobre la venta', () => {
  it('costo 3.000.000 con margen 0,50 → venta 4.500.000', () => {
    const lineas: LineaCosteo[] = [lineaOtro('3000000', '0.5')]
    const { costoTotal, ventaTotal } = valorizar(lineas)
    expect(costoTotal.toString()).toBe('3000000')
    expect(ventaTotal.toString()).toBe('4500000')
  })
})

describe('RN-COS-04: la venta es la suma de las líneas valorizadas, el margen total se deriva', () => {
  it('las seis líneas del caso canónico dan costo 3.000.000, venta 4.500.000, margen 0,50', () => {
    const lineas: LineaCosteo[] = [
      lineaOtro('780000', '0.50'),
      lineaOtro('640000', '0.60'),
      lineaOtro('840000', '0.40'),
      lineaOtro('320000', '0.60'),
      lineaOtro('360000', '0.50'),
      lineaOtro('60000', '0.30'),
    ]
    const { costoTotal, margenTotal, ventaTotal } = valorizar(lineas)
    expect(costoTotal.toString()).toBe('3000000')
    expect(ventaTotal.toString()).toBe('4500000')
    expect(margenTotal.toString()).toBe('0.5')
  })
})

describe('RN-COS-07: cambiar la cantidad de pasajeros recalcula la línea TRAMO_PAX', () => {
  it('traslado por tramo, de 2 a 3 pax, sube de 95.000 a 130.000 (salto escalonado, no proporcional)', () => {
    const tramos = [
      { paxDesde: 1, paxHasta: 2, valor: '95000' },
      { paxDesde: 3, paxHasta: 5, valor: '130000' },
      { paxDesde: 6, paxHasta: null, valor: '185000' },
    ]
    const linea: LineaTramoPax = {
      tipoLinea: 'ESTANDAR',
      modelo: 'TRAMO_PAX',
      tramos,
      cantidadPax: 2,
      margenPct: '0',
      costoUnitario: '47500',
      costoTotal: '95000',
      ventaTotal: '95000',
    }
    expect(resolverCosto(linea).toString()).toBe('95000')
    expect(linea.costoUnitario).toBe('47500')

    const [recalculada] = recalcularPorPax([linea], 3) as [LineaTramoPax]
    expect(recalculada.costoTotal.toString()).toBe('130000')
    // 130.000 / 3 pax = 43.333,3333 — baja de 47.500 por pasajero aunque los
    // pasajeros suban un 50% (RN-COS-07).
    expect(recalculada.costoUnitario.toString()).toBe('43333.3333')
  })

  it('sin ningún tramo que cubra la nueva cantidad de pasajeros, rechaza (RN-TAR-03)', () => {
    const linea: LineaTramoPax = {
      tipoLinea: 'ESTANDAR',
      modelo: 'TRAMO_PAX',
      tramos: [{ paxDesde: 1, paxHasta: 5, valor: '130000' }],
      cantidadPax: 2,
      margenPct: '0',
      costoUnitario: '65000',
      costoTotal: '130000',
      ventaTotal: '130000',
    }
    expect(() => recalcularPorPax([linea], 6)).toThrow(/RN-TAR-03/)
  })
})

describe('ACOMODACION: una línea es una habitación, el valor no se multiplica por pax', () => {
  it('2 pax en habitación doble cuesta 140.000, no 280.000', () => {
    const linea: LineaAcomodacion = {
      tipoLinea: 'ESTANDAR',
      modelo: 'ACOMODACION',
      acomodacion: 'DOBLE',
      valorHabitacion: '140000',
      cantidadPax: 2,
      margenPct: '0',
      costoUnitario: '70000',
      costoTotal: '140000',
      ventaTotal: '140000',
    }
    expect(resolverCosto(linea).toString()).toBe('140000')
  })

  it('2 pax en habitaciones separadas son dos líneas SINGLE que suman 200.000 (= 140.000 + 60.000 de suplemento)', () => {
    const single: LineaAcomodacion = {
      tipoLinea: 'ESTANDAR',
      modelo: 'ACOMODACION',
      acomodacion: 'SINGLE',
      valorHabitacion: '100000',
      cantidadPax: 1,
      margenPct: '0',
      costoUnitario: '100000',
      costoTotal: '100000',
      ventaTotal: '100000',
    }
    const { costoTotal } = valorizar([single, { ...single }])
    expect(costoTotal.toString()).toBe('200000')
  })
})

describe('RN-COS-05: una línea OTRO no consulta tarifario, usa el valor digitado', () => {
  it('se valoriza con su propio costo y margen, sin pasar por resolverCosto', () => {
    const linea = lineaOtro('60000', '0.30')
    const { costoTotal, ventaTotal } = valorizar([linea])
    expect(costoTotal.toString()).toBe('60000')
    expect(ventaTotal.toString()).toBe('78000')
  })

  it('recalcularPorPax no toca las líneas OTRO', () => {
    const linea = lineaOtro('60000', '0.30', 2)
    const [recalculada] = recalcularPorPax([linea], 10)
    expect(recalculada).toBe(linea)
  })
})

describe('RN-MON-02: toda la gestión se expresa en CLP con el TC del movimiento', () => {
  it('convierte 4.500.000 CLP a USD 4.500 a un TC de referencia 1.000', () => {
    expect(desdeClp('4500000', '1000').toString()).toBe('4500')
  })
})

describe('UNITARIO_PAX: el valor se multiplica por la cantidad de pasajeros', () => {
  it('4 entradas a 15.000 cuestan 60.000', () => {
    const linea: LineaUnitarioPax = {
      tipoLinea: 'ESTANDAR',
      modelo: 'UNITARIO_PAX',
      valorUnitario: '15000',
      cantidadPax: 4,
      margenPct: '0',
      costoUnitario: '15000',
      costoTotal: '60000',
      ventaTotal: '60000',
    }
    expect(resolverCosto(linea).toString()).toBe('60000')
  })
})
