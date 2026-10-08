import type { FastifyRequest, FastifyReply } from 'fastify'
import { validacion } from '../../../shared/errors.js'
import * as service from './empresa.service.js'
import { empresaUpdateSchema } from './empresa.schema.js'

function usuarioSesion(req: FastifyRequest): string {
  return req.eneUsuarioId != null ? String(req.eneUsuarioId) : 'system'
}

export async function getEmpresa(req: FastifyRequest, reply: FastifyReply) {
  return reply.send(await service.obtenerEmpresa(usuarioSesion(req)))
}

export async function updateEmpresa(req: FastifyRequest, reply: FastifyReply) {
  const input = empresaUpdateSchema.parse(req.body)
  return reply.send(await service.actualizarEmpresa(input, usuarioSesion(req)))
}

export async function uploadLogo(req: FastifyRequest, reply: FastifyReply) {
  const archivo = await req.file()
  if (!archivo) throw validacion('No se recibió ningún archivo')
  const buffer = await archivo.toBuffer()
  const empresa = await service.guardarLogo(buffer, archivo.mimetype, usuarioSesion(req))
  return reply.send(empresa)
}

export async function getLogo(_req: FastifyRequest, reply: FastifyReply) {
  const { buffer, mimeType } = await service.obtenerLogo()
  return reply.header('Content-Type', mimeType).header('Cache-Control', 'no-cache').send(buffer)
}
