import type { FastifyInstance } from 'fastify'
import { requireAuth, requireLevel } from '../../../plugins/auth-guard.js'
import { listRegiones, getRegionById, createRegion, updateRegion, deleteRegion } from './regiones.controller.js'

const ITEM = 'REGIONES'

export async function regionesRoutes(app: FastifyInstance) {
  app.get('/regiones', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, listRegiones)
  app.get('/regiones/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, getRegionById)
  app.post('/regiones', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, createRegion)
  app.patch('/regiones/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, updateRegion)
  app.delete('/regiones/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, deleteRegion)
}
