import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient, type Prisma } from '@prisma/client'
import {
  crearSiguienteVersion,
  type Cabecera,
  type Version,
  type Versionable,
} from '../src/shared/versionado/index.js'
import { LOCK_COTIZACION_CORRELATIVO } from '../src/shared/advisory-locks.js'

// ============================================================================
// Versionado — prueba de INTEGRACIÓN contra PostgreSQL (RN-VER-04/05/07).
//
// El fake de versionado.test.ts prueba la lógica pura pero no puede demostrar la
// serialización del advisory lock: eso exige dos transacciones reales compitiendo
// por la misma cabecera. Caso obligatorio #6 de Docs/reglas-negocio.md §15.
//
// Requiere el Postgres del docker-compose arriba (DATABASE_URL en .env). No se
// importa el singleton `prisma` de la app para no disparar el parser de env.ts;
// se carga .env y se instancia un cliente propio.
// ============================================================================

try {
  process.loadEnvFile()
} catch {
  // .env ya cargado en el entorno o inexistente; PrismaClient fallará con un
  // mensaje claro si DATABASE_URL no está disponible.
}

const prisma = new PrismaClient()

type Datos = Record<string, never>

// Versionable concreto respaldado por Cotizacion/CotizacionVersion (tablas reales).
const cotizacionVersionable: Versionable<Cabecera, Version, Datos> = {
  // El lock se serializa por (namespace, cabeceraId); el namespace de cotización sirve.
  lockNamespace: LOCK_COTIZACION_CORRELATIVO,
  entidad: 'Cotización',

  async cargarCabecera(tx: Prisma.TransactionClient, id: number): Promise<Cabecera | null> {
    return tx.cotizacion.findUnique({
      where: { id },
      select: { id: true, versionVigenteId: true },
    })
  },

  async ultimaVersion(tx: Prisma.TransactionClient, cabeceraId: number): Promise<number> {
    const agg = await tx.cotizacionVersion.aggregate({
      where: { cotizacionId: cabeceraId },
      _max: { version: true },
    })
    return agg._max.version ?? 0
  },

  async crearVersion(tx, cabeceraId, numero, _datos: Datos, usuario): Promise<Version> {
    return tx.cotizacionVersion.create({
      data: {
        cotizacionId: cabeceraId,
        version: numero,
        // RN-DIN-01: montos como string, nunca number, también en fixtures.
        costoTotal: '0',
        margenTotal: '0',
        ventaTotal: '0',
        creadoPor: usuario,
      },
      select: { id: true, version: true },
    })
  },

  // v1 sin líneas en esta prueba: copiar es un no-op.
  async copiarLineas(): Promise<void> {},

  async fijarVigente(tx, cabeceraId, versionId): Promise<void> {
    await tx.cotizacion.update({
      where: { id: cabeceraId },
      data: { versionVigenteId: versionId },
    })
  },
}

let clienteId: number
let grupoId: number
let cotizacionId: number

beforeAll(async () => {
  const cliente = await prisma.cliente.create({
    data: { codigo: 'QA-CONC', tipo: 'AGENCIA', razonSocial: 'QA Concurrencia', monedaHabitual: 'USD', creadoPor: 'test' },
  })
  clienteId = cliente.id

  const grupo = await prisma.grupo.create({
    data: { codigo: 'GQA-CONC', apellido: 'QA', clienteId, cantidadPax: 1, creadoPor: 'test' },
  })
  grupoId = grupo.id

  const cot = await prisma.cotizacion.create({
    data: {
      numero: 'COT-QA-CONC',
      clienteId,
      grupoId,
      areaNegocio: 'RECEPTIVO',
      fechaOperacion: new Date(),
      cantidadPax: 2,
      moneda: 'USD',
      tipoCambio: '1',
      estado: 'BORRADOR',
      creadoPor: 'test',
    },
  })
  cotizacionId = cot.id

  // Línea base v1.
  await prisma.$transaction((tx) =>
    crearSiguienteVersion(tx, cotizacionVersionable, { cabeceraId: cotizacionId, datos: {}, usuario: 'test' }),
  )
})

afterAll(async () => {
  // Limpieza respetando los FK Restrict: soltar la vigente, borrar versiones, luego cabeceras.
  if (cotizacionId) {
    await prisma.cotizacion.update({ where: { id: cotizacionId }, data: { versionVigenteId: null } }).catch(() => {})
    await prisma.cotizacionVersion.deleteMany({ where: { cotizacionId } })
    await prisma.cotizacion.delete({ where: { id: cotizacionId } }).catch(() => {})
  }
  if (grupoId) await prisma.grupo.delete({ where: { id: grupoId } }).catch(() => {})
  if (clienteId) await prisma.cliente.delete({ where: { id: clienteId } }).catch(() => {})
  await prisma.$disconnect()
})

describe('versionado — RN-VER-04/07: concurrencia real serializada por advisory lock', () => {
  it('dos creaciones concurrentes producen versiones 2 y 3, sin duplicados ni saltos', async () => {
    const nueva = () =>
      prisma.$transaction((tx) =>
        crearSiguienteVersion(tx, cotizacionVersionable, {
          cabeceraId: cotizacionId,
          datos: {},
          usuario: 'test',
          motivo: 'concurrencia',
        }),
      )

    const [a, b] = await Promise.all([nueva(), nueva()])

    // Ninguna duplicada: los números salen 2 y 3.
    expect([a.version, b.version].sort((x, y) => x - y)).toEqual([2, 3])

    // El correlativo de versión no tiene saltos: 1, 2, 3.
    const versiones = await prisma.cotizacionVersion.findMany({
      where: { cotizacionId },
      orderBy: { version: 'asc' },
      select: { id: true, version: true },
    })
    expect(versiones.map((v) => v.version)).toEqual([1, 2, 3])

    // RN-VER-05: la vigente apunta a la última versión creada (la 3).
    const cab = await prisma.cotizacion.findUnique({
      where: { id: cotizacionId },
      select: { versionVigenteId: true },
    })
    const v3 = versiones.find((v) => v.version === 3)
    expect(cab?.versionVigenteId).toBe(v3?.id)
  })

  it('RN-VER-05: la base rechaza fijar como vigente una versión de otra cabecera', async () => {
    // Cabecera y versión ajenas.
    const otra = await prisma.cotizacion.create({
      data: {
        numero: 'COT-QA-CONC-2',
        clienteId,
        grupoId,
        areaNegocio: 'RECEPTIVO',
        fechaOperacion: new Date(),
        cantidadPax: 2,
        moneda: 'USD',
        tipoCambio: '1',
        estado: 'BORRADOR',
        creadoPor: 'test',
      },
    })
    const versionAjena = await prisma.cotizacionVersion.create({
      data: { cotizacionId: otra.id, version: 1, costoTotal: '0', margenTotal: '0', ventaTotal: '0', creadoPor: 'test' },
    })

    // Intentar apuntar la cotización original a una versión de `otra` debe fallar por la FK compuesta.
    await expect(
      prisma.cotizacion.update({
        where: { id: cotizacionId },
        data: { versionVigenteId: versionAjena.id },
      }),
    ).rejects.toThrow()

    // Limpieza de las filas ajenas.
    await prisma.cotizacion.update({ where: { id: otra.id }, data: { versionVigenteId: null } }).catch(() => {})
    await prisma.cotizacionVersion.deleteMany({ where: { cotizacionId: otra.id } })
    await prisma.cotizacion.delete({ where: { id: otra.id } }).catch(() => {})
  })
})
