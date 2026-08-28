import type { FastifyInstance } from 'fastify'
import { requireAuth, requireLevel } from '../../plugins/auth-guard.js'
import { peekSiguienteCodigo } from '../../shared/correlativos.js'
import {
  listServicios,
  getServicioById,
  createServicio,
  updateServicio,
  deleteServicio,
} from './servicios.controller.js'

const ITEM = 'SERVICIOS'

export async function serviciosRoutes(app: FastifyInstance) {
  app.get(
    '/servicios/siguiente-codigo',
    { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] },
    async (_req, reply) => reply.send({ codigo: await peekSiguienteCodigo('SERVICIO') }),
  )

  app.get('/servicios', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, listServicios)
  app.get('/servicios/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, getServicioById)
  app.post('/servicios', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, createServicio)
  app.patch('/servicios/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, updateServicio)
  app.delete('/servicios/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, deleteServicio)
}
