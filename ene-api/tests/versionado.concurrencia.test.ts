import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { crearSiguienteVersion } from '../src/shared/versionado/index.js'
import { cotizacionVersionable } from '../src/shared/versionado/adaptadores/cotizacion.js'

// ============================================================================
// Versionado — INTEGRACIÓN contra PostgreSQL usando el adaptador REAL de
// Cotización (RN-VER-04/05/07). El fake de versionado.test.ts prueba la lógica
// pura; esto prueba serialización real de dos transacciones sobre la misma
// cabecera. Caso obligatorio #6 de Docs/reglas-negocio.md §15.
//
// Requiere el Postgres del docker-compose arriba (DATABASE_URL en .env). No se
// importa el singleton `prisma` de la app para no disparar el parser de env.ts.
// ============================================================================

try {
  process.loadEnvFile()
} catch {
  // .env ya cargado o inexistente; PrismaClient fallará con mensaje claro.
}

const prisma = new PrismaClient()

let clienteId: number
let grupoId: number
let cotizacionId: number

beforeAll(async () => {
  // RN-GEO-01: Cliente.paisId es FK al catálogo Pais sembrado.
  const { id: paisId } = await prisma.pais.findUniqueOrThrow({ where: { codigo: 'CHL' } })
  const cliente = await prisma.cliente.create({
    data: {
      codigo: 'QA-CONC',
      tipo: 'AGENCIA',
      razonSocial: 'QA Concurrencia',
      paisId,
      monedaHabitual: 'USD',
      creadoPor: 'test',
    },
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
    crearSiguienteVersion(tx, cotizacionVersionable, {
      cabeceraId: cotizacionId,
      datos: { costoTotal: '0', margenTotal: '0', ventaTotal: '0' },
      usuario: 'test',
    }),
  )
})

afterAll(async () => {
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
          datos: { costoTotal: '0', margenTotal: '0', ventaTotal: '0' },
          usuario: 'test',
          motivo: 'concurrencia',
        }),
      )

    const [a, b] = await Promise.all([nueva(), nueva()])

    expect([a.version, b.version].sort((x, y) => x - y)).toEqual([2, 3])

    const versiones = await prisma.cotizacionVersion.findMany({
      where: { cotizacionId },
      orderBy: { version: 'asc' },
      select: { id: true, version: true },
    })
    expect(versiones.map((v) => v.version)).toEqual([1, 2, 3])

    const cab = await prisma.cotizacion.findUnique({
      where: { id: cotizacionId },
      select: { versionVigenteId: true },
    })
    const v3 = versiones.find((v) => v.version === 3)
    expect(cab?.versionVigenteId).toBe(v3?.id)
  })

  it('RN-VER-05: la base rechaza fijar como vigente una versión de otra cabecera', async () => {
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

    await expect(
      prisma.cotizacion.update({
        where: { id: cotizacionId },
        data: { versionVigenteId: versionAjena.id },
      }),
    ).rejects.toThrow()

    await prisma.cotizacion.update({ where: { id: otra.id }, data: { versionVigenteId: null } }).catch(() => {})
    await prisma.cotizacionVersion.deleteMany({ where: { cotizacionId: otra.id } })
    await prisma.cotizacion.delete({ where: { id: otra.id } }).catch(() => {})
  })
})
