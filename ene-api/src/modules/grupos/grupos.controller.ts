import type { FastifyRequest, FastifyReply } from 'fastify'
import * as service from './grupos.service.js'
import {
  grupoCreateSchema,
  grupoUpdateSchema,
  grupoIdParamSchema,
  grupoPasajeroParamSchema,
  grupoListQuerySchema,
  pasajeroInputSchema,
  pasajeroUpdateSchema,
} from './grupos.schema.js'

function usuarioSesion(req: FastifyRequest): string {
  return req.eneUsuarioId != null ? String(req.eneUsuarioId) : 'system'
}

export async function listGrupos(req: FastifyRequest, reply: FastifyReply) {
  const query = grupoListQuerySchema.parse(req.query)
  return reply.send(await service.listarGrupos(query.page, query.limit, { q: query.q, clienteId: query.clienteId }))
}

export async function getGrupoById(req: FastifyRequest, reply: FastifyReply) {
  const { id } = grupoIdParamSchema.parse(req.params)
  return reply.send(await service.obtenerGrupo(id))
}

export async function createGrupo(req: FastifyRequest, reply: FastifyReply) {
  const input = grupoCreateSchema.parse(req.body)
  return reply.status(201).send(await service.crearGrupo(input, usuarioSesion(req)))
}

export async function updateGrupo(req: FastifyRequest, reply: FastifyReply) {
  const { id } = grupoIdParamSchema.parse(req.params)
  const input = grupoUpdateSchema.parse(req.body)
  return reply.send(await service.actualizarGrupo(id, input, usuarioSesion(req)))
}

export async function deleteGrupo(req: FastifyRequest, reply: FastifyReply) {
  const { id } = grupoIdParamSchema.parse(req.params)
  await service.eliminarGrupo(id, usuarioSesion(req))
  return reply.status(204).send()
}

export async function createPasajero(req: FastifyRequest, reply: FastifyReply) {
  const { id } = grupoIdParamSchema.parse(req.params)
  const input = pasajeroInputSchema.parse(req.body)
  return reply.status(201).send(await service.crearPasajero(id, input, usuarioSesion(req)))
}

export async function updatePasajero(req: FastifyRequest, reply: FastifyReply) {
  const { id, pid } = grupoPasajeroParamSchema.parse(req.params)
  const input = pasajeroUpdateSchema.parse(req.body)
  return reply.send(await service.actualizarPasajero(id, pid, input, usuarioSesion(req)))
}

export async function deletePasajero(req: FastifyRequest, reply: FastifyReply) {
  const { id, pid } = grupoPasajeroParamSchema.parse(req.params)
  await service.eliminarPasajero(id, pid, usuarioSesion(req))
  return reply.status(204).send()
}
