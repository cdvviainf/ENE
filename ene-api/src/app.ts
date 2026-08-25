import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import multipart from '@fastify/multipart'
import { env } from './config/env.js'
import { registrarErrorHandler } from './plugins/error-handler.js'
import { registrarSwagger } from './plugins/swagger.plugin.js'
import { healthRoutes } from './modules/health/health.routes.js'

export async function construirApp() {
  const app = Fastify({
    logger:
      env.NODE_ENV === 'development'
        ? { transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } } }
        : true,
  })

  await app.register(helmet, { contentSecurityPolicy: false })
  await app.register(cors, { origin: env.CORS_ORIGIN.split(','), credentials: true })
  await app.register(multipart, { limits: { fileSize: env.ADJUNTOS_MAX_MB * 1024 * 1024 } })

  registrarErrorHandler(app)
  await registrarSwagger(app)

  // Módulos. Cada uno registra sus rutas bajo /api/<modulo> (CLAUDE.md §6).
  await app.register(healthRoutes)

  return app
}
