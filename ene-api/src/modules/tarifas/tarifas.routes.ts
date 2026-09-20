import type { FastifyInstance } from 'fastify'
import { requireAuth, requireLevel } from '../../plugins/auth-guard.js'
import { listTarifarios, getTarifarioById, createTarifario, nuevaVersionTarifario } from './tarifas.controller.js'

const ITEM = 'TARIFAS'

export async function tarifasRoutes(app: FastifyInstance) {
  app.get('/tarifas', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, listTarifarios)
  app.get('/tarifas/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, getTarifarioById)
  app.post('/tarifas', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, createTarifario)
  app.post('/tarifas/:id/nueva-version', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, nuevaVersionTarifario)
}
