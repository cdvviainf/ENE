import type { FastifyRequest, FastifyReply } from 'fastify'
import * as service from './regiones.service.js'
import { regionCreateSchema, regionUpdateSchema, regionIdParamSchema, regionListQuerySchema } from './regiones.schema.js'

function usuarioSesion(req: FastifyRequest): string {
  return req.eneUsuarioId != null ? String(req.eneUsuarioId) : 'system'
}

export async function listRegiones(req: FastifyRequest, reply: FastifyReply) {
  const query = regionListQuerySchema.parse(req.query)
  return reply.send(await service.listarRegiones(query.page, query.limit, query.q))
}

export async function getRegionById(req: FastifyRequest, reply: FastifyReply) {
  const { id } = regionIdParamSchema.parse(req.params)
  return reply.send(await service.obtenerRegion(id))
}

export async function createRegion(req: FastifyRequest, reply: FastifyReply) {
  const input = regionCreateSchema.parse(req.body)
  return reply.status(201).send(await service.crearRegion(input, usuarioSesion(req)))
}

export async function updateRegion(req: FastifyRequest, reply: FastifyReply) {
  const { id } = regionIdParamSchema.parse(req.params)
  const input = regionUpdateSchema.parse(req.body)
  return reply.send(await service.actualizarRegion(id, input, usuarioSesion(req)))
}

export async function deleteRegion(req: FastifyRequest, reply: FastifyReply) {
  const { id } = regionIdParamSchema.parse(req.params)
  await service.eliminarRegion(id, usuarioSesion(req))
  return reply.status(204).send()
}
