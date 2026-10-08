import { noEncontrado, conflicto } from '../../../shared/errors.js'
import * as repo from './tipos-documento.repository.js'
import type { TipoDocumentoCreateInput, TipoDocumentoUpdateInput } from './tipos-documento.schema.js'

export async function listarTiposDocumento(page: number, limit: number, q?: string) {
  const { data, total } = await repo.findAllTiposDocumento(page, limit, q)
  return { data, meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } }
}

export async function obtenerTipoDocumento(id: number) {
  const tipoDocumento = await repo.findTipoDocumentoById(id)
  if (!tipoDocumento) throw noEncontrado('Tipo de documento', id)
  return tipoDocumento
}

async function obtenerTipoDocumentoVigente(id: number) {
  const tipoDocumento = await obtenerTipoDocumento(id)
  if (tipoDocumento.eliminadoEn) throw conflicto('El tipo de documento fue eliminado y no admite cambios')
  return tipoDocumento
}

export async function crearTipoDocumento(input: TipoDocumentoCreateInput, creadoPor: string) {
  if (await repo.findTipoDocumentoByCodigo(input.codigo)) {
    throw conflicto(`Ya existe un tipo de documento con el código "${input.codigo}"`)
  }
  return repo.createTipoDocumento(input, creadoPor)
}

export async function actualizarTipoDocumento(id: number, input: TipoDocumentoUpdateInput, actualizadoPor: string) {
  await obtenerTipoDocumentoVigente(id)
  if (input.codigo && (await repo.findTipoDocumentoByCodigo(input.codigo, id))) {
    throw conflicto(`Ya existe un tipo de documento con el código "${input.codigo}"`)
  }
  return repo.updateTipoDocumento(id, input, actualizadoPor)
}

export async function eliminarTipoDocumento(id: number, eliminadoPor: string) {
  await obtenerTipoDocumentoVigente(id)
  const proveedores = await repo.contarReferenciasActivas(id)
  if (proveedores > 0) {
    throw conflicto(
      `No se puede eliminar: el tipo de documento está en uso por ${proveedores} proveedor(es)`,
      { proveedores },
    )
  }
  await repo.softDeleteTipoDocumento(id, eliminadoPor)
}
