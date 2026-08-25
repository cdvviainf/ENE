import type { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma.js'

export async function healthRoutes(app: FastifyInstance) {
  app.get('/api/health', {
    schema: {
      tags: ['health'],
      summary: 'Estado del servicio y de la base de datos',
    },
  }, async () => {
    const inicio = Date.now()
    await prisma.$queryRaw`SELECT 1`
    return {
      estado: 'ok',
      base: 'ok',
      latenciaMs: Date.now() - inicio,
      hora: new Date().toISOString(),
    }
  })
}
