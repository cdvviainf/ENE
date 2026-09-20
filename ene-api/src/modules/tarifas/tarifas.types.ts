/** Aviso no bloqueante (RN-TAR-04, RN-TAR-05): informa, nunca impide guardar. */
export interface Advertencia {
  regla: string
  mensaje: string
  detalle?: Record<string, unknown>
}

/** Forma mínima que necesita `buscarTramoQueCubra` — cualquier fila con estos
 * dos campos sirve, no solo `TarifarioValor` de Prisma. */
export interface TramoCobertura {
  paxDesde: number
  paxHasta: number | null
}
