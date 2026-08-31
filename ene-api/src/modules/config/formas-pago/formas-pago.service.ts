import { noEncontrado, conflicto } from '../../../shared/errors.js'
import * as repo from './formas-pago.repository.js'
import type { FormaPagoCreateInput, FormaPagoUpdateInput } from './formas-pago.schema.js'

export async function listarFormasPago(page: number, limit: number, q?: string) {
  const { data, total } = await repo.findAllFormasPago(page, limit, q)
  return { data, meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } }
}

export async function obtenerFormaPago(id: number) {
  const formaPago = await repo.findFormaPagoById(id)
  if (!formaPago) throw noEncontrado('Forma de pago', id)
  return formaPago
}

async function obtenerFormaPagoVigente(id: number) {
  const formaPago = await obtenerFormaPago(id)
  if (formaPago.eliminadoEn) throw conflicto('La forma de pago fue eliminada y no admite cambios')
  return formaPago
}

export async function crearFormaPago(input: FormaPagoCreateInput, creadoPor: string) {
  if (await repo.findFormaPagoByCodigo(input.codigo)) {
    throw conflicto(`Ya existe una forma de pago con el código "${input.codigo}"`)
  }
  return repo.createFormaPago(input, creadoPor)
}

export async function actualizarFormaPago(id: number, input: FormaPagoUpdateInput, actualizadoPor: string) {
  await obtenerFormaPagoVigente(id)
  if (input.codigo && (await repo.findFormaPagoByCodigo(input.codigo, id))) {
    throw conflicto(`Ya existe una forma de pago con el código "${input.codigo}"`)
  }
  return repo.updateFormaPago(id, input, actualizadoPor)
}

export async function eliminarFormaPago(id: number, eliminadoPor: string) {
  await obtenerFormaPagoVigente(id)
  const { clientes, proveedores } = await repo.contarReferenciasActivas(id)
  const total = clientes + proveedores
  if (total > 0) {
    throw conflicto(
      `No se puede eliminar: la forma de pago está en uso por ${clientes} cliente(s) y ${proveedores} proveedor(es)`,
      { clientes, proveedores },
    )
  }
  await repo.softDeleteFormaPago(id, eliminadoPor)
}
