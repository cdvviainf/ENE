import type { FastifyRequest, FastifyReply } from 'fastify'
import * as service from './perfiles.service.js'
import {
  perfilCreateSchema,
  perfilUpdateSchema,
  perfilIdParamSchema,
  perfilListQuerySchema,
} from './perfiles.schema.js'

function usuarioSesion(req: FastifyRequest): string {
  return req.eneUsuarioId != null ? String(req.eneUsuarioId) : 'system'
}

export async function listPerfiles(req: FastifyRequest, reply: FastifyReply) {
  const query = perfilListQuerySchema.parse(req.query)
  return reply.send(await service.listarPerfiles(query.page, query.limit, query.q))
}

export async function getPerfilById(req: FastifyRequest, reply: FastifyReply) {
  const { id } = perfilIdParamSchema.parse(req.params)
  return reply.send(await service.obtenerPerfil(id))
}

export async function createPerfil(req: FastifyRequest, reply: FastifyReply) {
  const input = perfilCreateSchema.parse(req.body)
  return reply.status(201).send(await service.crearPerfil(input, usuarioSesion(req)))
}

export async function updatePerfil(req: FastifyRequest, reply: FastifyReply) {
  const { id } = perfilIdParamSchema.parse(req.params)
  const input = perfilUpdateSchema.parse(req.body)
  return reply.send(await service.actualizarPerfil(id, input, usuarioSesion(req)))
}

export async function deletePerfil(req: FastifyRequest, reply: FastifyReply) {
  const { id } = perfilIdParamSchema.parse(req.params)
  await service.eliminarPerfil(id, usuarioSesion(req))
  return reply.status(204).send()
}

export async function listItemsMenu(_req: FastifyRequest, reply: FastifyReply) {
  return reply.send(await service.listarItemsMenu())
}

export async function getMiMenu(req: FastifyRequest, reply: FastifyReply) {
  // requireAuth ya garantizó la sesión y cargó enPerfilId.
  return reply.send(await service.obtenerMiMenu(req.enePerfilId!))
}
