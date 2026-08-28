import { noEncontrado, conflicto } from '../../../shared/errors.js'
import * as repo from './tipos-servicio.repository.js'
import type { TipoServicioCreateInput, TipoServicioUpdateInput } from './tipos-servicio.schema.js'

export async function listarTiposServicio(page: number, limit: number, q?: string) {
  const { data, total } = await repo.findAllTiposServicio(page, limit, q)
  return { data, meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } }
}

export async function obtenerTipoServicio(id: number) {
  const tipo = await repo.findTipoServicioById(id)
  if (!tipo) throw noEncontrado('Tipo de servicio', id)
  return tipo
}

// RN-MAN-05: se puede consultar uno eliminado, pero no volver a mutarlo.
async function obtenerTipoServicioVigente(id: number) {
  const tipo = await obtenerTipoServicio(id)
  if (tipo.eliminadoEn) throw conflicto('El tipo de servicio fue eliminado y no admite cambios')
  return tipo
}

export async function crearTipoServicio(input: TipoServicioCreateInput, creadoPor: string) {
  if (await repo.findTipoServicioByCodigo(input.codigo)) {
    throw conflicto(`Ya existe un tipo de servicio con el código "${input.codigo}"`)
  }
  return repo.createTipoServicio(input, creadoPor)
}

export async function actualizarTipoServicio(id: number, input: TipoServicioUpdateInput, actualizadoPor: string) {
  await obtenerTipoServicioVigente(id)
  if (input.codigo && (await repo.findTipoServicioByCodigo(input.codigo, id))) {
    throw conflicto(`Ya existe un tipo de servicio con el código "${input.codigo}"`)
  }
  return repo.updateTipoServicio(id, input, actualizadoPor)
}

export async function eliminarTipoServicio(id: number, eliminadoPor: string) {
  await obtenerTipoServicioVigente(id)
  // No es una "operación" (RN-MAN-04 habla de cotización/OT/OC); acá el
  // bloqueo es referencial directo: servicios o proveedores vigentes que lo
  // usan como clasificación se quedarían sin tipo válido.
  const { servicios, proveedores } = await repo.contarReferenciasActivas(id)
  if (servicios > 0 || proveedores > 0) {
    throw conflicto(
      `No se puede eliminar: el tipo de servicio está en uso por ${servicios} servicio(s) y ${proveedores} proveedor(es)`,
      { servicios, proveedores },
    )
  }
  await repo.softDeleteTipoServicio(id, eliminadoPor)
}
