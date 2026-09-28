import type { FastifyRequest, FastifyReply } from 'fastify'
import * as service from './cotizaciones.service.js'
import {
  cotizacionCreateSchema,
  cotizacionListQuerySchema,
  itinerarioSchema,
  nuevaVersionSchema,
  recalcularPaxSchema,
  aplicarPaxSchema,
  cambioEstadoSchema,
  idParamSchema,
  versionParamSchema,
} from './cotizaciones.schema.js'

function usuarioSesion(req: FastifyRequest): string {
  return req.eneUsuarioId != null ? String(req.eneUsuarioId) : 'system'
}

export async function listCotizaciones(req: FastifyRequest, reply: FastifyReply) {
  const query = cotizacionListQuerySchema.parse(req.query)
  return reply.send(
    await service.listarCotizaciones(query.page, query.limit, {
      estado: query.estado,
      clienteId: query.clienteId,
      q: query.q,
    }),
  )
}

export async function getCotizacion(req: FastifyRequest, reply: FastifyReply) {
  const { id } = idParamSchema.parse(req.params)
  return reply.send(await service.obtenerCotizacion(id))
}

export async function createCotizacion(req: FastifyRequest, reply: FastifyReply) {
  const input = cotizacionCreateSchema.parse(req.body)
  return reply.status(201).send(await service.crearCotizacion(input, usuarioSesion(req)))
}

export async function putItinerario(req: FastifyRequest, reply: FastifyReply) {
  const { id } = idParamSchema.parse(req.params)
  const input = itinerarioSchema.parse(req.body)
  return reply.send(await service.guardarItinerario(id, input, usuarioSesion(req)))
}

export async function postVersion(req: FastifyRequest, reply: FastifyReply) {
  const { id } = idParamSchema.parse(req.params)
  const input = nuevaVersionSchema.parse(req.body)
  return reply.status(201).send(await service.crearNuevaVersion(id, input, usuarioSesion(req)))
}

export async function listVersiones(req: FastifyRequest, reply: FastifyReply) {
  const { id } = idParamSchema.parse(req.params)
  return reply.send(await service.listarVersiones(id))
}

export async function getVersion(req: FastifyRequest, reply: FastifyReply) {
  const { id, version } = versionParamSchema.parse(req.params)
  return reply.send(await service.obtenerVersion(id, version))
}

export async function postRecalcularPax(req: FastifyRequest, reply: FastifyReply) {
  const { id } = idParamSchema.parse(req.params)
  const { cantidadPax } = recalcularPaxSchema.parse(req.body)
  return reply.send(await service.previewRecalcularPax(id, cantidadPax))
}

export async function patchCantidadPax(req: FastifyRequest, reply: FastifyReply) {
  const { id } = idParamSchema.parse(req.params)
  const { cantidadPax, motivo } = aplicarPaxSchema.parse(req.body)
  return reply.send(await service.aplicarRecalculoPax(id, cantidadPax, motivo, usuarioSesion(req)))
}

export async function patchEstado(req: FastifyRequest, reply: FastifyReply) {
  const { id } = idParamSchema.parse(req.params)
  const { estado } = cambioEstadoSchema.parse(req.body)
  return reply.send(await service.cambiarEstado(id, estado, usuarioSesion(req)))
}

export async function postAprobar(req: FastifyRequest, reply: FastifyReply) {
  const { id } = idParamSchema.parse(req.params)
  return reply.send(await service.aprobar(id, usuarioSesion(req)))
}
