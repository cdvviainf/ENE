import type { FastifyInstance } from 'fastify'
import { requireAuth, requireLevel } from '../../../plugins/auth-guard.js'
import {
  listProvincias,
  getProvinciaById,
  createProvincia,
  updateProvincia,
  deleteProvincia,
} from './provincias.controller.js'

const ITEM = 'PROVINCIAS'

export async function provinciasRoutes(app: FastifyInstance) {
  app.get('/provincias', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, listProvincias)
  app.get('/provincias/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, getProvinciaById)
  app.post('/provincias', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, createProvincia)
  app.patch('/provincias/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, updateProvincia)
  app.delete('/provincias/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, deleteProvincia)
}
