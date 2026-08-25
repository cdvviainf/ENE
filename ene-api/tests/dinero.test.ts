import { describe, it, expect } from 'vitest'
import { aplicarMargen, sumar, aClp, repartir, margenDesdeVenta, aString } from '../src/shared/dinero/index.js'

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
})
