import { noEncontrado, conflicto } from '../../../shared/errors.js'
import * as repo from './condiciones-pago.repository.js'
import type { CondicionPagoCreateInput, CondicionPagoUpdateInput } from './condiciones-pago.schema.js'

export async function listarCondicionesPago(page: number, limit: number, q?: string) {
  const { data, total } = await repo.findAllCondicionesPago(page, limit, q)
  return { data, meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } }
}

export async function obtenerCondicionPago(id: number) {
  const condicionPago = await repo.findCondicionPagoById(id)
  if (!condicionPago) throw noEncontrado('Condición de pago', id)
  return condicionPago
}

async function obtenerCondicionPagoVigente(id: number) {
  const condicionPago = await obtenerCondicionPago(id)
  if (condicionPago.eliminadoEn) throw conflicto('La condición de pago fue eliminada y no admite cambios')
  return condicionPago
}

export async function crearCondicionPago(input: CondicionPagoCreateInput, creadoPor: string) {
  if (await repo.findCondicionPagoByCodigo(input.codigo)) {
    throw conflicto(`Ya existe una condición de pago con el código "${input.codigo}"`)
  }
  return repo.createCondicionPago(input, creadoPor)
}

export async function actualizarCondicionPago(id: number, input: CondicionPagoUpdateInput, actualizadoPor: string) {
  await obtenerCondicionPagoVigente(id)
  if (input.codigo && (await repo.findCondicionPagoByCodigo(input.codigo, id))) {
    throw conflicto(`Ya existe una condición de pago con el código "${input.codigo}"`)
  }
  return repo.updateCondicionPago(id, input, actualizadoPor)
}

export async function eliminarCondicionPago(id: number, eliminadoPor: string) {
  await obtenerCondicionPagoVigente(id)
  const { clientes, proveedores } = await repo.contarReferenciasActivas(id)
  const total = clientes + proveedores
  if (total > 0) {
    throw conflicto(
      `No se puede eliminar: la condición de pago está en uso por ${clientes} cliente(s) y ${proveedores} proveedor(es)`,
      { clientes, proveedores },
    )
  }
  await repo.softDeleteCondicionPago(id, eliminadoPor)
}
