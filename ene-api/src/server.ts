import { env } from './config/env.js'
import { construirApp } from './app.js'
import { prisma } from './lib/prisma.js'

const app = await construirApp()

const cerrar = async (senal: string) => {
  app.log.info(`${senal} recibido, cerrando...`)
  await app.close()
  await prisma.$disconnect()
  process.exit(0)
}

process.on('SIGTERM', () => void cerrar('SIGTERM'))
process.on('SIGINT', () => void cerrar('SIGINT'))

try {
  await app.listen({ port: env.PORT, host: '0.0.0.0' })
  app.log.info(`ENE API en http://localhost:${env.PORT} · docs en /docs`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
