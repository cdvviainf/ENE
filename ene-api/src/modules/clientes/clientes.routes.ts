import type { FastifyInstance } from 'fastify'
import { requireAuth, requireLevel } from '../../plugins/auth-guard.js'
import { peekSiguienteCodigo } from '../../shared/correlativos.js'
import {
  listClientes,
  getClienteById,
  createCliente,
  updateCliente,
  deleteCliente,
  createEjecutivo,
  updateEjecutivo,
  deleteEjecutivo,
  createDireccion,
  updateDireccion,
  deleteDireccion,
} from './clientes.controller.js'

const ITEM = 'CLIENTES'

export async function clientesRoutes(app: FastifyInstance) {
  // Antes de /:id para no chocar con el parámetro numérico (RN-MAN-02).
  app.get(
    '/clientes/siguiente-codigo',
    { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] },
    async (_req, reply) => reply.send({ codigo: await peekSiguienteCodigo('CLIENTE') }),
  )

  app.get('/clientes', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, listClientes)
  app.get('/clientes/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, getClienteById)
  app.post('/clientes', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, createCliente)
  app.patch('/clientes/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, updateCliente)
  app.delete('/clientes/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, deleteCliente)

  app.post(
    '/clientes/:id/ejecutivos',
    { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] },
    createEjecutivo,
  )
  app.patch(
    '/clientes/:id/ejecutivos/:eid',
    { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] },
    updateEjecutivo,
  )
  app.delete(
    '/clientes/:id/ejecutivos/:eid',
    { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] },
    deleteEjecutivo,
  )

  app.post(
    '/clientes/:id/direcciones',
    { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] },
    createDireccion,
  )
  app.patch(
    '/clientes/:id/direcciones/:did',
    { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] },
    updateDireccion,
  )
  app.delete(
    '/clientes/:id/direcciones/:did',
    { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] },
    deleteDireccion,
  )
}
