import type { FastifyRequest, FastifyReply } from 'fastify'
import type { NivelAcceso } from '@prisma/client'
import { noAutorizado, noEncontrado } from '../../shared/errors.js'
import * as service from './documentos.service.js'
import { getDocumentDefinition } from './documentos.registry.js'
import { previewQuerySchema, emitirBodySchema } from './documentos.schema.js'

// El permiso depende del `tipo` del documento (cada entrada del registro
// declara su itemMenu, CLAUDE.md §8) — no se resuelve estáticamente como en las
// demás rutas. LECTURA habilita preview y descarga; ninguna de las dos muta
// datos, así que ambas piden LECTURA (la creación/edición de cotizaciones vive
// en su propio módulo con TOTAL).
function exigirNivelDocumento(req: FastifyRequest, tipo: string): void {
  const def = getDocumentDefinition(tipo)
  if (!def) throw noEncontrado('Tipo de documento', tipo)
  const items = Array.isArray(def.itemMenu) ? def.itemMenu : [def.itemMenu]
  const permitido = items.some((codigo) => {
    const nivel: NivelAcceso = req.eneAccesos?.get(codigo) ?? 'SIN_ACCESO'
    return nivel !== 'SIN_ACCESO'
  })
  if (!permitido) throw noAutorizado('No tiene acceso a este documento')
}

export async function preview(req: FastifyRequest, reply: FastifyReply) {
  const q = previewQuerySchema.parse(req.query)
  exigirNivelDocumento(req, q.tipo)
  const html = await service.obtenerPreviewHtml(q.tipo, q.id, { idioma: q.idioma, modalidad: q.modalidad })
  return reply.type('text/html; charset=utf-8').send(html)
}

export async function emitir(req: FastifyRequest, reply: FastifyReply) {
  const b = emitirBodySchema.parse(req.body)
  exigirNivelDocumento(req, b.tipo)
  const { buffer, nombreArchivo } = await service.obtenerPdf(b.tipo, b.documentoId, { idioma: b.idioma, modalidad: b.modalidad })
  return reply
    .type('application/pdf')
    .header('Content-Disposition', `attachment; filename="${nombreArchivo}"`)
    .send(buffer)
}
