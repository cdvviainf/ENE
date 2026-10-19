import type { FastifyInstance } from 'fastify'
import { requireAuth, requireLevel } from '../../plugins/auth-guard.js'
import {
  listOrdenes,
  getOrden,
  getVersion,
  patchEstado,
  patchEstadoServicio,
  postVersion,
} from './ordenes-trabajo.controller.js'

const ITEM = 'ORDENES_TRABAJO'

export async function ordenesTrabajoRoutes(app: FastifyInstance) {
  app.get('/ordenes-trabajo', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, listOrdenes)
  app.get('/ordenes-trabajo/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, getOrden)
  app.get(
    '/ordenes-trabajo/:id/versiones/:version',
    { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] },
    getVersion,
  )

  app.patch(
    '/ordenes-trabajo/:id/estado',
    { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] },
    patchEstado,
  )
  app.patch(
    '/ordenes-trabajo/:id/lineas/:lid/estado-servicio',
    { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] },
    patchEstadoServicio,
  )

  app.post(
    '/ordenes-trabajo/:id/versiones',
    { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] },
    postVersion,
  )
}
