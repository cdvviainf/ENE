// RN-PRV-11 / RN-IMP-01 / RN-IMP-02: impuesto REFERENCIAL de una línea de costo,
// según el documento que emite el proveedor y la afectación del servicio.
//
// - FACTURA + servicio afecto  → el costo es NETO; IVA = costo × tasaIva y el
//   total a pagar al proveedor es neto + IVA.
// - BOLETA_HONORARIOS          → el costo es BRUTO; retención = costo × tasaRetencion
//   y el líquido a pagar al proveedor es bruto − retención.
// - FACTURA + servicio exento, NADA, o línea sin proveedor (OTRO) → sin impuesto.
//
// Es información interna: NO modifica costo, margen ni venta (el presupuesto no
// cambia) y nunca sale en el PDF al cliente. Se calcula al vuelo con las tasas
// vigentes de Indicadores y el maestro actual del proveedor/servicio — no se
// congela por versión (no es un monto de negocio, es una ayuda de lectura).
//
// Lógica pura: no importa Prisma. Toda aritmética con decimal.js (RN-DIN-01).
import { multiplicar, sumar, restar, aString, type Montoish } from '../../shared/dinero/index.js'

export type TipoEmisionProveedor = 'FACTURA' | 'BOLETA_HONORARIOS' | 'NADA'
export type TipoImpuesto = 'IVA' | 'RETENCION'

export interface TasasImpuesto {
  tasaIva: Montoish
  tasaRetencion: Montoish
}

export interface ImpuestoLinea {
  tipo: TipoImpuesto
  /** Fracción, ej. "0.1900". */
  tasa: string
  /** Monto del impuesto, en la moneda de la línea. */
  monto: string
  /** Lo que efectivamente se paga al proveedor: neto+IVA o bruto−retención. */
  totalProveedor: string
}

export interface TotalesImpuesto {
  iva: string
  retencion: string
}

export function impuestoReferencial(
  costo: Montoish,
  tipoEmision: TipoEmisionProveedor | null | undefined,
  afectoIva: boolean | null | undefined,
  tasas: TasasImpuesto,
): ImpuestoLinea | null {
  if (tipoEmision === 'FACTURA' && afectoIva === true) {
    const monto = multiplicar(costo, tasas.tasaIva)
    return {
      tipo: 'IVA',
      tasa: aString(tasas.tasaIva),
      monto: aString(monto),
      totalProveedor: aString(sumar(costo, monto)),
    }
  }
  if (tipoEmision === 'BOLETA_HONORARIOS') {
    const monto = multiplicar(costo, tasas.tasaRetencion)
    return {
      tipo: 'RETENCION',
      tasa: aString(tasas.tasaRetencion),
      monto: aString(monto),
      totalProveedor: aString(restar(costo, monto)),
    }
  }
  return null
}

interface LineaConMaestros {
  proveedor?: { tipoEmision?: TipoEmisionProveedor | null } | null
  servicio?: { afectoIva?: boolean | null } | null
}

/** Agrega `impuesto` a cada línea y devuelve los totales por tipo. `costoDe`
 * elige el campo de costo (CotizacionLinea.costoTotal / OrdenTrabajoLinea.costoTeorico). */
export function decorarLineasConImpuesto<L extends LineaConMaestros>(
  lineas: L[],
  costoDe: (l: L) => Montoish,
  tasas: TasasImpuesto,
): { lineas: (L & { impuesto: ImpuestoLinea | null })[]; impuestos: TotalesImpuesto } {
  const iva: Montoish[] = []
  const retencion: Montoish[] = []
  const decoradas = lineas.map((l) => {
    const impuesto = impuestoReferencial(costoDe(l), l.proveedor?.tipoEmision, l.servicio?.afectoIva, tasas)
    if (impuesto?.tipo === 'IVA') iva.push(impuesto.monto)
    if (impuesto?.tipo === 'RETENCION') retencion.push(impuesto.monto)
    return { ...l, impuesto }
  })
  return {
    lineas: decoradas,
    impuestos: { iva: aString(sumar('0', ...iva)), retencion: aString(sumar('0', ...retencion)) },
  }
}
