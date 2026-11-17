import type { FastifyRequest, FastifyReply } from 'fastify'
import * as service from './tarifas-venta.service.js'
import {
  serviciosConTarifaQuerySchema,
  tarifasVentaListQuerySchema,
  tarifaVentaCambioSchema,
  tarifaVentaCreateSchema,
  tarifaVentaIdParamSchema,
} from './tarifas-venta.schema.js'

function usuarioSesion(req: FastifyRequest): string {
  return req.eneUsuarioId != null ? String(req.eneUsuarioId) : 'system'
}

export async function listServiciosConTarifa(req: FastifyRequest, reply: FastifyReply) {
  return reply.send(await service.listarServiciosConTarifa(serviciosConTarifaQuerySchema.parse(req.query)))
}

export async function listTarifasDeServicio(req: FastifyRequest, reply: FastifyReply) {
  const { servicioId } = tarifasVentaListQuerySchema.parse(req.query)
  return reply.send(await service.listarTarifasDeServicio(servicioId))
}

export async function getTarifaVenta(req: FastifyRequest, reply: FastifyReply) {
  const { id } = tarifaVentaIdParamSchema.parse(req.params)
  return reply.send(await service.obtenerTarifaVenta(id))
}

export async function createTarifaVenta(req: FastifyRequest, reply: FastifyReply) {
  const input = tarifaVentaCreateSchema.parse(req.body)
  return reply.status(201).send(await service.crearTarifaVenta(input, usuarioSesion(req)))
}

export async function nuevaVersionTarifaVenta(req: FastifyRequest, reply: FastifyReply) {
  const { id } = tarifaVentaIdParamSchema.parse(req.params)
  const input = tarifaVentaCambioSchema.parse(req.body)
  return reply.status(201).send(await service.crearNuevaVersion(id, input, usuarioSesion(req)))
}

export async function editarTarifaVenta(req: FastifyRequest, reply: FastifyReply) {
  const { id } = tarifaVentaIdParamSchema.parse(req.params)
  const input = tarifaVentaCambioSchema.parse(req.body)
  return reply.send(await service.editarTarifaVenta(id, input, usuarioSesion(req)))
}
