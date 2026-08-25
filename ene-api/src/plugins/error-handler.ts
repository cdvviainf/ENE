import type { FastifyInstance } from 'fastify'
import { ZodError } from 'zod'
import { ErrorApp } from '../shared/errors.js'

export function registrarErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ErrorApp) {
      return reply.status(error.statusCode).send({
        error: { code: error.code, message: error.message, details: error.details },
      })
    }

    if (error instanceof ZodError) {
      return reply.status(422).send({
        error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos', details: error.issues },
      })
    }

    request.log.error({ err: error }, 'Error no controlado')
    return reply.status(error.statusCode ?? 500).send({
      error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' },
    })
  })

  app.setNotFoundHandler((request, reply) =>
    reply.status(404).send({
      error: { code: 'NOT_FOUND', message: `Ruta ${request.method} ${request.url} no existe` },
    }),
  )
}
