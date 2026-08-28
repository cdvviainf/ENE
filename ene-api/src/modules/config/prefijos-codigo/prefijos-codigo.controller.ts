import type { FastifyRequest, FastifyReply } from 'fastify'
import * as service from './prefijos-codigo.service.js'
import {
  prefijoCodigoUpdateSchema,
  prefijoCodigoIdParamSchema,
  prefijoCodigoEntidadParamSchema,
} from './prefijos-codigo.schema.js'

function usuarioSesion(req: FastifyRequest): string {
  return req.eneUsuarioId != null ? String(req.eneUsuarioId) : 'system'
}

export async function listPrefijos(_req: FastifyRequest, reply: FastifyReply) {
  return reply.send(await service.listarPrefijos())
}

export async function getPrefijoById(req: FastifyRequest, reply: FastifyReply) {
  const { id } = prefijoCodigoIdParamSchema.parse(req.params)
  return reply.send(await service.obtenerPrefijo(id))
}

export async function updatePrefijo(req: FastifyRequest, reply: FastifyReply) {
  const { id } = prefijoCodigoIdParamSchema.parse(req.params)
  const input = prefijoCodigoUpdateSchema.parse(req.body)
  return reply.send(await service.actualizarPrefijo(id, input, usuarioSesion(req)))
}

export async function getSiguienteCodigo(req: FastifyRequest, reply: FastifyReply) {
  const { entidad } = prefijoCodigoEntidadParamSchema.parse(req.params)
  return reply.send(await service.obtenerSiguienteCodigo(entidad))
}
