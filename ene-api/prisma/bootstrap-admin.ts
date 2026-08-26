import { prisma } from '../src/lib/prisma.js'
import { auth, ISSUER_CREDENCIAL } from '../src/lib/auth.js'
import { validarComplejidadPassword } from '../src/shared/password-validator.js'

// Crea el usuario administrador inicial con su credencial de Better Auth.
// Idempotente por email. Ejecutar una vez después del seed:
//   npm run db:bootstrap -- --email cdv@viain.cl --nombre "Christian Droguett" --password "…"

function arg(nombre: string, porDefecto?: string): string {
  const i = process.argv.indexOf(`--${nombre}`)
  const valor = i >= 0 ? process.argv[i + 1] : undefined
  if (!valor && porDefecto === undefined) {
    console.error(`Falta el argumento --${nombre}`)
    process.exit(1)
  }
  return valor ?? porDefecto!
}

async function main() {
  const email = arg('email').toLowerCase()
  const nombre = arg('nombre', 'Administrador')
  const password = arg('password')

  const errPass = validarComplejidadPassword(password)
  if (errPass) {
    console.error(`Contraseña inválida: ${errPass}`)
    process.exit(1)
  }

  const perfil = await prisma.perfil.findUnique({ where: { codigo: 'ADMINISTRADOR' } })
  if (!perfil) {
    console.error('No existe el perfil ADMINISTRADOR. Ejecuta primero: npm run db:seed')
    process.exit(1)
  }

  const existente = await prisma.usuario.findUnique({ where: { email } })
  if (existente) {
    console.log(`El usuario ${email} ya existe (id ${existente.id}). Nada que hacer.`)
    return
  }

  const ctx = await auth.$context
  const hashed = await ctx.password.hash(password)
  const authUser = await ctx.internalAdapter.createUser(
    { email, name: nombre, emailVerified: true },
    { method: 'bootstrap' },
  )

  try {
    await ctx.internalAdapter.createAccount({
      userId: authUser.id,
      providerId: 'credential',
      issuer: ISSUER_CREDENCIAL,
      accountId: authUser.id,
      password: hashed,
    })
    const usuario = await prisma.usuario.create({
      data: {
        codigo: 'ADMIN',
        nombre,
        email,
        perfilId: perfil.id,
        authUserId: authUser.id,
        creadoPor: 'bootstrap',
      },
    })
    console.log(`Usuario administrador creado: ${usuario.email} (id ${usuario.id}). Ya puede iniciar sesión.`)
  } catch (err) {
    await ctx.internalAdapter.deleteUser(authUser.id).catch(() => {})
    throw err
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
