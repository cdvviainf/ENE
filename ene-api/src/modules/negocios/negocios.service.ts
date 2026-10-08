import { prisma } from '../../lib/prisma.js'
import { noEncontrado, conflicto } from '../../shared/errors.js'
import { resolverCodigo } from '../../shared/correlativos.js'
import { operacionesAbiertas, hayOperacionesAbiertas, errorSoftDeleteBloqueado } from '../../shared/operaciones-abiertas.js'
import * as repo from './negocios.repository.js'
import type { NegocioCreateInput, NegocioUpdateInput, PasajeroInput, PasajeroUpdateInput } from './negocios.schema.js'

export async function listarNegocios(page: number, limit: number, filtros: { q?: string; clienteId?: number }) {
  const { data, total } = await repo.findAllNegocios(page, limit, filtros)

  // RN-GRP-02: próxima operación por negocio, para el listado.
  const proximas = await repo.findProximasOperaciones(data.map((g) => g.id))
  const conProxima = data.map((g) => ({ ...g, proximaOperacion: proximas.get(g.id)?.toISOString() ?? null }))

  return { data: conProxima, meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } }
}

export async function obtenerNegocio(id: number) {
  const negocio = await repo.findNegocioById(id)
  if (!negocio) throw noEncontrado('Negocio', id)
  return negocio
}

// RN-MAN-05: se puede consultar un negocio eliminado, pero no volver a mutarlo.
async function obtenerNegocioVigente(id: number) {
  const negocio = await obtenerNegocio(id)
  if (negocio.eliminadoEn) throw conflicto('El negocio fue eliminado y no admite cambios')
  return negocio
}

export async function crearNegocio(input: NegocioCreateInput, creadoPor: string) {
  return prisma.$transaction(async (tx) => {
    const codigo = await resolverCodigo(tx, 'NEGOCIO', input.codigo)
    if (await repo.findNegocioByCodigo(codigo, undefined, tx)) {
      throw conflicto(`Ya existe un negocio con el código "${codigo}"`)
    }
    return repo.createNegocio(tx, { ...input, codigo }, input.pasajeros, creadoPor)
  })
}

export async function actualizarNegocio(id: number, input: NegocioUpdateInput, actualizadoPor: string) {
  await obtenerNegocioVigente(id)
  return repo.updateNegocio(id, input, actualizadoPor)
}

export async function eliminarNegocio(id: number, eliminadoPor: string) {
  await obtenerNegocioVigente(id)
  const referencias = await operacionesAbiertas({ negocioId: id })
  if (hayOperacionesAbiertas(referencias)) throw errorSoftDeleteBloqueado('el negocio', referencias)
  await repo.softDeleteNegocio(id, eliminadoPor)
}

// ─── Pasajeros (RN-GRP-04: siempre opcional, nunca bloquea el flujo) ────────

export async function crearPasajero(negocioId: number, input: PasajeroInput, creadoPor: string) {
  await obtenerNegocioVigente(negocioId)
  return repo.createPasajero(negocioId, input, creadoPor)
}

export async function actualizarPasajero(
  negocioId: number,
  pasajeroId: number,
  input: PasajeroUpdateInput,
  actualizadoPor: string,
) {
  const pasajero = await repo.findPasajeroById(negocioId, pasajeroId)
  if (!pasajero) throw noEncontrado('Pasajero', pasajeroId)
  return repo.updatePasajero(pasajeroId, input, actualizadoPor)
}

export async function eliminarPasajero(negocioId: number, pasajeroId: number, eliminadoPor: string) {
  const pasajero = await repo.findPasajeroById(negocioId, pasajeroId)
  if (!pasajero) throw noEncontrado('Pasajero', pasajeroId)
  await repo.softDeletePasajero(pasajeroId, eliminadoPor)
}
