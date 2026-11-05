import type { FastifyInstance } from 'fastify'
import { requireAuth, requireLevel } from '../../plugins/auth-guard.js'
import { listTarifarios, getTarifarioById, createTarifario, nuevaVersionTarifario, editarTarifario } from './tarifas.controller.js'

const ITEM = 'TARIFAS'

export async function tarifasRoutes(app: FastifyInstance) {
  app.get('/tarifas', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, listTarifarios)
  app.get('/tarifas/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, getTarifarioById)
  app.post('/tarifas', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, createTarifario)
  app.post('/tarifas/:id/nueva-version', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, nuevaVersionTarifario)
  // Edición in-place del tarifario vigente (no crea versión). La tarifa vive
  // congelada en la cotización, así que editar no afecta cotizaciones previas.
  // RN-TAR-08: edición en el lugar del tarifario activo (enmienda oct-2026).
  app.patch('/tarifas/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, editarTarifario)
}
