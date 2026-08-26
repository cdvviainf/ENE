import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { createLocalAccountIssuer } from '@better-auth/core/db'
import { env } from '../config/env.js'
import { prisma } from './prisma.js'

// Issuer de la cuenta local de credencial (email+password). Better Auth lo usa
// para localizar la credencial; su valor es `local:credential`.
export const ISSUER_CREDENCIAL = createLocalAccountIssuer('credential')

// Better Auth: identidad y credenciales. El dominio (perfil, permisos) vive en
// `Usuario`, enlazado por `Usuario.authUserId → User.id`. El registro público
// está deshabilitado (ver app.ts): el alta la hace un administrador.
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  trustedOrigins: env.CORS_ORIGIN.split(','),
  // RN-PER-01: la autorización es solo por perfil + ítem de menú + nivel. No se
  // usa el plugin admin() de Better Auth (introduciría un segundo sistema de
  // roles). Toda administración de identidades pasa por /api/config protegido.
  databaseHooks: {
    session: {
      create: {
        // RN-PER: bloquear la sesión si no hay un Usuario de dominio activo y no
        // soft-deleted enlazado a esta identidad (authUserId).
        before: async (session) => {
          const usuario = await prisma.usuario.findFirst({
            where: { authUserId: session.userId, eliminadoEn: null, activo: true },
            select: { id: true },
          })
          if (!usuario) return false
        },
      },
    },
  },
})

export type Auth = typeof auth
