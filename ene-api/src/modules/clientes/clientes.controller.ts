import type { FastifyRequest, FastifyReply } from 'fastify'
import * as service from './clientes.service.js'
import {
  clienteCreateSchema,
  clienteUpdateSchema,
  clienteIdParamSchema,
  clienteEjecutivoParamSchema,
  clienteDireccionParamSchema,
  clienteListQuerySchema,
  ejecutivoInputSchema,
  ejecutivoUpdateSchema,
  direccionInputSchema,
  direccionUpdateSchema,
} from './clientes.schema.js'

function usuarioSesion(req: FastifyRequest): string {
  return req.eneUsuarioId != null ? String(req.eneUsuarioId) : 'system'
}

export async function listClientes(req: FastifyRequest, reply: FastifyReply) {
  const query = clienteListQuerySchema.parse(req.query)
  return reply.send(
    await service.listarClientes(query.page, query.limit, {
      q: query.q,
      tipo: query.tipo,
      paisId: query.paisId,
      monedaHabitual: query.monedaHabitual,
    }),
  )
}

export async function getClienteById(req: FastifyRequest, reply: FastifyReply) {
  const { id } = clienteIdParamSchema.parse(req.params)
  return reply.send(await service.obtenerClienteConEstado(id))
}

export async function createCliente(req: FastifyRequest, reply: FastifyReply) {
  const input = clienteCreateSchema.parse(req.body)
  return reply.status(201).send(await service.crearCliente(input, usuarioSesion(req)))
}

export async function updateCliente(req: FastifyRequest, reply: FastifyReply) {
  const { id } = clienteIdParamSchema.parse(req.params)
  const input = clienteUpdateSchema.parse(req.body)
  return reply.send(await service.actualizarCliente(id, input, usuarioSesion(req)))
}

export async function deleteCliente(req: FastifyRequest, reply: FastifyReply) {
  const { id } = clienteIdParamSchema.parse(req.params)
  await service.eliminarCliente(id, usuarioSesion(req))
  return reply.status(204).send()
}

export async function createEjecutivo(req: FastifyRequest, reply: FastifyReply) {
  const { id } = clienteIdParamSchema.parse(req.params)
  const input = ejecutivoInputSchema.parse(req.body)
  return reply.status(201).send(await service.crearEjecutivo(id, input, usuarioSesion(req)))
}

export async function updateEjecutivo(req: FastifyRequest, reply: FastifyReply) {
  const { id, eid } = clienteEjecutivoParamSchema.parse(req.params)
  const input = ejecutivoUpdateSchema.parse(req.body)
  return reply.send(await service.actualizarEjecutivo(id, eid, input, usuarioSesion(req)))
}

export async function deleteEjecutivo(req: FastifyRequest, reply: FastifyReply) {
  const { id, eid } = clienteEjecutivoParamSchema.parse(req.params)
  await service.eliminarEjecutivo(id, eid, usuarioSesion(req))
  return reply.status(204).send()
}

export async function createDireccion(req: FastifyRequest, reply: FastifyReply) {
  const { id } = clienteIdParamSchema.parse(req.params)
  const input = direccionInputSchema.parse(req.body)
  return reply.status(201).send(await service.crearDireccion(id, input, usuarioSesion(req)))
}

export async function updateDireccion(req: FastifyRequest, reply: FastifyReply) {
  const { id, did } = clienteDireccionParamSchema.parse(req.params)
  const input = direccionUpdateSchema.parse(req.body)
  return reply.send(await service.actualizarDireccion(id, did, input, usuarioSesion(req)))
}

export async function deleteDireccion(req: FastifyRequest, reply: FastifyReply) {
  const { id, did } = clienteDireccionParamSchema.parse(req.params)
  await service.eliminarDireccion(id, did, usuarioSesion(req))
  return reply.status(204).send()
}
