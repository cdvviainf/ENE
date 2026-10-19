import type { FastifyRequest, FastifyReply } from 'fastify'
import * as service from './ordenes-trabajo.service.js'
import {
  ordenTrabajoListQuerySchema,
  idParamSchema,
  lineaParamSchema,
  versionParamSchema,
  cambioEstadoSchema,
  estadoServicioSchema,
  nuevaVersionSchema,
} from './ordenes-trabajo.schema.js'

function usuarioSesion(req: FastifyRequest): string {
  return req.eneUsuarioId != null ? String(req.eneUsuarioId) : 'system'
}

export async function listOrdenes(req: FastifyRequest, reply: FastifyReply) {
  const query = ordenTrabajoListQuerySchema.parse(req.query)
  return reply.send(
    await service.listarOrdenes(query.page, query.limit, {
      estado: query.estado,
      desde: query.desde,
      hasta: query.hasta,
      q: query.q,
    }),
  )
}

export async function getOrden(req: FastifyRequest, reply: FastifyReply) {
  const { id } = idParamSchema.parse(req.params)
  return reply.send(await service.obtenerOrden(id))
}

export async function getVersion(req: FastifyRequest, reply: FastifyReply) {
  const { id, version } = versionParamSchema.parse(req.params)
  return reply.send(await service.obtenerVersionHistorica(id, version))
}

export async function patchEstado(req: FastifyRequest, reply: FastifyReply) {
  const { id } = idParamSchema.parse(req.params)
  const { estado } = cambioEstadoSchema.parse(req.body)
  return reply.send(await service.cambiarEstado(id, estado, usuarioSesion(req)))
}

export async function patchEstadoServicio(req: FastifyRequest, reply: FastifyReply) {
  const { id, lid } = lineaParamSchema.parse(req.params)
  const { estadoServicio } = estadoServicioSchema.parse(req.body)
  return reply.send(await service.cambiarEstadoServicio(id, lid, estadoServicio, usuarioSesion(req)))
}

export async function postVersion(req: FastifyRequest, reply: FastifyReply) {
  const { id } = idParamSchema.parse(req.params)
  const input = nuevaVersionSchema.parse(req.body)
  return reply.send(await service.crearNuevaVersion(id, input, usuarioSesion(req)))
}
