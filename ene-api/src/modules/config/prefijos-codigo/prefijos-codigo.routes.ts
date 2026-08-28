import type { FastifyInstance } from 'fastify'
import { requireAuth, requireLevel, requireAnyLevel } from '../../../plugins/auth-guard.js'
import { listPrefijos, getPrefijoById, updatePrefijo, getSiguienteCodigo } from './prefijos-codigo.controller.js'

// Gobernado por el mismo ítem que el resto de los mantenedores generales.
const ITEM = 'MAESTROS'

export async function prefijosCodigoRoutes(app: FastifyInstance) {
  // Declarada antes de /:id para no chocar con el parámetro numérico. La
  // sugerencia la consumen los formularios de Usuario y Perfil (ítem
  // USUARIOS), no solo el mantenedor de prefijos (ítem MAESTROS).
  app.get(
    '/prefijos-codigo/siguiente/:entidad',
    { preHandler: [requireAuth, requireAnyLevel(['USUARIOS', 'MAESTROS'], 'LECTURA')] },
    getSiguienteCodigo,
  )

  app.get('/prefijos-codigo', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, listPrefijos)
  app.get('/prefijos-codigo/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, getPrefijoById)
  app.patch('/prefijos-codigo/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, updatePrefijo)
}
