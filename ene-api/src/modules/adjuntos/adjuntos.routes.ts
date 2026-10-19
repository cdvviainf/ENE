import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../plugins/auth-guard.js'
import { postAdjunto, getAdjuntos, descargarAdjunto, deleteAdjunto } from './adjuntos.controller.js'

export async function adjuntosRoutes(app: FastifyInstance) {
  // El permiso es DINÁMICO según la entidad dueña del adjunto (RN-OT-08): se
  // resuelve en el service contra los accesos del perfil, no en la ruta. Acá solo
  // se exige sesión activa.
  app.post('/adjuntos', { preHandler: [requireAuth] }, postAdjunto)
  app.get('/adjuntos', { preHandler: [requireAuth] }, getAdjuntos)
  app.get('/adjuntos/:id/descargar', { preHandler: [requireAuth] }, descargarAdjunto)
  app.delete('/adjuntos/:id', { preHandler: [requireAuth] }, deleteAdjunto)
}
