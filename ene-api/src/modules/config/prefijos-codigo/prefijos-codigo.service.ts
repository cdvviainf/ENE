import { noEncontrado } from '../../../shared/errors.js'
import * as repo from './prefijos-codigo.repository.js'
import type { PrefijoCodigoUpdateInput, EntidadSugerenciaViva } from './prefijos-codigo.schema.js'

// Mantenedor de solo lectura + edición: las 9 entidades están sembradas
// (prisma/seed.ts) porque cada una es estructural para su módulo. No hay
// alta/baja — crear una entidad nueva es una decisión de código (agregarla a
// ENTIDADES_PREFIJO), no de datos.
export async function listarPrefijos() {
  return repo.findAllPrefijos()
}

export async function obtenerPrefijo(id: number) {
  const prefijo = await repo.findPrefijoById(id)
  if (!prefijo) throw noEncontrado('Prefijo de código', id)
  return prefijo
}

export async function actualizarPrefijo(id: number, input: PrefijoCodigoUpdateInput, usuario: string) {
  await obtenerPrefijo(id)
  return repo.updatePrefijo(id, input, usuario)
}

export async function obtenerSiguienteCodigo(entidad: EntidadSugerenciaViva) {
  return { codigo: await repo.calcularSiguienteCodigo(entidad) }
}
