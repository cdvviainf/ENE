import { PrismaClient } from '@prisma/client'

// Crea el usuario administrador inicial. Idempotente: si ya existe, no hace
// nada. Se ejecuta una sola vez después del seed.
//   npm run db:bootstrap -- --email cdv@viain.cl --nombre "Christian Droguett"

const prisma = new PrismaClient()

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
  const email = arg('email')
  const nombre = arg('nombre', 'Administrador')

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

  const usuario = await prisma.usuario.create({
    data: { codigo: 'ADMIN', nombre, email, perfilId: perfil.id, creadoPor: 'bootstrap' },
  })

  console.log(`Usuario administrador creado: ${usuario.email} (id ${usuario.id})`)
  console.log('La credencial se define en el primer ingreso vía Better Auth.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
