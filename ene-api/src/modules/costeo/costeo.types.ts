import type { Acomodacion } from '@prisma/client'
import type { Montoish } from '../../shared/dinero/index.js'
import type { TramoCobertura } from '../tarifas/tarifas.types.js'

/** Tramo con su valor, ya cargado desde el tarifario vigente — lo mínimo que
 * necesita `resolverCosto`/`recalcularPorPax` para TRAMO_PAX. RN-COS-06: el
 * costoTeorico de una línea existente nunca se recalcula desde el maestro;
 * esto solo se usa al crear la línea o al recalcular explícitamente por
 * cambio de pax (RN-COS-07), nunca de forma automática en segundo plano. */
export interface TramoValor extends TramoCobertura {
  valor: Montoish
}

interface LineaCosteoBase {
  cantidadPax: number
  margenPct: Montoish
  costoUnitario: Montoish
  costoTotal: Montoish
  ventaTotal: Montoish
}

/** RN-COS-05: una línea OTRO no referencia tarifario ni servicio del
 * catálogo; su costo es digitado a mano y el motor nunca la recalcula. */
export interface LineaOtro extends LineaCosteoBase {
  tipoLinea: 'OTRO'
}

export interface LineaTramoPax extends LineaCosteoBase {
  tipoLinea: 'ESTANDAR'
  modelo: 'TRAMO_PAX'
  tramos: TramoValor[]
}

export interface LineaUnitarioPax extends LineaCosteoBase {
  tipoLinea: 'ESTANDAR'
  modelo: 'UNITARIO_PAX'
  valorUnitario: Montoish
}

/** Decisión de usuario (Etapa 6, 23-sep-2026): una línea ACOMODACION es una
 * habitación. El valor del tarifario no se multiplica por `cantidadPax` —
 * varias habitaciones se cargan como varias líneas y se suman (RN-COS-04). */
export interface LineaAcomodacion extends LineaCosteoBase {
  tipoLinea: 'ESTANDAR'
  modelo: 'ACOMODACION'
  acomodacion: Acomodacion
  valorHabitacion: Montoish
}

export type LineaEstandar = LineaTramoPax | LineaUnitarioPax | LineaAcomodacion
export type LineaCosteo = LineaOtro | LineaEstandar

export interface TotalesCosteo {
  costoTotal: Montoish
  margenTotal: Montoish
  ventaTotal: Montoish
}
