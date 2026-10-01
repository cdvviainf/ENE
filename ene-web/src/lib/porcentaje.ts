// Conversión entre el margen almacenado como FRACCIÓN ('0.50') y su
// representación en PORCENTAJE para la UI ('50'). RN-COS-02: el margen se
// persiste como fracción; mostrarlo como % es solo presentación. La conversión
// desplaza el punto decimal por manipulación de strings —no multiplica/divide
// como number— para no introducir artefactos de float (p. ej. 0.07 × 100 =
// 6.999999999999999).

const DECIMAL_RE = /^-?\d*(\.\d+)?$/;

function normalizar(entero: string, frac: string, neg: boolean): string {
  const e = entero.replace(/^0+(?=\d)/, '') || '0';
  const f = frac.replace(/0+$/, '');
  const cuerpo = f ? `${e}.${f}` : e;
  return neg && cuerpo !== '0' ? `-${cuerpo}` : cuerpo;
}

/** Fracción → porcentaje: '0.50' → '50', '0.075' → '7.5', '1' → '100'. Cadena
 * vacía o no numérica → ''. */
export function fraccionAPorcentaje(frac: string): string {
  const v = frac.trim();
  if (v === '' || !DECIMAL_RE.test(v)) return '';
  const neg = v.startsWith('-');
  const sinSigno = neg ? v.slice(1) : v;
  const [intRaw = '0', fracRaw = ''] = sinSigno.split('.');
  const fracPad = fracRaw.padEnd(2, '0');
  const entero = intRaw + fracPad.slice(0, 2);
  return normalizar(entero, fracPad.slice(2), neg);
}

/** Porcentaje → fracción: '50' → '0.5', '7.5' → '0.075', '100' → '1'. Cadena
 * vacía o no numérica → ''. */
export function porcentajeAFraccion(pct: string): string {
  const v = pct.trim();
  if (v === '' || !DECIMAL_RE.test(v)) return '';
  const neg = v.startsWith('-');
  const sinSigno = neg ? v.slice(1) : v;
  const [intRaw = '0', fracRaw = ''] = sinSigno.split('.');
  const intPad = intRaw.padStart(2, '0');
  const nuevaFrac = intPad.slice(-2) + fracRaw;
  return normalizar(intPad.slice(0, -2), nuevaFrac, neg);
}

/** Recorta ceros finales decimales de un string de monto para mostrarlo en un
 * input editable ('1170000.0000' → '1170000', '999.9990' → '999.999'). No es
 * para formateo de presentación (ese es formatMonto); es para prellenar un
 * campo numérico editable sin arrastrar los 4 decimales del backend. */
export function recortarDecimales(valor: string): string {
  if (!/^-?\d+(\.\d+)?$/.test(valor)) return valor;
  if (!valor.includes('.')) return valor;
  return valor.replace(/0+$/, '').replace(/\.$/, '');
}
