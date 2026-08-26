import type { preHandlerHookHandler } from 'fastify'
import type { NivelAcceso } from '@prisma/client'
import { fromNodeHeaders } from 'better-auth/node'
import { auth } from '../lib/auth.js'
import { prisma } from '../lib/prisma.js'

declare module 'fastify' {
  interface FastifyRequest {
    // Usuario de dominio resuelto por requireAuth (id Int).
    eneUsuarioId?: number
    enePerfilId?: number
    // Niveles del perfil indexados por código de ítem de menú.
    eneAccesos?: Map<string, NivelAcceso>
  }
}

/**
 * Verifica sesión activa (Better Auth) y carga en una sola query el Usuario de
 * dominio enlazado por `authUserId`, su perfil y los niveles por ítem de menú
 * (RN-PER-01). Un Usuario soft-deleted o inactivo no pasa.
 */
export const requireAuth: preHandlerHookHandler = async (request, reply) => {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) })
  if (!session?.user) {
    reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Autenticación requerida.' } })
    return
  }

  const usuario = await prisma.usuario.findFirst({
    where: { authUserId: session.user.id, eliminadoEn: null, activo: true },
    select: {
      id: true,
      perfilId: true,
      perfil: {
        select: {
          accesos: { select: { nivel: true, itemMenu: { select: { codigo: true } } } },
        },
      },
    },
  })

  if (!usuario) {
    reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Sesión inválida o usuario inactivo.' } })
    return
  }

  request.eneUsuarioId = usuario.id
  request.enePerfilId = usuario.perfilId
  request.eneAccesos = new Map(usuario.perfil.accesos.map((a) => [a.itemMenu.codigo, a.nivel]))
}

/**
 * Nivel mínimo para un ítem de menú. Usar después de requireAuth: lee
 * `eneAccesos` sin ir a la BD.
 */
export function requireLevel(
  itemMenuCodigo: string,
  minLevel: 'LECTURA' | 'TOTAL',
): preHandlerHookHandler {
  return async (request, reply) => {
    const nivel = request.eneAccesos?.get(itemMenuCodigo) ?? 'SIN_ACCESO'
    if (minLevel === 'LECTURA' && nivel === 'SIN_ACCESO') {
      reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'No tiene acceso a esta función.' } })
      return
    }
    if (minLevel === 'TOTAL' && nivel !== 'TOTAL') {
      reply
        .status(403)
        .send({ error: { code: 'FORBIDDEN', message: 'Se requiere acceso total para esta operación.' } })
      return
    }
  }
}

/**
 * Como requireLevel, pero satisfecho si el nivel mínimo se cumple en CUALQUIERA
 * de los ítems de menú listados (recursos accesibles desde más de un ítem).
 */
export function requireAnyLevel(
  itemMenuCodigos: string[],
  minLevel: 'LECTURA' | 'TOTAL',
): preHandlerHookHandler {
  return async (request, reply) => {
    const cumple = itemMenuCodigos.some((codigo) => {
      const nivel = request.eneAccesos?.get(codigo) ?? 'SIN_ACCESO'
      return minLevel === 'LECTURA' ? nivel !== 'SIN_ACCESO' : nivel === 'TOTAL'
    })
    if (!cumple) {
      const mensaje =
        minLevel === 'TOTAL'
          ? 'Se requiere acceso total para esta operación.'
          : 'No tiene acceso a esta función.'
      reply.status(403).send({ error: { code: 'FORBIDDEN', message: mensaje } })
      return
    }
  }
}
