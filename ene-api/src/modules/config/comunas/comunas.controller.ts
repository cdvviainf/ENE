import type { FastifyRequest, FastifyReply } from 'fastify'
import * as service from './comunas.service.js'
import { comunaCreateSchema, comunaUpdateSchema, comunaIdParamSchema, comunaListQuerySchema } from './comunas.schema.js'

function usuarioSesion(req: FastifyRequest): string {
  return req.eneUsuarioId != null ? String(req.eneUsuarioId) : 'system'
}

export async function listComunas(req: FastifyRequest, reply: FastifyReply) {
  const query = comunaListQuerySchema.parse(req.query)
  return reply.send(await service.listarComunas(query.page, query.limit, query.q, query.provinciaId))
}

export async function getComunaById(req: FastifyRequest, reply: FastifyReply) {
  const { id } = comunaIdParamSchema.parse(req.params)
  return reply.send(await service.obtenerComuna(id))
}

export async function createComuna(req: FastifyRequest, reply: FastifyReply) {
  const input = comunaCreateSchema.parse(req.body)
  return reply.status(201).send(await service.crearComuna(input, usuarioSesion(req)))
}

export async function updateComuna(req: FastifyRequest, reply: FastifyReply) {
  const { id } = comunaIdParamSchema.parse(req.params)
  const input = comunaUpdateSchema.parse(req.body)
  return reply.send(await service.actualizarComuna(id, input, usuarioSesion(req)))
}

export async function deleteComuna(req: FastifyRequest, reply: FastifyReply) {
  const { id } = comunaIdParamSchema.parse(req.params)
  await service.eliminarComuna(id, usuarioSesion(req))
  return reply.status(204).send()
}
