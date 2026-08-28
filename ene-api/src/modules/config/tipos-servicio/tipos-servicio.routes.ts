import type { FastifyInstance } from 'fastify'
import { requireAuth, requireLevel } from '../../../plugins/auth-guard.js'
import {
  listTiposServicio,
  getTipoServicioById,
  createTipoServicio,
  updateTipoServicio,
  deleteTipoServicio,
} from './tipos-servicio.controller.js'

const ITEM = 'TIPOS_SERVICIO'

export async function tiposServicioRoutes(app: FastifyInstance) {
  app.get('/tipos-servicio', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, listTiposServicio)
  app.get('/tipos-servicio/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, getTipoServicioById)
  app.post('/tipos-servicio', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, createTipoServicio)
  app.patch('/tipos-servicio/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, updateTipoServicio)
  app.delete('/tipos-servicio/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, deleteTipoServicio)
}
