import type { FastifyRequest, FastifyReply } from 'fastify'
import * as service from './negocios.service.js'
import {
  negocioCreateSchema,
  negocioUpdateSchema,
  negocioIdParamSchema,
  negocioPasajeroParamSchema,
  negocioListQuerySchema,
  pasajeroInputSchema,
  pasajeroUpdateSchema,
} from './negocios.schema.js'

function usuarioSesion(req: FastifyRequest): string {
  return req.eneUsuarioId != null ? String(req.eneUsuarioId) : 'system'
}

export async function listNegocios(req: FastifyRequest, reply: FastifyReply) {
  const query = negocioListQuerySchema.parse(req.query)
  return reply.send(await service.listarNegocios(query.page, query.limit, { q: query.q, clienteId: query.clienteId }))
}

export async function getNegocioById(req: FastifyRequest, reply: FastifyReply) {
  const { id } = negocioIdParamSchema.parse(req.params)
  return reply.send(await service.obtenerNegocio(id))
}

export async function createNegocio(req: FastifyRequest, reply: FastifyReply) {
  const input = negocioCreateSchema.parse(req.body)
  return reply.status(201).send(await service.crearNegocio(input, usuarioSesion(req)))
}

export async function updateNegocio(req: FastifyRequest, reply: FastifyReply) {
  const { id } = negocioIdParamSchema.parse(req.params)
  const input = negocioUpdateSchema.parse(req.body)
  return reply.send(await service.actualizarNegocio(id, input, usuarioSesion(req)))
}

export async function deleteNegocio(req: FastifyRequest, reply: FastifyReply) {
  const { id } = negocioIdParamSchema.parse(req.params)
  await service.eliminarNegocio(id, usuarioSesion(req))
  return reply.status(204).send()
}

export async function createPasajero(req: FastifyRequest, reply: FastifyReply) {
  const { id } = negocioIdParamSchema.parse(req.params)
  const input = pasajeroInputSchema.parse(req.body)
  return reply.status(201).send(await service.crearPasajero(id, input, usuarioSesion(req)))
}

export async function updatePasajero(req: FastifyRequest, reply: FastifyReply) {
  const { id, pid } = negocioPasajeroParamSchema.parse(req.params)
  const input = pasajeroUpdateSchema.parse(req.body)
  return reply.send(await service.actualizarPasajero(id, pid, input, usuarioSesion(req)))
}

export async function deletePasajero(req: FastifyRequest, reply: FastifyReply) {
  const { id, pid } = negocioPasajeroParamSchema.parse(req.params)
  await service.eliminarPasajero(id, pid, usuarioSesion(req))
  return reply.status(204).send()
}
