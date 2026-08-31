import type { FastifyRequest, FastifyReply } from 'fastify'
import * as service from './provincias.service.js'
import {
  provinciaCreateSchema,
  provinciaUpdateSchema,
  provinciaIdParamSchema,
  provinciaListQuerySchema,
} from './provincias.schema.js'

function usuarioSesion(req: FastifyRequest): string {
  return req.eneUsuarioId != null ? String(req.eneUsuarioId) : 'system'
}

export async function listProvincias(req: FastifyRequest, reply: FastifyReply) {
  const query = provinciaListQuerySchema.parse(req.query)
  return reply.send(await service.listarProvincias(query.page, query.limit, query.q, query.regionId))
}

export async function getProvinciaById(req: FastifyRequest, reply: FastifyReply) {
  const { id } = provinciaIdParamSchema.parse(req.params)
  return reply.send(await service.obtenerProvincia(id))
}

export async function createProvincia(req: FastifyRequest, reply: FastifyReply) {
  const input = provinciaCreateSchema.parse(req.body)
  return reply.status(201).send(await service.crearProvincia(input, usuarioSesion(req)))
}

export async function updateProvincia(req: FastifyRequest, reply: FastifyReply) {
  const { id } = provinciaIdParamSchema.parse(req.params)
  const input = provinciaUpdateSchema.parse(req.body)
  return reply.send(await service.actualizarProvincia(id, input, usuarioSesion(req)))
}

export async function deleteProvincia(req: FastifyRequest, reply: FastifyReply) {
  const { id } = provinciaIdParamSchema.parse(req.params)
  await service.eliminarProvincia(id, usuarioSesion(req))
  return reply.status(204).send()
}
