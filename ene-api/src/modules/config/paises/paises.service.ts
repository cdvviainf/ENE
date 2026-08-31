import { noEncontrado, conflicto } from '../../../shared/errors.js'
import * as repo from './paises.repository.js'
import type { PaisCreateInput, PaisUpdateInput } from './paises.schema.js'

export async function listarPaises(page: number, limit: number, q?: string) {
  const { data, total } = await repo.findAllPaises(page, limit, q)
  return { data, meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } }
}

export async function obtenerPais(id: number) {
  const pais = await repo.findPaisById(id)
  if (!pais) throw noEncontrado('País', id)
  return pais
}

// RN-MAN-05: se puede consultar uno eliminado, pero no volver a mutarlo.
async function obtenerPaisVigente(id: number) {
  const pais = await obtenerPais(id)
  if (pais.eliminadoEn) throw conflicto('El país fue eliminado y no admite cambios')
  return pais
}

export async function crearPais(input: PaisCreateInput, creadoPor: string) {
  if (await repo.findPaisByCodigo(input.codigo)) {
    throw conflicto(`Ya existe un país con el código "${input.codigo}"`)
  }
  return repo.createPais(input, creadoPor)
}

export async function actualizarPais(id: number, input: PaisUpdateInput, actualizadoPor: string) {
  await obtenerPaisVigente(id)
  if (input.codigo && (await repo.findPaisByCodigo(input.codigo, id))) {
    throw conflicto(`Ya existe un país con el código "${input.codigo}"`)
  }
  return repo.updatePais(id, input, actualizadoPor)
}

export async function eliminarPais(id: number, eliminadoPor: string) {
  await obtenerPaisVigente(id)
  const { direccionesCliente, direccionesProveedor } = await repo.contarReferenciasActivas(id)
  const total = direccionesCliente + direccionesProveedor
  if (total > 0) {
    throw conflicto(
      `No se puede eliminar: el país está en uso por ${total} dirección(es)`,
      { direccionesCliente, direccionesProveedor },
    )
  }
  await repo.softDeletePais(id, eliminadoPor)
}
