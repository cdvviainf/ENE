import type { FastifyInstance } from 'fastify'
import { requireAuth, requireLevel } from '../../../plugins/auth-guard.js'
import * as ctrl from './carga-masiva.controller.js'

const ITEM = 'CARGA_MASIVA'

export async function cargaMasivaRoutes(app: FastifyInstance) {
  // Descargar el Excel base vacío (lectura basta).
  app.get('/carga-masiva/template', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, ctrl.descargarTemplate)

  // Validar (dry-run, requiere LECTURA) o cargar (?commit=true, requiere
  // TOTAL — el controller revisa el nivel exacto según el modo).
  app.post('/carga-masiva', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, ctrl.procesar)

  // Descargar el reporte de errores (Excel) de una validación del archivo subido.
  app.post('/carga-masiva/reporte', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, ctrl.descargarReporte)
}
