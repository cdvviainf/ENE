import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../plugins/auth-guard.js'
import * as ctrl from './documentos.controller.js'

// El nivel se verifica dentro del controller (depende del `tipo` que viene en
// query/body, no en la ruta). Se registra con prefijo /api/documentos.
export async function documentosRoutes(app: FastifyInstance) {
  app.get('/preview', { preHandler: [requireAuth] }, ctrl.preview)
  app.post('/emitir', { preHandler: [requireAuth] }, ctrl.emitir)
}
