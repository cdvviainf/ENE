import type { FastifyInstance } from 'fastify'
import { requireAuth, requireLevel } from '../../../plugins/auth-guard.js'
import { listZonas, getZonaById, createZona, updateZona, deleteZona } from './zonas.controller.js'

const ITEM = 'ZONAS'

export async function zonasRoutes(app: FastifyInstance) {
  app.get('/zonas', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, listZonas)
  app.get('/zonas/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, getZonaById)
  app.post('/zonas', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, createZona)
  app.patch('/zonas/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, updateZona)
  app.delete('/zonas/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, deleteZona)
}
