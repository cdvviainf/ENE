import { noEncontrado, conflicto } from '../../../shared/errors.js'
import * as repo from './comunas.repository.js'
import type { ComunaCreateInput, ComunaUpdateInput } from './comunas.schema.js'

export async function listarComunas(page: number, limit: number, q?: string, provinciaId?: number) {
  const { data, total } = await repo.findAllComunas(page, limit, { q, provinciaId })
  return { data, meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } }
}

export async function obtenerComuna(id: number) {
  const comuna = await repo.findComunaById(id)
  if (!comuna) throw noEncontrado('Comuna', id)
  return comuna
}

async function obtenerComunaVigente(id: number) {
  const comuna = await obtenerComuna(id)
  if (comuna.eliminadoEn) throw conflicto('La comuna fue eliminada y no admite cambios')
  return comuna
}

export async function crearComuna(input: ComunaCreateInput, creadoPor: string) {
  if (await repo.findComunaByCodigo(input.codigo)) {
    throw conflicto(`Ya existe una comuna con el código "${input.codigo}"`)
  }
  return repo.createComuna(input, creadoPor)
}

export async function actualizarComuna(id: number, input: ComunaUpdateInput, actualizadoPor: string) {
  await obtenerComunaVigente(id)
  if (input.codigo && (await repo.findComunaByCodigo(input.codigo, id))) {
    throw conflicto(`Ya existe una comuna con el código "${input.codigo}"`)
  }
  return repo.updateComuna(id, input, actualizadoPor)
}

export async function eliminarComuna(id: number, eliminadoPor: string) {
  await obtenerComunaVigente(id)
  const { direccionesCliente, direccionesProveedor } = await repo.contarReferenciasActivas(id)
  const total = direccionesCliente + direccionesProveedor
  if (total > 0) {
    throw conflicto(
      `No se puede eliminar: la comuna está en uso por ${total} dirección(es)`,
      { direccionesCliente, direccionesProveedor },
    )
  }
  await repo.softDeleteComuna(id, eliminadoPor)
}
