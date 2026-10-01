import type { FastifyInstance } from 'fastify'
import { requireAuth, requireLevel } from '../../plugins/auth-guard.js'
import {
  listCotizaciones,
  getCotizacion,
  createCotizacion,
  putItinerario,
  postVersion,
  listVersiones,
  getVersion,
  postRecalcularPax,
  postPreviewLinea,
  patchCantidadPax,
  patchEstado,
  postAprobar,
} from './cotizaciones.controller.js'

const ITEM = 'COTIZACIONES'

export async function cotizacionesRoutes(app: FastifyInstance) {
  app.get('/cotizaciones', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, listCotizaciones)
  app.get('/cotizaciones/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, getCotizacion)
  app.get('/cotizaciones/:id/versiones', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, listVersiones)
  app.get('/cotizaciones/:id/versiones/:version', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, getVersion)

  app.post('/cotizaciones', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, createCotizacion)
  app.put('/cotizaciones/:id/itinerario', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, putItinerario)
  app.post('/cotizaciones/:id/versiones', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, postVersion)
  app.post('/cotizaciones/:id/recalcular-pax', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, postRecalcularPax)
  app.post('/cotizaciones/:id/preview-linea', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, postPreviewLinea)
  app.patch('/cotizaciones/:id/cantidad-pax', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, patchCantidadPax)
  app.patch('/cotizaciones/:id/estado', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, patchEstado)
  app.post('/cotizaciones/:id/aprobar', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, postAprobar)
}
