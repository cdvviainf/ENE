import type { FastifyRequest, FastifyReply } from 'fastify'
import * as service from './proveedores.service.js'
import {
  proveedorCreateSchema,
  proveedorUpdateSchema,
  proveedorIdParamSchema,
  proveedorSubrecursoParamSchema,
  proveedorListQuerySchema,
  aliasInputSchema,
  cuentaInputSchema,
  cuentaUpdateSchema,
  contactoInputSchema,
  contactoUpdateSchema,
  direccionInputSchema,
  direccionUpdateSchema,
} from './proveedores.schema.js'

function usuarioSesion(req: FastifyRequest): string {
  return req.eneUsuarioId != null ? String(req.eneUsuarioId) : 'system'
}

export async function listProveedores(req: FastifyRequest, reply: FastifyReply) {
  const query = proveedorListQuerySchema.parse(req.query)
  return reply.send(
    await service.listarProveedores(query.page, query.limit, {
      q: query.q,
      tipoServicioId: query.tipoServicioId,
      zonaId: query.zonaId,
    }),
  )
}

export async function getProveedorById(req: FastifyRequest, reply: FastifyReply) {
  const { id } = proveedorIdParamSchema.parse(req.params)
  return reply.send(await service.obtenerProveedor(id))
}

export async function createProveedor(req: FastifyRequest, reply: FastifyReply) {
  const input = proveedorCreateSchema.parse(req.body)
  return reply.status(201).send(await service.crearProveedor(input, usuarioSesion(req)))
}

export async function updateProveedor(req: FastifyRequest, reply: FastifyReply) {
  const { id } = proveedorIdParamSchema.parse(req.params)
  const input = proveedorUpdateSchema.parse(req.body)
  return reply.send(await service.actualizarProveedor(id, input, usuarioSesion(req)))
}

export async function deleteProveedor(req: FastifyRequest, reply: FastifyReply) {
  const { id } = proveedorIdParamSchema.parse(req.params)
  await service.eliminarProveedor(id, usuarioSesion(req))
  return reply.status(204).send()
}

export async function createAlias(req: FastifyRequest, reply: FastifyReply) {
  const { id } = proveedorIdParamSchema.parse(req.params)
  const input = aliasInputSchema.parse(req.body)
  return reply.status(201).send(await service.crearAlias(id, input, usuarioSesion(req)))
}

export async function deleteAlias(req: FastifyRequest, reply: FastifyReply) {
  const { id, sid } = proveedorSubrecursoParamSchema.parse(req.params)
  await service.eliminarAlias(id, sid, usuarioSesion(req))
  return reply.status(204).send()
}

export async function createCuenta(req: FastifyRequest, reply: FastifyReply) {
  const { id } = proveedorIdParamSchema.parse(req.params)
  const input = cuentaInputSchema.parse(req.body)
  return reply.status(201).send(await service.crearCuenta(id, input, usuarioSesion(req)))
}

export async function updateCuenta(req: FastifyRequest, reply: FastifyReply) {
  const { id, sid } = proveedorSubrecursoParamSchema.parse(req.params)
  const input = cuentaUpdateSchema.parse(req.body)
  return reply.send(await service.actualizarCuenta(id, sid, input, usuarioSesion(req)))
}

export async function deleteCuenta(req: FastifyRequest, reply: FastifyReply) {
  const { id, sid } = proveedorSubrecursoParamSchema.parse(req.params)
  await service.eliminarCuenta(id, sid, usuarioSesion(req))
  return reply.status(204).send()
}

export async function createContacto(req: FastifyRequest, reply: FastifyReply) {
  const { id } = proveedorIdParamSchema.parse(req.params)
  const input = contactoInputSchema.parse(req.body)
  return reply.status(201).send(await service.crearContacto(id, input, usuarioSesion(req)))
}

export async function updateContacto(req: FastifyRequest, reply: FastifyReply) {
  const { id, sid } = proveedorSubrecursoParamSchema.parse(req.params)
  const input = contactoUpdateSchema.parse(req.body)
  return reply.send(await service.actualizarContacto(id, sid, input, usuarioSesion(req)))
}

export async function deleteContacto(req: FastifyRequest, reply: FastifyReply) {
  const { id, sid } = proveedorSubrecursoParamSchema.parse(req.params)
  await service.eliminarContacto(id, sid, usuarioSesion(req))
  return reply.status(204).send()
}

export async function createDireccion(req: FastifyRequest, reply: FastifyReply) {
  const { id } = proveedorIdParamSchema.parse(req.params)
  const input = direccionInputSchema.parse(req.body)
  return reply.status(201).send(await service.crearDireccion(id, input, usuarioSesion(req)))
}

export async function updateDireccion(req: FastifyRequest, reply: FastifyReply) {
  const { id, sid } = proveedorSubrecursoParamSchema.parse(req.params)
  const input = direccionUpdateSchema.parse(req.body)
  return reply.send(await service.actualizarDireccion(id, sid, input, usuarioSesion(req)))
}

export async function deleteDireccion(req: FastifyRequest, reply: FastifyReply) {
  const { id, sid } = proveedorSubrecursoParamSchema.parse(req.params)
  await service.eliminarDireccion(id, sid, usuarioSesion(req))
  return reply.status(204).send()
}
