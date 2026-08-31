import type { FastifyInstance } from 'fastify'
import { requireAuth, requireLevel } from '../../../plugins/auth-guard.js'
import { listComunas, getComunaById, createComuna, updateComuna, deleteComuna } from './comunas.controller.js'

const ITEM = 'COMUNAS'

export async function comunasRoutes(app: FastifyInstance) {
  app.get('/comunas', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, listComunas)
  app.get('/comunas/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, getComunaById)
  app.post('/comunas', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, createComuna)
  app.patch('/comunas/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, updateComuna)
  app.delete('/comunas/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, deleteComuna)
}
