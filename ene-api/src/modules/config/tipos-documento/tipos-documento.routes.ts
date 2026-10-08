import type { FastifyInstance } from 'fastify'
import { requireAuth, requireLevel } from '../../../plugins/auth-guard.js'
import {
  listTiposDocumento,
  getTipoDocumentoById,
  createTipoDocumento,
  updateTipoDocumento,
  deleteTipoDocumento,
} from './tipos-documento.controller.js'

const ITEM = 'TIPOS_DOCUMENTO'

export async function tiposDocumentoRoutes(app: FastifyInstance) {
  app.get('/tipos-documento', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, listTiposDocumento)
  app.get('/tipos-documento/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, getTipoDocumentoById)
  app.post('/tipos-documento', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, createTipoDocumento)
  app.patch('/tipos-documento/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, updateTipoDocumento)
  app.delete('/tipos-documento/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, deleteTipoDocumento)
}
