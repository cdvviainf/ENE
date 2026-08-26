import { noEncontrado, conflicto } from '../../../shared/errors.js'
import type { NivelAcceso } from '@prisma/client'
import * as repo from './perfiles.repository.js'
import type { PerfilCreateInput, PerfilUpdateInput } from './perfiles.schema.js'

const SISTEMA = 'system'

export async function listarPerfiles(page: number, limit: number, q?: string) {
  const { data, total } = await repo.findAllPerfiles(page, limit, q)
  return { data, meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } }
}

export async function obtenerPerfil(id: number) {
  const perfil = await repo.findPerfilById(id)
  if (!perfil) throw noEncontrado('Perfil', id)

  // Completar la matriz: todos los ítems activos, con SIN_ACCESO donde no hay fila.
  const items = await repo.findAllItemsMenu()
  const porItem = new Map(perfil.accesos.map((a) => [a.itemMenuId, a]))

  const accesos = items.map((item) => ({
    itemMenuId: item.id,
    nivel: (porItem.get(item.id)?.nivel ?? 'SIN_ACCESO') as NivelAcceso,
    itemMenu: item,
  }))

  return { ...perfil, accesos }
}

export async function crearPerfil(input: PerfilCreateInput, usuario = SISTEMA) {
  const existente = await repo.findPerfilByCodigo(input.codigo)
  if (existente) throw conflicto(`Ya existe un perfil con código "${input.codigo}"`)

  return repo.createPerfil(
    { codigo: input.codigo, nombre: input.nombre, descripcion: input.descripcion, creadoPor: usuario },
    input.accesos ?? [],
  )
}

export async function actualizarPerfil(id: number, input: PerfilUpdateInput, usuario = SISTEMA) {
  const perfil = await repo.findPerfilById(id)
  if (!perfil) throw noEncontrado('Perfil', id)

  if (input.codigo && input.codigo !== perfil.codigo) {
    const existente = await repo.findPerfilByCodigo(input.codigo, id)
    if (existente) throw conflicto(`Ya existe un perfil con código "${input.codigo}"`)
  }

  return repo.updatePerfil(
    id,
    { codigo: input.codigo, nombre: input.nombre, descripcion: input.descripcion, actualizadoPor: usuario },
    input.accesos,
  )
}

export async function eliminarPerfil(id: number, usuario = SISTEMA) {
  const perfil = await repo.findPerfilById(id)
  if (!perfil) throw noEncontrado('Perfil', id)

  // No se elimina un perfil con usuarios activos.
  const usuarios = await repo.countUsuariosActivosByPerfilId(id)
  if (usuarios > 0) {
    throw conflicto(
      `No se puede eliminar el perfil: tiene ${usuarios} usuario${usuarios === 1 ? '' : 's'} activo${usuarios === 1 ? '' : 's'} asociado${usuarios === 1 ? '' : 's'}.`,
    )
  }

  await repo.softDeletePerfil(id, usuario)
}

export async function listarItemsMenu() {
  return repo.findAllItemsMenu()
}

/** Menú del usuario en sesión: ítems con acceso, con el nivel ya resuelto. */
export async function obtenerMiMenu(perfilId: number) {
  const accesos = await repo.findAccesosDelPerfil(perfilId)
  return accesos.map((a) => ({ ...a.itemMenu, nivel: a.nivel }))
}
