import type { FastifyRequest, FastifyReply } from 'fastify'
import * as service from './indicadores.service.js'
import { indicadoresUpdateSchema } from './indicadores.schema.js'

function usuarioSesion(req: FastifyRequest): string {
  return req.eneUsuarioId != null ? String(req.eneUsuarioId) : 'system'
}

export async function getIndicadores(req: FastifyRequest, reply: FastifyReply) {
  return reply.send(await service.obtenerIndicadores(usuarioSesion(req)))
}

export async function updateIndicadores(req: FastifyRequest, reply: FastifyReply) {
  const input = indicadoresUpdateSchema.parse(req.body)
  return reply.send(await service.actualizarIndicadores(input, usuarioSesion(req)))
}
