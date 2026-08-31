import type { FastifyRequest, FastifyReply } from 'fastify'
import * as service from './condiciones-pago.service.js'
import {
  condicionPagoCreateSchema,
  condicionPagoUpdateSchema,
  condicionPagoIdParamSchema,
  condicionPagoListQuerySchema,
} from './condiciones-pago.schema.js'

function usuarioSesion(req: FastifyRequest): string {
  return req.eneUsuarioId != null ? String(req.eneUsuarioId) : 'system'
}

export async function listCondicionesPago(req: FastifyRequest, reply: FastifyReply) {
  const query = condicionPagoListQuerySchema.parse(req.query)
  return reply.send(await service.listarCondicionesPago(query.page, query.limit, query.q))
}

export async function getCondicionPagoById(req: FastifyRequest, reply: FastifyReply) {
  const { id } = condicionPagoIdParamSchema.parse(req.params)
  return reply.send(await service.obtenerCondicionPago(id))
}

export async function createCondicionPago(req: FastifyRequest, reply: FastifyReply) {
  const input = condicionPagoCreateSchema.parse(req.body)
  return reply.status(201).send(await service.crearCondicionPago(input, usuarioSesion(req)))
}

export async function updateCondicionPago(req: FastifyRequest, reply: FastifyReply) {
  const { id } = condicionPagoIdParamSchema.parse(req.params)
  const input = condicionPagoUpdateSchema.parse(req.body)
  return reply.send(await service.actualizarCondicionPago(id, input, usuarioSesion(req)))
}

export async function deleteCondicionPago(req: FastifyRequest, reply: FastifyReply) {
  const { id } = condicionPagoIdParamSchema.parse(req.params)
  await service.eliminarCondicionPago(id, usuarioSesion(req))
  return reply.status(204).send()
}
