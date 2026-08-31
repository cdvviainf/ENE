import type { FastifyInstance } from 'fastify'
import { requireAuth, requireLevel } from '../../../plugins/auth-guard.js'
import {
  listFormasPago,
  getFormaPagoById,
  createFormaPago,
  updateFormaPago,
  deleteFormaPago,
} from './formas-pago.controller.js'

const ITEM = 'FORMAS_PAGO'

export async function formasPagoRoutes(app: FastifyInstance) {
  app.get('/formas-pago', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, listFormasPago)
  app.get('/formas-pago/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, getFormaPagoById)
  app.post('/formas-pago', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, createFormaPago)
  app.patch('/formas-pago/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, updateFormaPago)
  app.delete('/formas-pago/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, deleteFormaPago)
}
