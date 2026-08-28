import { noEncontrado, conflicto } from '../../../shared/errors.js'
import { operacionesAbiertas, hayOperacionesAbiertas, errorSoftDeleteBloqueado } from '../../../shared/operaciones-abiertas.js'
import * as repo from './zonas.repository.js'
import type { ZonaCreateInput, ZonaUpdateInput } from './zonas.schema.js'

export async function listarZonas(page: number, limit: number, q?: string) {
  const { data, total } = await repo.findAllZonas(page, limit, q)
  return { data, meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } }
}

export async function obtenerZona(id: number) {
  const zona = await repo.findZonaById(id)
  if (!zona) throw noEncontrado('Zona', id)
  return zona
}

// RN-MAN-05: se puede consultar una zona eliminada, pero no volver a mutarla.
async function obtenerZonaVigente(id: number) {
  const zona = await obtenerZona(id)
  if (zona.eliminadoEn) throw conflicto('La zona fue eliminada y no admite cambios')
  return zona
}

export async function crearZona(input: ZonaCreateInput, creadoPor: string) {
  if (await repo.findZonaByCodigo(input.codigo)) {
    throw conflicto(`Ya existe una zona con el código "${input.codigo}"`)
  }
  return repo.createZona(input, creadoPor)
}

export async function actualizarZona(id: number, input: ZonaUpdateInput, actualizadoPor: string) {
  await obtenerZonaVigente(id)
  if (input.codigo && (await repo.findZonaByCodigo(input.codigo, id))) {
    throw conflicto(`Ya existe una zona con el código "${input.codigo}"`)
  }
  return repo.updateZona(id, input, actualizadoPor)
}

export async function eliminarZona(id: number, eliminadoPor: string) {
  await obtenerZonaVigente(id)
  // RN-MAN-04: no se elimina si participa en una operación no cerrada.
  const referencias = await operacionesAbiertas({ zonaId: id })
  if (hayOperacionesAbiertas(referencias)) throw errorSoftDeleteBloqueado('la zona', referencias)
  await repo.softDeleteZona(id, eliminadoPor)
}
