import { noEncontrado, conflicto } from '../../../shared/errors.js'
import * as repo from './provincias.repository.js'
import type { ProvinciaCreateInput, ProvinciaUpdateInput } from './provincias.schema.js'

export async function listarProvincias(page: number, limit: number, q?: string, regionId?: number) {
  const { data, total } = await repo.findAllProvincias(page, limit, { q, regionId })
  return { data, meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } }
}

export async function obtenerProvincia(id: number) {
  const provincia = await repo.findProvinciaById(id)
  if (!provincia) throw noEncontrado('Provincia', id)
  return provincia
}

async function obtenerProvinciaVigente(id: number) {
  const provincia = await obtenerProvincia(id)
  if (provincia.eliminadoEn) throw conflicto('La provincia fue eliminada y no admite cambios')
  return provincia
}

export async function crearProvincia(input: ProvinciaCreateInput, creadoPor: string) {
  if (await repo.findProvinciaByCodigo(input.codigo)) {
    throw conflicto(`Ya existe una provincia con el código "${input.codigo}"`)
  }
  return repo.createProvincia(input, creadoPor)
}

export async function actualizarProvincia(id: number, input: ProvinciaUpdateInput, actualizadoPor: string) {
  await obtenerProvinciaVigente(id)
  if (input.codigo && (await repo.findProvinciaByCodigo(input.codigo, id))) {
    throw conflicto(`Ya existe una provincia con el código "${input.codigo}"`)
  }
  return repo.updateProvincia(id, input, actualizadoPor)
}

export async function eliminarProvincia(id: number, eliminadoPor: string) {
  await obtenerProvinciaVigente(id)
  const { comunas } = await repo.contarReferenciasActivas(id)
  if (comunas > 0) {
    throw conflicto(`No se puede eliminar: la provincia está en uso por ${comunas} comuna(s)`, { comunas })
  }
  await repo.softDeleteProvincia(id, eliminadoPor)
}
