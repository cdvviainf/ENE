import type { FastifyRequest, FastifyReply } from 'fastify'
import * as service from './tipos-servicio.service.js'
import {
  tipoServicioCreateSchema,
  tipoServicioUpdateSchema,
  tipoServicioIdParamSchema,
  tipoServicioListQuerySchema,
} from './tipos-servicio.schema.js'

function usuarioSesion(req: FastifyRequest): string {
  return req.eneUsuarioId != null ? String(req.eneUsuarioId) : 'system'
}

export async function listTiposServicio(req: FastifyRequest, reply: FastifyReply) {
  const query = tipoServicioListQuerySchema.parse(req.query)
  return reply.send(await service.listarTiposServicio(query.page, query.limit, query.q))
}

export async function getTipoServicioById(req: FastifyRequest, reply: FastifyReply) {
  const { id } = tipoServicioIdParamSchema.parse(req.params)
  return reply.send(await service.obtenerTipoServicio(id))
}

export async function createTipoServicio(req: FastifyRequest, reply: FastifyReply) {
  const input = tipoServicioCreateSchema.parse(req.body)
  return reply.status(201).send(await service.crearTipoServicio(input, usuarioSesion(req)))
}

export async function updateTipoServicio(req: FastifyRequest, reply: FastifyReply) {
  const { id } = tipoServicioIdParamSchema.parse(req.params)
  const input = tipoServicioUpdateSchema.parse(req.body)
  return reply.send(await service.actualizarTipoServicio(id, input, usuarioSesion(req)))
}

export async function deleteTipoServicio(req: FastifyRequest, reply: FastifyReply) {
  const { id } = tipoServicioIdParamSchema.parse(req.params)
  await service.eliminarTipoServicio(id, usuarioSesion(req))
  return reply.status(204).send()
}
