import type { FastifyRequest, FastifyReply } from 'fastify'
import * as service from './paises.service.js'
import { paisCreateSchema, paisUpdateSchema, paisIdParamSchema, paisListQuerySchema } from './paises.schema.js'

function usuarioSesion(req: FastifyRequest): string {
  return req.eneUsuarioId != null ? String(req.eneUsuarioId) : 'system'
}

export async function listPaises(req: FastifyRequest, reply: FastifyReply) {
  const query = paisListQuerySchema.parse(req.query)
  return reply.send(await service.listarPaises(query.page, query.limit, query.q))
}

export async function getPaisById(req: FastifyRequest, reply: FastifyReply) {
  const { id } = paisIdParamSchema.parse(req.params)
  return reply.send(await service.obtenerPais(id))
}

export async function createPais(req: FastifyRequest, reply: FastifyReply) {
  const input = paisCreateSchema.parse(req.body)
  return reply.status(201).send(await service.crearPais(input, usuarioSesion(req)))
}

export async function updatePais(req: FastifyRequest, reply: FastifyReply) {
  const { id } = paisIdParamSchema.parse(req.params)
  const input = paisUpdateSchema.parse(req.body)
  return reply.send(await service.actualizarPais(id, input, usuarioSesion(req)))
}

export async function deletePais(req: FastifyRequest, reply: FastifyReply) {
  const { id } = paisIdParamSchema.parse(req.params)
  await service.eliminarPais(id, usuarioSesion(req))
  return reply.status(204).send()
}
