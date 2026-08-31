import Fastify from 'fastify'
import type { FastifyReply, FastifyRequest } from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import multipart from '@fastify/multipart'
import { fromNodeHeaders } from 'better-auth/node'
import { env } from './config/env.js'
import { auth } from './lib/auth.js'
import { prisma } from './lib/prisma.js'
import { validarComplejidadPassword } from './shared/password-validator.js'
import { registrarErrorHandler } from './plugins/error-handler.js'
import { registrarSwagger } from './plugins/swagger.plugin.js'
import { healthRoutes } from './modules/health/health.routes.js'
import { usuariosRoutes } from './modules/config/usuarios/usuarios.routes.js'
import { perfilesRoutes } from './modules/config/perfiles/perfiles.routes.js'
import { prefijosCodigoRoutes } from './modules/config/prefijos-codigo/prefijos-codigo.routes.js'
import { zonasRoutes } from './modules/config/zonas/zonas.routes.js'
import { tiposServicioRoutes } from './modules/config/tipos-servicio/tipos-servicio.routes.js'
import { clientesRoutes } from './modules/clientes/clientes.routes.js'
import { serviciosRoutes } from './modules/servicios/servicios.routes.js'
import { gruposRoutes } from './modules/grupos/grupos.routes.js'
import { proveedoresRoutes } from './modules/proveedores/proveedores.routes.js'
import { formasPagoRoutes } from './modules/config/formas-pago/formas-pago.routes.js'
import { condicionesPagoRoutes } from './modules/config/condiciones-pago/condiciones-pago.routes.js'
import { paisesRoutes } from './modules/config/paises/paises.routes.js'
import { regionesRoutes } from './modules/config/regiones/regiones.routes.js'
import { provinciasRoutes } from './modules/config/provincias/provincias.routes.js'
import { comunasRoutes } from './modules/config/comunas/comunas.routes.js'

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

  // Better Auth necesita el body crudo; el resto de la API usa JSON parseado.
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
    if (req.url?.startsWith('/api/auth')) {
      done(null, body)
      return
    }
    try {
      done(null, body.length ? JSON.parse(body.toString('utf8')) : undefined)
    } catch (err) {
      done(err as Error, undefined)
    }
  })

  // Construye el Request web estándar que espera Better Auth desde el request Fastify.
  function construirWebRequest(req: FastifyRequest): Request {
    const protocol = req.protocol ?? 'http'
    const host = req.headers.host ?? 'localhost'
    const url = new URL(req.url, `${protocol}://${host}`)

    const headers = new Headers()
    for (const [key, val] of Object.entries(req.headers)) {
      if (val == null) continue
      if (Array.isArray(val)) for (const v of val) headers.append(key, v)
      else headers.set(key, val)
    }

    const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
    const body = hasBody && req.body instanceof Buffer ? req.body : undefined
    return new Request(url, { method: req.method, headers, body })
  }

  // Puente Fastify → Better Auth (handler web estándar).
  async function forwardToBetterAuth(req: FastifyRequest, reply: FastifyReply) {
    const webRes = await auth.handler(construirWebRequest(req))
    reply.status(webRes.status)
    webRes.headers.forEach((value, key) => reply.header(key, value))
    return reply.send(await webRes.text())
  }

  // El registro público está deshabilitado: el alta de usuarios la hace un
  // administrador desde /api/config/usuarios.
  app.post('/api/auth/sign-up/email', async (_req, reply) => {
    reply.status(403).send({
      error: {
        code: 'REGISTRATION_DISABLED',
        message: 'El registro público está deshabilitado. El alta de usuarios la realiza un administrador.',
      },
    })
  })

  // Aplicar la política de complejidad antes de delegar el cambio de contraseña
  // a Better Auth, que solo valida el largo mínimo.
  app.post('/api/auth/change-password', async (req, reply) => {
    const raw = req.body instanceof Buffer ? req.body.toString('utf8') : ''
    let newPassword = ''
    try {
      newPassword = raw ? (JSON.parse(raw)?.newPassword ?? '') : ''
    } catch {
      // body inválido: se delega a Better Auth para que reporte el error de parseo.
    }
    if (newPassword) {
      const err = validarComplejidadPassword(newPassword)
      if (err) return reply.status(422).send({ code: 'VALIDATION_ERROR', message: err })
    }

    // Resolver el actor (el propio usuario) antes de mutar la credencial.
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) })
    const webRes = await auth.handler(construirWebRequest(req))
    reply.status(webRes.status)
    webRes.headers.forEach((value, key) => reply.header(key, value))
    const bodyText = await webRes.text()

    // RN-PER-03: tras un cambio exitoso, registrar el actor en la auditoría de dominio.
    if (webRes.status === 200 && session?.user) {
      const usuario = await prisma.usuario.findFirst({
        where: { authUserId: session.user.id, eliminadoEn: null },
        select: { id: true },
      })
      if (usuario) {
        // La credencial ya cambió (operación de Better Auth). El fallo de la
        // auditoría de dominio no se silencia: se registra para poder detectar y
        // reconciliar la operación parcialmente aplicada (RN-PER-03).
        try {
          await prisma.usuario.update({
            where: { id: usuario.id },
            data: { actualizadoPor: String(usuario.id) },
          })
        } catch (err) {
          req.log.error(
            { err, usuarioId: usuario.id },
            'Cambio de contraseña aplicado pero falló el registro de auditoría (actualizadoPor)',
          )
        }
      }
    }

    return reply.send(bodyText)
  })

  app.all('/api/auth/*', forwardToBetterAuth)

  // Módulos de negocio bajo /api (CLAUDE.md §6).
  await app.register(healthRoutes)
  await app.register(usuariosRoutes, { prefix: '/api/config' })
  await app.register(perfilesRoutes, { prefix: '/api/config' })
  await app.register(prefijosCodigoRoutes, { prefix: '/api/config' })
  await app.register(zonasRoutes, { prefix: '/api/config' })
  await app.register(tiposServicioRoutes, { prefix: '/api/config' })
  await app.register(clientesRoutes, { prefix: '/api' })
  await app.register(serviciosRoutes, { prefix: '/api' })
  await app.register(gruposRoutes, { prefix: '/api' })
  await app.register(proveedoresRoutes, { prefix: '/api' })
  await app.register(formasPagoRoutes, { prefix: '/api/config' })
  await app.register(condicionesPagoRoutes, { prefix: '/api/config' })
  await app.register(paisesRoutes, { prefix: '/api/config' })
  await app.register(regionesRoutes, { prefix: '/api/config' })
  await app.register(provinciasRoutes, { prefix: '/api/config' })
  await app.register(comunasRoutes, { prefix: '/api/config' })

  return app
}
