import * as repo from './indicadores.repository.js'
import type { IndicadoresUpdateInput } from './indicadores.schema.js'

export async function obtenerIndicadores(actor = 'system') {
  return repo.ensureIndicadores(actor)
}

export async function actualizarIndicadores(input: IndicadoresUpdateInput, actualizadoPor: string) {
  const ind = await repo.ensureIndicadores(actualizadoPor)
  return repo.updateIndicadores(ind.id, input, actualizadoPor)
}
