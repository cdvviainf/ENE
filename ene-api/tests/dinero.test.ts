import { describe, it, expect } from 'vitest'
import {
  aplicarMargen,
  sumar,
  restar,
  multiplicar,
  dividir,
  aClp,
  desdeClp,
  repartir,
  margenDesdeVenta,
  monto,
  aString,
} from '../src/shared/dinero/index.js'

describe('dinero — margen sobre costo (markup)', () => {
  it('aplica 50% sobre el costo', () => {
    expect(aplicarMargen('3000000', '0.5').toString()).toBe('4500000')
  })

  it('reproduce el ejemplo canónico de la propuesta', () => {
    const lineas = [
      { costo: '780000', margen: '0.50' },
      { costo: '640000', margen: '0.60' },
      { costo: '840000', margen: '0.40' },
      { costo: '320000', margen: '0.60' },
      { costo: '360000', margen: '0.50' },
      { costo: '60000',  margen: '0.30' },
    ]
    const costoTotal = sumar(...lineas.map((l) => l.costo))
    const ventaTotal = sumar(...lineas.map((l) => aplicarMargen(l.costo, l.margen)))
    expect(costoTotal.toString()).toBe('3000000')
    expect(ventaTotal.toString()).toBe('4500000')
    expect(margenDesdeVenta(costoTotal, ventaTotal).toString()).toBe('0.5')
  })
})

describe('dinero — conversión a CLP', () => {
  it('usa el tipo de cambio del movimiento, no uno recalculado', () => {
    // USD 4.500 cobrados a TC 950 → 4.275.000, no 4.500.000
    expect(aClp('4500', '950').toString()).toBe('4275000')
  })
})

describe('dinero — reparto sin pérdida de centavos', () => {
  it('la última parte absorbe el residuo', () => {
    const partes = repartir('100', 3)
    expect(sumar(...partes).toString()).toBe('100')
  })
})

describe('dinero — serialización', () => {
  it('siempre string con 4 decimales', () => {
    expect(aString('1234.5')).toBe('1234.5000')
  })

  it('rellena decimales para montos enteros y fracciones cortas', () => {
    // RN-DIN-01: el monto entra como string, nunca como number.
    expect(aString('1000')).toBe('1000.0000')
    expect(aString('0.1')).toBe('0.1000')
  })
})

describe('dinero — RN-DIN-01: precisión sin float', () => {
  it('no arrastra el error binario de coma flotante', () => {
    // En number puro, 0.1 + 0.2 === 0.30000000000000004.
    expect(sumar('0.1', '0.2').toString()).toBe('0.3')
  })
})

describe('dinero — RN-DIN-03: redondeo ROUND_HALF_UP a 4 decimales', () => {
  it('redondea hacia arriba el 5 en la quinta posición', () => {
    expect(monto('1.23455').toString()).toBe('1.2346')
    expect(aString('0.00005')).toBe('0.0001')
  })

  it('aplica el redondeo al resultado de una multiplicación', () => {
    // 1.00005 × 1 → 1.0001 (medio hacia arriba), no 1.0000.
    expect(multiplicar('1.00005', '1').toString()).toBe('1.0001')
  })
})

describe('dinero — RN-DIN-04: reparto, la última parte absorbe el residuo', () => {
  it('distribuye 100 en 3 partes con el residuo en la última', () => {
    const partes = repartir('100', 3)
    expect(partes.map((p) => p.toString())).toEqual(['33.3333', '33.3333', '33.3334'])
    expect(sumar(...partes).toString()).toBe('100')
  })

  it('exige al menos una parte', () => {
    expect(() => repartir('100', 0)).toThrow()
  })
})

describe('dinero — operaciones seguras', () => {
  it('resta y multiplica con precisión de 4 decimales', () => {
    expect(restar('100.5', '0.25').toString()).toBe('100.25')
    expect(multiplicar('95000', '0.5').toString()).toBe('47500')
  })

  it('rechaza la división por cero', () => {
    expect(() => dividir('10', '0')).toThrow()
  })

  it('rechaza derivar margen con costo cero', () => {
    expect(() => margenDesdeVenta('0', '100')).toThrow()
  })
})

describe('dinero — RN-MON-02: conversión de moneda ida y vuelta', () => {
  it('desdeClp revierte aClp con el mismo tipo de cambio (que no se recalcula)', () => {
    expect(desdeClp(aClp('100', '950'), '950').toString()).toBe('100')
  })
})
