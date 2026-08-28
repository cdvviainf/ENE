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
  // MAESTROS pasó a gobernar solo lo que no tiene ítem propio (el índice de
  // /config y Prefijos de código): los seis mantenedores generales de Etapa 4
  // tienen cada uno su propio ItemMenu para permitir niveles independientes
  // por mantenedor (ej. TOTAL en Proveedores, LECTURA en Clientes). La ruta
  // más específica gana en `resolverNivelPorRuta` (menu-acceso-context.tsx),
  // así que no hay ambigüedad con MAESTROS (ruta '/config').
  { codigo: 'MAESTROS', nombre: 'Mantenedores', modulo: 'config', ruta: '/config', orden: 70 },
  { codigo: 'CLIENTES', nombre: 'Clientes', modulo: 'config', ruta: '/config/clientes', orden: 71 },
  { codigo: 'GRUPOS', nombre: 'Grupos', modulo: 'config', ruta: '/config/grupos', orden: 72 },
  { codigo: 'PROVEEDORES', nombre: 'Proveedores', modulo: 'config', ruta: '/config/proveedores', orden: 73 },
  { codigo: 'SERVICIOS', nombre: 'Servicios', modulo: 'config', ruta: '/config/servicios', orden: 74 },
  { codigo: 'ZONAS', nombre: 'Zonas', modulo: 'config', ruta: '/config/zonas', orden: 75 },
  { codigo: 'TIPOS_SERVICIO', nombre: 'Tipos de servicio', modulo: 'config', ruta: '/config/tipos-servicio', orden: 76 },
  { codigo: 'USUARIOS', nombre: 'Usuarios y perfiles', modulo: 'config', ruta: '/config/usuarios', orden: 80 },
]

// Mantenedores separados de MAESTROS en esta migración (ver comentario arriba).
const MANTENEDORES_SEPARADOS = ['CLIENTES', 'GRUPOS', 'PROVEEDORES', 'SERVICIOS', 'ZONAS', 'TIPOS_SERVICIO']

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
  // PERFIL/USUARIO no usan el correlativo con lock (ultimoValor): son códigos
  // legibles curados a mano (ver ejemplo ADMIN/ADMINISTRADOR ya sembrados),
  // esto solo alimenta una sugerencia editable en el formulario (RN-PER-07).
  { entidad: 'PERFIL', prefijo: 'PER', digitos: 3, incluyeAnio: false },
  { entidad: 'USUARIO', prefijo: 'USR', digitos: 3, incluyeAnio: false },
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

  // Migración de granularidad de permisos: los perfiles que ya tenían un
  // nivel configurado a mano en MAESTROS (típicamente OPERACIONES/
  // ADMINISTRACION, ver comentario arriba de `total`) lo heredan en cada
  // mantenedor recién separado, para no revocarles acceso en silencio al
  // introducir los ítems nuevos. Idempotente: `update: {}` no pisa un nivel
  // ya ajustado a mano después de la migración.
  const itemMaestros = await prisma.itemMenu.findUnique({ where: { codigo: 'MAESTROS' } })
  const itemsSeparados = await prisma.itemMenu.findMany({ where: { codigo: { in: MANTENEDORES_SEPARADOS } } })
  if (itemMaestros) {
    const nivelesMaestros = await prisma.perfilItemMenu.findMany({ where: { itemMenuId: itemMaestros.id } })
    for (const nivelMaestros of nivelesMaestros) {
      for (const itemSeparado of itemsSeparados) {
        await prisma.perfilItemMenu.upsert({
          where: { perfilId_itemMenuId: { perfilId: nivelMaestros.perfilId, itemMenuId: itemSeparado.id } },
          update: {},
          create: { perfilId: nivelMaestros.perfilId, itemMenuId: itemSeparado.id, nivel: nivelMaestros.nivel },
        })
      }
    }
  }

  for (const z of ZONAS) {
    await prisma.zona.upsert({ where: { codigo: z.codigo }, update: {}, create: { ...z, creadoPor: SISTEMA } })
  }
  for (const t of TIPOS_SERVICIO) {
    await prisma.tipoServicio.upsert({ where: { codigo: t.codigo }, update: {}, create: { ...t, creadoPor: SISTEMA } })
  }
  for (const p of PREFIJOS) {
    await prisma.prefijoCodigo.upsert({
      where: { entidad: p.entidad },
      update: {},
      create: { ...p, creadoPor: SISTEMA },
    })
  }

  console.log('Seed completado: perfiles, ítems de menú, zonas, tipos de servicio y prefijos.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
