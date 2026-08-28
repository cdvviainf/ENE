import type { FastifyRequest, FastifyReply } from 'fastify'
import * as service from './zonas.service.js'
import { zonaCreateSchema, zonaUpdateSchema, zonaIdParamSchema, zonaListQuerySchema } from './zonas.schema.js'

function usuarioSesion(req: FastifyRequest): string {
  return req.eneUsuarioId != null ? String(req.eneUsuarioId) : 'system'
}

export async function listZonas(req: FastifyRequest, reply: FastifyReply) {
  const query = zonaListQuerySchema.parse(req.query)
  return reply.send(await service.listarZonas(query.page, query.limit, query.q))
}

export async function getZonaById(req: FastifyRequest, reply: FastifyReply) {
  const { id } = zonaIdParamSchema.parse(req.params)
  return reply.send(await service.obtenerZona(id))
}

export async function createZona(req: FastifyRequest, reply: FastifyReply) {
  const input = zonaCreateSchema.parse(req.body)
  return reply.status(201).send(await service.crearZona(input, usuarioSesion(req)))
}

export async function updateZona(req: FastifyRequest, reply: FastifyReply) {
  const { id } = zonaIdParamSchema.parse(req.params)
  const input = zonaUpdateSchema.parse(req.body)
  return reply.send(await service.actualizarZona(id, input, usuarioSesion(req)))
}

export async function deleteZona(req: FastifyRequest, reply: FastifyReply) {
  const { id } = zonaIdParamSchema.parse(req.params)
  await service.eliminarZona(id, usuarioSesion(req))
  return reply.status(204).send()
}
