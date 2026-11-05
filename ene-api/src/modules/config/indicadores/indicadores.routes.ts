import type { FastifyInstance } from 'fastify'
import { requireAuth, requireLevel } from '../../../plugins/auth-guard.js'
import { getIndicadores, updateIndicadores } from './indicadores.controller.js'

// RN-IMP-01: las tasas se editan desde Configuración general.
const ITEM = 'CONFIGURACION_GENERAL'

export async function indicadoresRoutes(app: FastifyInstance) {
  // Lectura abierta a cualquier usuario autenticado: las tasas no son sensibles
  // y las consume el desglose de costo en cotización/OT (cuyos usuarios no
  // necesariamente tienen el ítem CONFIGURACION_GENERAL). La edición sí exige TOTAL.
  app.get('/indicadores', { preHandler: [requireAuth] }, getIndicadores)
  app.put('/indicadores', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, updateIndicadores)
}
