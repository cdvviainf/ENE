import { prisma } from '../../lib/prisma.js'
import { noEncontrado, conflicto } from '../../shared/errors.js'
import { resolverCodigo } from '../../shared/correlativos.js'
import { operacionesAbiertas, hayOperacionesAbiertas, errorSoftDeleteBloqueado } from '../../shared/operaciones-abiertas.js'
import * as repo from './grupos.repository.js'
import type { GrupoCreateInput, GrupoUpdateInput, PasajeroInput, PasajeroUpdateInput } from './grupos.schema.js'

export async function listarGrupos(page: number, limit: number, filtros: { q?: string; clienteId?: number }) {
  const { data, total } = await repo.findAllGrupos(page, limit, filtros)

  // RN-GRP-02: próxima operación por grupo, para el listado.
  const proximas = await repo.findProximasOperaciones(data.map((g) => g.id))
  const conProxima = data.map((g) => ({ ...g, proximaOperacion: proximas.get(g.id)?.toISOString() ?? null }))

  return { data: conProxima, meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } }
}

export async function obtenerGrupo(id: number) {
  const grupo = await repo.findGrupoById(id)
  if (!grupo) throw noEncontrado('Grupo', id)
  return grupo
}

// RN-MAN-05: se puede consultar un grupo eliminado, pero no volver a mutarlo.
async function obtenerGrupoVigente(id: number) {
  const grupo = await obtenerGrupo(id)
  if (grupo.eliminadoEn) throw conflicto('El grupo fue eliminado y no admite cambios')
  return grupo
}

export async function crearGrupo(input: GrupoCreateInput, creadoPor: string) {
  return prisma.$transaction(async (tx) => {
    const codigo = await resolverCodigo(tx, 'GRUPO', input.codigo)
    if (await repo.findGrupoByCodigo(codigo, undefined, tx)) {
      throw conflicto(`Ya existe un grupo con el código "${codigo}"`)
    }
    return repo.createGrupo(tx, { ...input, codigo }, input.pasajeros, creadoPor)
  })
}

export async function actualizarGrupo(id: number, input: GrupoUpdateInput, actualizadoPor: string) {
  await obtenerGrupoVigente(id)
  return repo.updateGrupo(id, input, actualizadoPor)
}

export async function eliminarGrupo(id: number, eliminadoPor: string) {
  await obtenerGrupoVigente(id)
  const referencias = await operacionesAbiertas({ grupoId: id })
  if (hayOperacionesAbiertas(referencias)) throw errorSoftDeleteBloqueado('el grupo', referencias)
  await repo.softDeleteGrupo(id, eliminadoPor)
}

// ─── Pasajeros (RN-GRP-04: siempre opcional, nunca bloquea el flujo) ────────

export async function crearPasajero(grupoId: number, input: PasajeroInput, creadoPor: string) {
  await obtenerGrupoVigente(grupoId)
  return repo.createPasajero(grupoId, input, creadoPor)
}

export async function actualizarPasajero(
  grupoId: number,
  pasajeroId: number,
  input: PasajeroUpdateInput,
  actualizadoPor: string,
) {
  const pasajero = await repo.findPasajeroById(grupoId, pasajeroId)
  if (!pasajero) throw noEncontrado('Pasajero', pasajeroId)
  return repo.updatePasajero(pasajeroId, input, actualizadoPor)
}

export async function eliminarPasajero(grupoId: number, pasajeroId: number, eliminadoPor: string) {
  const pasajero = await repo.findPasajeroById(grupoId, pasajeroId)
  if (!pasajero) throw noEncontrado('Pasajero', pasajeroId)
  await repo.softDeletePasajero(pasajeroId, eliminadoPor)
}
