import type { FastifyRequest, FastifyReply } from 'fastify'
import * as service from './usuarios.service.js'
import {
  usuarioCreateSchema,
  usuarioUpdateSchema,
  cambiarPasswordSchema,
  usuarioIdParamSchema,
  usuarioListQuerySchema,
} from './usuarios.schema.js'

function usuarioSesion(req: FastifyRequest): string {
  return req.eneUsuarioId != null ? String(req.eneUsuarioId) : 'system'
}

export async function listUsuarios(req: FastifyRequest, reply: FastifyReply) {
  const query = usuarioListQuerySchema.parse(req.query)
  return reply.send(await service.listarUsuarios(query.page, query.limit, query.q, query.perfilId))
}

export async function getUsuarioById(req: FastifyRequest, reply: FastifyReply) {
  const { id } = usuarioIdParamSchema.parse(req.params)
  return reply.send(await service.obtenerUsuario(id))
}

export async function createUsuario(req: FastifyRequest, reply: FastifyReply) {
  const input = usuarioCreateSchema.parse(req.body)
  return reply.status(201).send(await service.crearUsuario(input, usuarioSesion(req)))
}

export async function updateUsuario(req: FastifyRequest, reply: FastifyReply) {
  const { id } = usuarioIdParamSchema.parse(req.params)
  const input = usuarioUpdateSchema.parse(req.body)
  return reply.send(await service.actualizarUsuario(id, input, usuarioSesion(req)))
}

export async function changePassword(req: FastifyRequest, reply: FastifyReply) {
  const { id } = usuarioIdParamSchema.parse(req.params)
  const input = cambiarPasswordSchema.parse(req.body)
  await service.cambiarPassword(id, input, usuarioSesion(req))
  return reply.status(204).send()
}

export async function deleteUsuario(req: FastifyRequest, reply: FastifyReply) {
  const { id } = usuarioIdParamSchema.parse(req.params)
  await service.eliminarUsuario(id, usuarioSesion(req))
  return reply.status(204).send()
}
