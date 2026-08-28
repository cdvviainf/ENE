import type { FastifyInstance } from 'fastify'
import { requireAuth, requireLevel } from '../../plugins/auth-guard.js'
import { peekSiguienteCodigo } from '../../shared/correlativos.js'
import {
  listGrupos,
  getGrupoById,
  createGrupo,
  updateGrupo,
  deleteGrupo,
  createPasajero,
  updatePasajero,
  deletePasajero,
} from './grupos.controller.js'

const ITEM = 'GRUPOS'

export async function gruposRoutes(app: FastifyInstance) {
  app.get(
    '/grupos/siguiente-codigo',
    { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] },
    async (_req, reply) => reply.send({ codigo: await peekSiguienteCodigo('GRUPO') }),
  )

  app.get('/grupos', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, listGrupos)
  app.get('/grupos/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, getGrupoById)
  app.post('/grupos', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, createGrupo)
  app.patch('/grupos/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, updateGrupo)
  app.delete('/grupos/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, deleteGrupo)

  app.post('/grupos/:id/pasajeros', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, createPasajero)
  app.patch(
    '/grupos/:id/pasajeros/:pid',
    { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] },
    updatePasajero,
  )
  app.delete(
    '/grupos/:id/pasajeros/:pid',
    { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] },
    deletePasajero,
  )
}
