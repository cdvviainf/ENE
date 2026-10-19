import type { FastifyRequest, FastifyReply } from 'fastify'
import * as service from './adjuntos.service.js'
import { validacion } from '../../shared/errors.js'
import { adjuntoCrearSchema, adjuntoListQuerySchema, idParamSchema } from './adjuntos.schema.js'

function usuarioSesion(req: FastifyRequest): string {
  return req.eneUsuarioId != null ? String(req.eneUsuarioId) : 'system'
}

export async function postAdjunto(req: FastifyRequest, reply: FastifyReply) {
  // Contrato multipart: los campos `entidad` y `entidadId` van ANTES del archivo
  // para que queden disponibles en `data.fields` al llegar al stream del archivo.
  const data = await req.file()
  if (!data) throw validacion('No se recibió ningún archivo (campo de archivo faltante).')

  const { entidad, entidadId } = adjuntoCrearSchema.parse({
    entidad: (data.fields.entidad as { value?: unknown } | undefined)?.value,
    entidadId: (data.fields.entidadId as { value?: unknown } | undefined)?.value,
  })

  const buffer = await data.toBuffer()
  const adjunto = await service.subirAdjunto(
    { entidad, entidadId, nombreArchivo: data.filename, mimeType: data.mimetype, buffer },
    req.eneAccesos,
    usuarioSesion(req),
  )
  return reply.status(201).send(adjunto)
}

export async function getAdjuntos(req: FastifyRequest, reply: FastifyReply) {
  const { entidad, entidadId } = adjuntoListQuerySchema.parse(req.query)
  return reply.send(await service.listarAdjuntos(entidad, entidadId, req.eneAccesos))
}

export async function descargarAdjunto(req: FastifyRequest, reply: FastifyReply) {
  const { id } = idParamSchema.parse(req.params)
  const { nombreArchivo, mimeType, buffer } = await service.descargarAdjunto(id, req.eneAccesos)
  reply.header('Content-Type', mimeType)
  reply.header('Content-Disposition', `attachment; filename="${encodeURIComponent(nombreArchivo)}"`)
  return reply.send(buffer)
}

export async function deleteAdjunto(req: FastifyRequest, reply: FastifyReply) {
  const { id } = idParamSchema.parse(req.params)
  await service.eliminarAdjunto(id, req.eneAccesos, usuarioSesion(req))
  return reply.status(204).send()
}
