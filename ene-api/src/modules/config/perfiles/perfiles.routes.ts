import type { FastifyInstance } from 'fastify'
import { requireAuth, requireLevel } from '../../../plugins/auth-guard.js'
import {
  listPerfiles,
  getPerfilById,
  createPerfil,
  updatePerfil,
  deletePerfil,
  listItemsMenu,
  getMiMenu,
} from './perfiles.controller.js'

// Ítem de menú que gobierna usuarios y perfiles (seed: USUARIOS).
const ITEM = 'USUARIOS'

export async function perfilesRoutes(app: FastifyInstance) {
  // Catálogo de ítems de menú: cualquier sesión autenticada lo necesita para armar el menú.
  app.get('/items-menu', { preHandler: [requireAuth] }, listItemsMenu)
  // Menú del usuario en sesión, con el nivel ya resuelto por su perfil (RN-PER-01).
  app.get('/me/menu', { preHandler: [requireAuth] }, getMiMenu)

  app.get('/perfiles', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, listPerfiles)
  app.get('/perfiles/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, getPerfilById)
  app.post('/perfiles', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, createPerfil)
  app.patch('/perfiles/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, updatePerfil)
  app.delete('/perfiles/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, deletePerfil)
}
