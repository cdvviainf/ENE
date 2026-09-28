import type { IdiomaDocumento } from '../documentos.types.js'
import { Decimal } from '../../../shared/dinero/index.js'

// Único lugar donde se formatea para impresión (CLAUDE.md §8, portado de FAS:
// "prohibido formatear a mano dentro de una plantilla"). Los montos llegan como
// string decimal desde el payload (RN-DIN-01) y NUNCA se convierten a `number`
// de JS: el redondeo se hace con Decimal (que devuelve string) y el agrupado de
// miles opera sobre esa cadena.

function agruparMiles(entero: string): string {
  return entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/** Formatea un monto desde su string decimal, en la moneda de la cotización:
 * USD con 2 decimales, CLP sin decimales (RN-MON-01). Sin `Number()`. */
function monto(valor: number | string, moneda: 'CLP' | 'USD'): string {
  const decimales = moneda === 'USD' ? 2 : 0
  let fixed: string
  try {
    fixed = new Decimal(valor).toFixed(decimales) // string; ROUND_HALF_UP (dinero)
  } catch {
    return '—'
  }
  const negativo = fixed.startsWith('-')
  const partes = (negativo ? fixed.slice(1) : fixed).split('.')
  const entero = partes[0] ?? '0'
  const frac = partes[1] ?? ''
  const cuerpo = decimales > 0 ? `${agruparMiles(entero)},${frac}` : agruparMiles(entero)
  const prefijo = moneda === 'USD' ? 'US$ ' : '$ '
  return `${prefijo}${negativo ? '-' : ''}${cuerpo}`
}

export const fmt = {
  monto,
  /** Fecha pura (sin hora significativa): se parsea la parte YYYY-MM-DD como
   * hora local para evitar el corrimiento de un día por huso horario. */
  fecha: (iso: string, idioma: IdiomaDocumento) =>
    new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString(idioma === 'en' ? 'en-GB' : 'es-CL'),
}
