import type { FastifyRequest, FastifyReply } from 'fastify'
import * as service from './servicios.service.js'
import {
  servicioCreateSchema,
  servicioUpdateSchema,
  servicioIdParamSchema,
  servicioListQuerySchema,
} from './servicios.schema.js'

function usuarioSesion(req: FastifyRequest): string {
  return req.eneUsuarioId != null ? String(req.eneUsuarioId) : 'system'
}

export async function listServicios(req: FastifyRequest, reply: FastifyReply) {
  const query = servicioListQuerySchema.parse(req.query)
  return reply.send(
    await service.listarServicios(query.page, query.limit, {
      q: query.q,
      zonaId: query.zonaId,
      tipoServicioId: query.tipoServicioId,
      modeloTarifa: query.modeloTarifa,
    }),
  )
}

export async function getServicioById(req: FastifyRequest, reply: FastifyReply) {
  const { id } = servicioIdParamSchema.parse(req.params)
  return reply.send(await service.obtenerServicio(id))
}

export async function createServicio(req: FastifyRequest, reply: FastifyReply) {
  const input = servicioCreateSchema.parse(req.body)
  return reply.status(201).send(await service.crearServicio(input, usuarioSesion(req)))
}

export async function updateServicio(req: FastifyRequest, reply: FastifyReply) {
  const { id } = servicioIdParamSchema.parse(req.params)
  const input = servicioUpdateSchema.parse(req.body)
  return reply.send(await service.actualizarServicio(id, input, usuarioSesion(req)))
}

export async function deleteServicio(req: FastifyRequest, reply: FastifyReply) {
  const { id } = servicioIdParamSchema.parse(req.params)
  await service.eliminarServicio(id, usuarioSesion(req))
  return reply.status(204).send()
}
