import type { FastifyRequest, FastifyReply } from 'fastify'
import * as service from './formas-pago.service.js'
import {
  formaPagoCreateSchema,
  formaPagoUpdateSchema,
  formaPagoIdParamSchema,
  formaPagoListQuerySchema,
} from './formas-pago.schema.js'

function usuarioSesion(req: FastifyRequest): string {
  return req.eneUsuarioId != null ? String(req.eneUsuarioId) : 'system'
}

export async function listFormasPago(req: FastifyRequest, reply: FastifyReply) {
  const query = formaPagoListQuerySchema.parse(req.query)
  return reply.send(await service.listarFormasPago(query.page, query.limit, query.q))
}

export async function getFormaPagoById(req: FastifyRequest, reply: FastifyReply) {
  const { id } = formaPagoIdParamSchema.parse(req.params)
  return reply.send(await service.obtenerFormaPago(id))
}

export async function createFormaPago(req: FastifyRequest, reply: FastifyReply) {
  const input = formaPagoCreateSchema.parse(req.body)
  return reply.status(201).send(await service.crearFormaPago(input, usuarioSesion(req)))
}

export async function updateFormaPago(req: FastifyRequest, reply: FastifyReply) {
  const { id } = formaPagoIdParamSchema.parse(req.params)
  const input = formaPagoUpdateSchema.parse(req.body)
  return reply.send(await service.actualizarFormaPago(id, input, usuarioSesion(req)))
}

export async function deleteFormaPago(req: FastifyRequest, reply: FastifyReply) {
  const { id } = formaPagoIdParamSchema.parse(req.params)
  await service.eliminarFormaPago(id, usuarioSesion(req))
  return reply.status(204).send()
}
