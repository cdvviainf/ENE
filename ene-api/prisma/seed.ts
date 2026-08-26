import { PrismaClient, NivelAcceso, ModeloTarifa } from '@prisma/client'

const prisma = new PrismaClient()
const SISTEMA = 'seed'

const PERFILES = [
  { codigo: 'GERENCIA', nombre: 'Gerencia' },
  { codigo: 'OPERACIONES', nombre: 'Operaciones y reservas' },
  { codigo: 'ADMINISTRACION', nombre: 'Administración' },
  { codigo: 'ADMINISTRADOR', nombre: 'Administrador del sistema' },
]

// `ruta` sigue la estructura de route group (app) de CLAUDE.md §4: los
// segmentos no llevan prefijo /dashboard, cuelgan directo de la raíz.
const ITEMS_MENU = [
  { codigo: 'COTIZACIONES', nombre: 'Cotizaciones', modulo: 'comercial', ruta: '/cotizaciones', orden: 10 },
  { codigo: 'ORDENES_TRABAJO', nombre: 'Órdenes de Trabajo', modulo: 'operaciones', ruta: '/ordenes-trabajo', orden: 20 },
  { codigo: 'ORDENES_COMPRA', nombre: 'Órdenes de Compra', modulo: 'operaciones', ruta: '/ordenes-compra', orden: 30 },
  { codigo: 'FACTURACION', nombre: 'Facturación', modulo: 'administracion', ruta: '/facturacion', orden: 40 },
  { codigo: 'COBROS', nombre: 'Cobros y pagos', modulo: 'administracion', ruta: '/cobros', orden: 50 },
  { codigo: 'DASHBOARD', nombre: 'Dashboard', modulo: 'gestion', ruta: '/dashboard', orden: 60 },
  { codigo: 'MAESTROS', nombre: 'Mantenedores', modulo: 'config', ruta: '/config', orden: 70 },
  { codigo: 'USUARIOS', nombre: 'Usuarios y perfiles', modulo: 'config', ruta: '/config/usuarios', orden: 80 },
]

// Zonas de operación (levantamiento: Arica a Santiago)
const ZONAS = [
  { codigo: 'ARI', nombre: 'Arica', nombreEn: 'Arica' },
  { codigo: 'ANF', nombre: 'Antofagasta', nombreEn: 'Antofagasta' },
  { codigo: 'SPA', nombre: 'San Pedro de Atacama', nombreEn: 'San Pedro de Atacama' },
  { codigo: 'VAP', nombre: 'Valparaíso', nombreEn: 'Valparaiso' },
  { codigo: 'ZCE', nombre: 'Zona Central · Viñas', nombreEn: 'Central Valley · Wineries' },
  { codigo: 'SCL', nombre: 'Santiago', nombreEn: 'Santiago' },
]

// Ventanas de aviso fijas del dashboard — CLAUDE.md §9
const TIPOS_SERVICIO = [
  { codigo: 'ALOJAMIENTO',  nombre: 'Alojamiento',  modeloTarifaDefault: ModeloTarifa.ACOMODACION,  ventanaAvisoDias: 60 },
  { codigo: 'TRANSPORTE',   nombre: 'Transporte',   modeloTarifaDefault: ModeloTarifa.TRAMO_PAX,    ventanaAvisoDias: 30 },
  { codigo: 'GUIA',         nombre: 'Guía',         modeloTarifaDefault: ModeloTarifa.TRAMO_PAX,    ventanaAvisoDias: 21 },
  { codigo: 'ENTRADAS',     nombre: 'Entradas y visitas', modeloTarifaDefault: ModeloTarifa.UNITARIO_PAX, ventanaAvisoDias: 15 },
  { codigo: 'ALIMENTACION', nombre: 'Alimentación',  modeloTarifaDefault: ModeloTarifa.UNITARIO_PAX, ventanaAvisoDias: 15 },
  { codigo: 'OTRO',         nombre: 'Otro',          modeloTarifaDefault: ModeloTarifa.UNITARIO_PAX, ventanaAvisoDias: 30 },
]

const PREFIJOS = [
  { entidad: 'COTIZACION', prefijo: 'COT', digitos: 4, incluyeAnio: true },
  { entidad: 'ORDEN_TRABAJO', prefijo: 'OT', digitos: 4, incluyeAnio: true },
  { entidad: 'ORDEN_COMPRA', prefijo: 'OC', digitos: 4, incluyeAnio: true },
  { entidad: 'CLIENTE', prefijo: 'CL', digitos: 4, incluyeAnio: false },
  { entidad: 'PROVEEDOR', prefijo: 'PR', digitos: 4, incluyeAnio: false },
  { entidad: 'GRUPO', prefijo: 'GR', digitos: 5, incluyeAnio: false },
  { entidad: 'SERVICIO', prefijo: 'SV', digitos: 4, incluyeAnio: false },
]

async function main() {
  for (const p of PERFILES) {
    await prisma.perfil.upsert({ where: { codigo: p.codigo }, update: {}, create: { ...p, creadoPor: SISTEMA } })
  }
  for (const i of ITEMS_MENU) {
    // update sí toca `ruta`/`modulo`/`orden`: son catálogo de navegación, se
    // recalculan libremente en cada seed a diferencia de los datos de negocio.
    await prisma.itemMenu.upsert({
      where: { codigo: i.codigo },
      update: { ruta: i.ruta, modulo: i.modulo, orden: i.orden, nombre: i.nombre },
      create: i,
    })
  }

  // Gerencia y Administrador ven todo; el resto se ajusta al configurar.
  const total = await prisma.perfil.findMany({ where: { codigo: { in: ['GERENCIA', 'ADMINISTRADOR'] } } })
  const items = await prisma.itemMenu.findMany()
  for (const perfil of total) {
    for (const item of items) {
      await prisma.perfilItemMenu.upsert({
        where: { perfilId_itemMenuId: { perfilId: perfil.id, itemMenuId: item.id } },
        update: {},
        create: {
          perfilId: perfil.id,
          itemMenuId: item.id,
          nivel: perfil.codigo === 'GERENCIA' ? NivelAcceso.LECTURA : NivelAcceso.TOTAL,
        },
      })
    }
  }

  for (const z of ZONAS) {
    await prisma.zona.upsert({ where: { codigo: z.codigo }, update: {}, create: { ...z, creadoPor: SISTEMA } })
  }
  for (const t of TIPOS_SERVICIO) {
    await prisma.tipoServicio.upsert({ where: { codigo: t.codigo }, update: {}, create: { ...t, creadoPor: SISTEMA } })
  }
  for (const p of PREFIJOS) {
    await prisma.prefijoCodigo.upsert({ where: { entidad: p.entidad }, update: {}, create: p })
  }

  console.log('Seed completado: perfiles, ítems de menú, zonas, tipos de servicio y prefijos.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
