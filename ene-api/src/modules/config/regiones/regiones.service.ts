import { noEncontrado, conflicto } from '../../../shared/errors.js'
import * as repo from './regiones.repository.js'
import type { RegionCreateInput, RegionUpdateInput } from './regiones.schema.js'

export async function listarRegiones(page: number, limit: number, q?: string) {
  const { data, total } = await repo.findAllRegiones(page, limit, q)
  return { data, meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } }
}

export async function obtenerRegion(id: number) {
  const region = await repo.findRegionById(id)
  if (!region) throw noEncontrado('Región', id)
  return region
}

async function obtenerRegionVigente(id: number) {
  const region = await obtenerRegion(id)
  if (region.eliminadoEn) throw conflicto('La región fue eliminada y no admite cambios')
  return region
}

export async function crearRegion(input: RegionCreateInput, creadoPor: string) {
  if (await repo.findRegionByCodigo(input.codigo)) {
    throw conflicto(`Ya existe una región con el código "${input.codigo}"`)
  }
  return repo.createRegion(input, creadoPor)
}

export async function actualizarRegion(id: number, input: RegionUpdateInput, actualizadoPor: string) {
  await obtenerRegionVigente(id)
  if (input.codigo && (await repo.findRegionByCodigo(input.codigo, id))) {
    throw conflicto(`Ya existe una región con el código "${input.codigo}"`)
  }
  return repo.updateRegion(id, input, actualizadoPor)
}

export async function eliminarRegion(id: number, eliminadoPor: string) {
  await obtenerRegionVigente(id)
  const { provincias } = await repo.contarReferenciasActivas(id)
  if (provincias > 0) {
    throw conflicto(`No se puede eliminar: la región está en uso por ${provincias} provincia(s)`, { provincias })
  }
  await repo.softDeleteRegion(id, eliminadoPor)
}
