import type { FastifyInstance } from 'fastify'
import { requireAuth, requireLevel } from '../../../plugins/auth-guard.js'
import { getEmpresa, updateEmpresa, uploadLogo, getLogo, deleteLogo } from './empresa.controller.js'

// RN-EMP-01: datos de empresa y logo se administran desde Configuración general
// (un solo ItemMenu para toda la página: CONFIGURACION_GENERAL).
const ITEM = 'CONFIGURACION_GENERAL'

export async function empresaRoutes(app: FastifyInstance) {
  app.get('/empresa', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, getEmpresa)
  app.put('/empresa', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, updateEmpresa)
  app.post('/empresa/logo', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, uploadLogo)
  app.delete('/empresa/logo', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, deleteLogo)
  // El logo se sirve con control de permiso (lo muestra la pantalla de
  // configuración); el PDF lo lee directo desde la BD vía resolverEmisor.
  app.get('/empresa/logo', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, getLogo)
}
