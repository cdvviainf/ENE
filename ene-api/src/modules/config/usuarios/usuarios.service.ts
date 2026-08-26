import { noEncontrado, conflicto, validacion } from '../../../shared/errors.js'
import { validarComplejidadPassword } from '../../../shared/password-validator.js'
import { auth, ISSUER_CREDENCIAL } from '../../../lib/auth.js'
import { findPerfilById } from '../perfiles/perfiles.repository.js'
import * as repo from './usuarios.repository.js'
import type { UsuarioCreateInput, UsuarioUpdateInput, CambiarPasswordInput } from './usuarios.schema.js'

const SISTEMA = 'system'

export async function listarUsuarios(page: number, limit: number, q?: string, perfilId?: number) {
  const { data, total } = await repo.findAllUsuarios(page, limit, q, perfilId)
  return { data, meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } }
}

export async function obtenerUsuario(id: number) {
  const usuario = await repo.findUsuarioById(id)
  if (!usuario) throw noEncontrado('Usuario', id)
  return usuario
}

export async function crearUsuario(input: UsuarioCreateInput, usuarioActual = SISTEMA) {
  if (input.password !== input.passwordConfirm) throw validacion('Las contraseñas no coinciden')
  const errPass = validarComplejidadPassword(input.password)
  if (errPass) throw validacion(errPass)

  const perfil = await findPerfilById(input.perfilId)
  if (!perfil) throw validacion(`El perfil con ID ${input.perfilId} no existe`)

  if (await repo.findUsuarioByEmail(input.email)) {
    throw conflicto(`Ya existe un usuario con el email "${input.email}"`)
  }
  if (await repo.findUsuarioByCodigo(input.codigo)) {
    throw conflicto(`Ya existe un usuario con el código "${input.codigo}"`)
  }

  // Crear identidad en Better Auth (User + credencial). Si falla la creación del
  // Usuario de dominio, se compensa borrando el User para no dejarlo huérfano.
  const ctx = await auth.$context
  const hashed = await ctx.password.hash(input.password)
  const authUser = await ctx.internalAdapter.createUser(
    { email: input.email, name: input.nombre, emailVerified: false },
    { method: 'admin-create' },
  )

  try {
    await ctx.internalAdapter.createAccount({
      userId: authUser.id,
      providerId: 'credential',
      issuer: ISSUER_CREDENCIAL,
      accountId: authUser.id,
      password: hashed,
    })
    return await repo.createUsuario({
      codigo: input.codigo,
      nombre: input.nombre,
      email: input.email,
      perfilId: input.perfilId,
      authUserId: authUser.id,
      creadoPor: usuarioActual,
    })
  } catch (err) {
    await ctx.internalAdapter.deleteUser(authUser.id).catch(() => {})
    throw err
  }
}

export async function actualizarUsuario(id: number, input: UsuarioUpdateInput, usuarioActual = SISTEMA) {
  const usuario = await repo.findUsuarioById(id)
  if (!usuario) throw noEncontrado('Usuario', id)

  if (input.perfilId !== undefined) {
    const perfil = await findPerfilById(input.perfilId)
    if (!perfil) throw validacion(`El perfil con ID ${input.perfilId} no existe`)
  }
  if (input.codigo && input.codigo !== usuario.codigo) {
    if (await repo.findUsuarioByCodigo(input.codigo, id)) {
      throw conflicto(`Ya existe un usuario con el código "${input.codigo}"`)
    }
  }

  return repo.updateUsuario(id, { ...input, actualizadoPor: usuarioActual })
}

export async function cambiarPassword(id: number, input: CambiarPasswordInput, usuarioActual = SISTEMA) {
  const usuario = await repo.findUsuarioAuthById(id)
  if (!usuario) throw noEncontrado('Usuario', id)
  if (!usuario.authUserId) throw validacion('El usuario no tiene una credencial asociada')

  if (input.password !== input.passwordConfirm) throw validacion('Las contraseñas no coinciden')
  const errPass = validarComplejidadPassword(input.password)
  if (errPass) throw validacion(errPass)

  const ctx = await auth.$context
  const hashed = await ctx.password.hash(input.password)
  await ctx.internalAdapter.updatePassword(usuario.authUserId, hashed)
  // Revocar las sesiones activas: tras un cambio de contraseña el usuario debe
  // volver a iniciar sesión.
  await ctx.internalAdapter.deleteUserSessions(usuario.authUserId)
  // Auditoría de dominio (RN-PER-03): registrar quién hizo el cambio.
  await repo.touchUsuario(id, usuarioActual)
}

export async function eliminarUsuario(id: number, usuarioActual = SISTEMA) {
  const usuario = await repo.findUsuarioById(id)
  if (!usuario) throw noEncontrado('Usuario', id)
  // Soft delete: RN-PER — un usuario eliminado no puede autenticarse (ver el
  // hook de sesión en lib/auth.ts y requireAuth).
  await repo.softDeleteUsuario(id, usuarioActual)
}
