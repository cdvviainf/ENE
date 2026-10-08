import type { FastifyRequest, FastifyReply } from 'fastify'
import * as service from './tipos-documento.service.js'
import {
  tipoDocumentoCreateSchema,
  tipoDocumentoUpdateSchema,
  tipoDocumentoIdParamSchema,
  tipoDocumentoListQuerySchema,
} from './tipos-documento.schema.js'

function usuarioSesion(req: FastifyRequest): string {
  return req.eneUsuarioId != null ? String(req.eneUsuarioId) : 'system'
}

export async function listTiposDocumento(req: FastifyRequest, reply: FastifyReply) {
  const query = tipoDocumentoListQuerySchema.parse(req.query)
  return reply.send(await service.listarTiposDocumento(query.page, query.limit, query.q))
}

export async function getTipoDocumentoById(req: FastifyRequest, reply: FastifyReply) {
  const { id } = tipoDocumentoIdParamSchema.parse(req.params)
  return reply.send(await service.obtenerTipoDocumento(id))
}

export async function createTipoDocumento(req: FastifyRequest, reply: FastifyReply) {
  const input = tipoDocumentoCreateSchema.parse(req.body)
  return reply.status(201).send(await service.crearTipoDocumento(input, usuarioSesion(req)))
}

export async function updateTipoDocumento(req: FastifyRequest, reply: FastifyReply) {
  const { id } = tipoDocumentoIdParamSchema.parse(req.params)
  const input = tipoDocumentoUpdateSchema.parse(req.body)
  return reply.send(await service.actualizarTipoDocumento(id, input, usuarioSesion(req)))
}

export async function deleteTipoDocumento(req: FastifyRequest, reply: FastifyReply) {
  const { id } = tipoDocumentoIdParamSchema.parse(req.params)
  await service.eliminarTipoDocumento(id, usuarioSesion(req))
  return reply.status(204).send()
}
