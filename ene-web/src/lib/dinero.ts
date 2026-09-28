// Formateo de montos desde su string decimal, sin convertir a `number` de JS
// (RN-DIN-01 [BLOQUEA]). El backend entrega Decimal(18,4) serializado como
// string; convertirlo a number podría perder precisión en magnitudes grandes o
// con decimales significativos. El redondeo y el agrupado operan sobre la
// cadena.

export type Moneda = 'CLP' | 'USD';

function incrementarDigitos(s: string): string {
  const arr = s.split('');
  let i = arr.length - 1;
  while (i >= 0) {
    if (arr[i] === '9') {
      arr[i] = '0';
      i--;
    } else {
      arr[i] = String.fromCharCode(arr[i]!.charCodeAt(0) + 1);
      break;
    }
  }
  if (i < 0) arr.unshift('1');
  return arr.join('');
}

/** Redondea un string decimal (sin signo) a `decimales` posiciones, half-up,
 * devolviendo entero y fracción como strings —sin usar number—. */
function redondear(sinSigno: string, decimales: number): { entero: string; frac: string } {
  const [intRaw = '0', fracRaw = ''] = sinSigno.split('.');
  const intPart = intRaw.replace(/^0+(?=\d)/, '') || '0';

  if (fracRaw.length <= decimales) {
    return { entero: intPart, frac: fracRaw.padEnd(decimales, '0') };
  }

  const keep = fracRaw.slice(0, decimales);
  const siguiente = fracRaw.charCodeAt(decimales) - 48; // '0' = 48
  let digitos = intPart + keep;
  if (siguiente >= 5) digitos = incrementarDigitos(digitos);

  const total = digitos.padStart(decimales + 1, '0');
  const corte = total.length - decimales;
  const entero = total.slice(0, corte).replace(/^0+(?=\d)/, '') || '0';
  const frac = decimales > 0 ? total.slice(corte) : '';
  return { entero, frac };
}

function agruparMiles(entero: string): string {
  return entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Formatea un monto en la moneda dada: USD con 2 decimales, CLP sin decimales
 * (RN-MON-01). Devuelve "—" si el valor no es un decimal válido. */
export function formatMonto(valor: string | null | undefined, moneda: Moneda): string {
  if (valor == null || !/^-?\d+(\.\d+)?$/.test(valor)) return '—';
  const decimales = moneda === 'USD' ? 2 : 0;
  const negativo = valor.startsWith('-');
  const { entero, frac } = redondear(negativo ? valor.slice(1) : valor, decimales);
  const cuerpo = decimales > 0 ? `${agruparMiles(entero)},${frac}` : agruparMiles(entero);
  const esCero = entero === '0' && /^0*$/.test(frac);
  const signo = negativo && !esCero ? '-' : '';
  const prefijo = moneda === 'USD' ? 'US$ ' : '$ ';
  return `${prefijo}${signo}${cuerpo}`;
}
