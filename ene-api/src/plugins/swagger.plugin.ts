import type { FastifyInstance } from 'fastify'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'

export async function registrarSwagger(app: FastifyInstance) {
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'ENE API — Extremo Norte Expediciones',
        description: 'Sistema de Gestión de Operaciones. Montos como string decimal, fechas ISO 8601.',
        version: '0.1.0',
      },
      servers: [{ url: 'http://localhost:3011', description: 'Desarrollo' }],
    },
  })

  await app.register(swaggerUi, { routePrefix: '/docs' })
}
