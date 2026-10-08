import type { FastifyInstance } from 'fastify'
import { requireAuth, requireLevel } from '../../plugins/auth-guard.js'
import { peekSiguienteCodigo } from '../../shared/correlativos.js'
import {
  listNegocios,
  getNegocioById,
  createNegocio,
  updateNegocio,
  deleteNegocio,
  createPasajero,
  updatePasajero,
  deletePasajero,
} from './negocios.controller.js'

const ITEM = 'NEGOCIOS'

export async function negociosRoutes(app: FastifyInstance) {
  app.get(
    '/negocios/siguiente-codigo',
    { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] },
    async (_req, reply) => reply.send({ codigo: await peekSiguienteCodigo('NEGOCIO') }),
  )

  app.get('/negocios', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, listNegocios)
  app.get('/negocios/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, getNegocioById)
  app.post('/negocios', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, createNegocio)
  app.patch('/negocios/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, updateNegocio)
  app.delete('/negocios/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, deleteNegocio)

  app.post('/negocios/:id/pasajeros', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, createPasajero)
  app.patch(
    '/negocios/:id/pasajeros/:pid',
    { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] },
    updatePasajero,
  )
  app.delete(
    '/negocios/:id/pasajeros/:pid',
    { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] },
    deletePasajero,
  )
}
