import type { FastifyInstance } from 'fastify'
import { requireAuth, requireLevel } from '../../../plugins/auth-guard.js'
import {
  listCondicionesPago,
  getCondicionPagoById,
  createCondicionPago,
  updateCondicionPago,
  deleteCondicionPago,
} from './condiciones-pago.controller.js'

const ITEM = 'CONDICIONES_PAGO'

export async function condicionesPagoRoutes(app: FastifyInstance) {
  app.get('/condiciones-pago', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, listCondicionesPago)
  app.get('/condiciones-pago/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, getCondicionPagoById)
  app.post('/condiciones-pago', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, createCondicionPago)
  app.patch('/condiciones-pago/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, updateCondicionPago)
  app.delete('/condiciones-pago/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, deleteCondicionPago)
}
