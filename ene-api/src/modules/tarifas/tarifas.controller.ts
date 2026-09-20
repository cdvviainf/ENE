import type { FastifyRequest, FastifyReply } from 'fastify'
import * as service from './tarifas.service.js'
import {
  tarifarioCreateSchema,
  tarifarioNuevaVersionSchema,
  tarifarioIdParamSchema,
  tarifarioListQuerySchema,
} from './tarifas.schema.js'

function usuarioSesion(req: FastifyRequest): string {
  return req.eneUsuarioId != null ? String(req.eneUsuarioId) : 'system'
}

export async function listTarifarios(req: FastifyRequest, reply: FastifyReply) {
  const query = tarifarioListQuerySchema.parse(req.query)
  return reply.send(
    await service.listarTarifarios(query.page, query.limit, {
      proveedorId: query.proveedorId,
      servicioId: query.servicioId,
      vigenteA: query.vigenteA,
      soloActivos: query.soloActivos,
    }),
  )
}

export async function getTarifarioById(req: FastifyRequest, reply: FastifyReply) {
  const { id } = tarifarioIdParamSchema.parse(req.params)
  return reply.send(await service.obtenerTarifario(id))
}

export async function createTarifario(req: FastifyRequest, reply: FastifyReply) {
  const input = tarifarioCreateSchema.parse(req.body)
  return reply.status(201).send(await service.crearTarifario(input, usuarioSesion(req)))
}

export async function nuevaVersionTarifario(req: FastifyRequest, reply: FastifyReply) {
  const { id } = tarifarioIdParamSchema.parse(req.params)
  const input = tarifarioNuevaVersionSchema.parse(req.body)
  return reply.status(201).send(await service.crearNuevaVersion(id, input, usuarioSesion(req)))
}
