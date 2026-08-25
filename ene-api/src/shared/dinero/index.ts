import { Decimal } from 'decimal.js'

// ============================================================================
// Dinero — CLAUDE.md §7, la regla más importante del proyecto.
//
// Ningún monto se convierte nunca a `number` de JavaScript. Prisma entrega
// Decimal, la aritmética pasa por acá y la API responde string.
// PROHIBIDO parseFloat sobre montos.
//
// Hay margen por línea, dos monedas y tipo de cambio en dos momentos
// distintos: un redondeo mal puesto se nota en el cierre.
// ============================================================================

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP })

export type Montoish = Decimal | string | number

const d = (v: Montoish): Decimal => new Decimal(v as never)

/// 4 decimales — misma precisión que la columna Decimal(18,4).
export const DECIMALES_MONTO = 4

export const monto = (v: Montoish): Decimal => d(v).toDecimalPlaces(DECIMALES_MONTO)

export const sumar = (...vs: Montoish[]): Decimal =>
  monto(vs.reduce<Decimal>((acc, v) => acc.plus(d(v)), new Decimal(0)))

export const restar = (a: Montoish, b: Montoish): Decimal => monto(d(a).minus(d(b)))

export const multiplicar = (a: Montoish, b: Montoish): Decimal => monto(d(a).times(d(b)))

export const dividir = (a: Montoish, b: Montoish): Decimal => {
  const divisor = d(b)
  if (divisor.isZero()) throw new Error('División por cero en cálculo de montos')
  return monto(d(a).dividedBy(divisor))
}

/// El margen es un porcentaje SOBRE EL COSTO (markup), no sobre la venta:
///   venta = costo × (1 + margen)
/// Costo 3.000.000 con margen 0.5 → venta 4.500.000.
export const aplicarMargen = (costo: Montoish, margenPct: Montoish): Decimal =>
  monto(d(costo).times(new Decimal(1).plus(d(margenPct))))

/// Margen efectivo sobre el costo a partir de costo y venta.
export const margenDesdeVenta = (costo: Montoish, venta: Montoish): Decimal => {
  const c = d(costo)
  if (c.isZero()) throw new Error('No se puede derivar margen con costo cero')
  return d(venta).dividedBy(c).minus(1).toDecimalPlaces(4)
}

/// Convierte a la moneda de gestión (CLP) con el tipo de cambio dado.
/// El TC no se recalcula nunca: se usa el que quedó guardado en el movimiento.
export const aClp = (montoOrigen: Montoish, tipoCambio: Montoish): Decimal =>
  monto(d(montoOrigen).times(d(tipoCambio)))

/// Deriva el precio en moneda extranjera desde un monto en CLP.
export const desdeClp = (montoClp: Montoish, tipoCambio: Montoish): Decimal =>
  dividir(montoClp, tipoCambio)

/// Reparte un total entre n partes sin perder ni ganar centavos: la última
/// parte absorbe el residuo del redondeo.
export const repartir = (total: Montoish, partes: number): Decimal[] => {
  if (partes < 1) throw new Error('El número de partes debe ser al menos 1')
  const t = monto(total)
  const base = t.dividedBy(partes).toDecimalPlaces(DECIMALES_MONTO, Decimal.ROUND_DOWN)
  const salida = Array.from({ length: partes }, () => base)
  const residuo = t.minus(base.times(partes))
  salida[partes - 1] = monto(base.plus(residuo))
  return salida
}

/// Serialización para la API: siempre string, nunca float.
export const aString = (v: Montoish): string => monto(v).toFixed(DECIMALES_MONTO)

export { Decimal }
