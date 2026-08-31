import type { FastifyInstance } from 'fastify'
import { requireAuth, requireLevel } from '../../plugins/auth-guard.js'
import { peekSiguienteCodigo } from '../../shared/correlativos.js'
import {
  listProveedores,
  getProveedorById,
  createProveedor,
  updateProveedor,
  deleteProveedor,
  createAlias,
  deleteAlias,
  createCuenta,
  updateCuenta,
  deleteCuenta,
  createContacto,
  updateContacto,
  deleteContacto,
  createDireccion,
  updateDireccion,
  deleteDireccion,
} from './proveedores.controller.js'

const ITEM = 'PROVEEDORES'

export async function proveedoresRoutes(app: FastifyInstance) {
  app.get(
    '/proveedores/siguiente-codigo',
    { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] },
    async (_req, reply) => reply.send({ codigo: await peekSiguienteCodigo('PROVEEDOR') }),
  )

  app.get('/proveedores', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, listProveedores)
  app.get('/proveedores/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'LECTURA')] }, getProveedorById)
  app.post('/proveedores', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, createProveedor)
  app.patch('/proveedores/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, updateProveedor)
  app.delete('/proveedores/:id', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, deleteProveedor)

  app.post('/proveedores/:id/alias', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, createAlias)
  app.delete(
    '/proveedores/:id/alias/:sid',
    { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] },
    deleteAlias,
  )

  app.post('/proveedores/:id/cuentas', { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] }, createCuenta)
  app.patch(
    '/proveedores/:id/cuentas/:sid',
    { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] },
    updateCuenta,
  )
  app.delete(
    '/proveedores/:id/cuentas/:sid',
    { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] },
    deleteCuenta,
  )

  app.post(
    '/proveedores/:id/contactos',
    { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] },
    createContacto,
  )
  app.patch(
    '/proveedores/:id/contactos/:sid',
    { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] },
    updateContacto,
  )
  app.delete(
    '/proveedores/:id/contactos/:sid',
    { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] },
    deleteContacto,
  )

  app.post(
    '/proveedores/:id/direcciones',
    { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] },
    createDireccion,
  )
  app.patch(
    '/proveedores/:id/direcciones/:sid',
    { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] },
    updateDireccion,
  )
  app.delete(
    '/proveedores/:id/direcciones/:sid',
    { preHandler: [requireAuth, requireLevel(ITEM, 'TOTAL')] },
    deleteDireccion,
  )
}
