import type { FastifyInstance } from 'fastify'
import { requireAuth, requireLevel } from '../../plugins/auth-guard.js'
import {
  listServiciosConTarifa,
  listTarifasDeServicio,
  getTarifaVenta,
  createTarifaVenta,
  nuevaVersionTarifaVenta,
  editarTarifaVenta,
} from './tarifas-venta.controller.js'

const ITEM = 'TARIFAS_VENTA'

// Tarifas de venta (RN-TVE-01..06). Sin DELETE, igual que el tarifario de
// proveedor: un cambio con historia es una versión nueva.
export async function tarifasVentaRoutes(app: FastifyInstance) {
  // Listado principal: todos los servicios con el estado de su tarifa de venta.
  app.get('/tarifas-venta/servicios', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, listServiciosConTarifa)
  // Historial de tarifas de un servicio (?servicioId=).
  app.get('/tarifas-venta', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, listTarifasDeServicio)
  app.get('/tarifas-venta/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, getTarifaVenta)
  app.post('/tarifas-venta', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, createTarifaVenta)
  app.post('/tarifas-venta/:id/nueva-version', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, nuevaVersionTarifaVenta)
  app.patch('/tarifas-venta/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, editarTarifaVenta)
}
