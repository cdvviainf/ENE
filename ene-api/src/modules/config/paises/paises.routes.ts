import type { FastifyInstance } from 'fastify'
import { requireAuth, requireLevel } from '../../../plugins/auth-guard.js'
import { listPaises, getPaisById, createPais, updatePais, deletePais } from './paises.controller.js'

const ITEM = 'PAISES'

export async function paisesRoutes(app: FastifyInstance) {
  app.get('/paises', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, listPaises)
  app.get('/paises/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, getPaisById)
  app.post('/paises', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, createPais)
  app.patch('/paises/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, updatePais)
  app.delete('/paises/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, deletePais)
}
