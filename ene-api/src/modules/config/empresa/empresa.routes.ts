import type { FastifyInstance } from 'fastify'
import { requireAuth, requireLevel } from '../../../plugins/auth-guard.js'
import { getEmpresa, updateEmpresa, uploadLogo, getLogo } from './empresa.controller.js'

const ITEM = 'EMPRESA'

export async function empresaRoutes(app: FastifyInstance) {
  app.get('/empresa', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, getEmpresa)
  app.put('/empresa', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, updateEmpresa)
  app.post('/empresa/logo', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, uploadLogo)
  // El logo se sirve con control de permiso; cualquier usuario autenticado que
  // pueda leer datos de empresa puede verlo (lo usa el PDF y el formulario).
  app.get('/empresa/logo', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, getLogo)
}
