import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import {
  crearZona,
  actualizarZona,
  eliminarZona,
  obtenerZona,
  listarZonas,
} from '../src/modules/config/zonas/zonas.service.js'
import { ErrorApp } from '../src/shared/errors.js'

// ============================================================================
// Zona — Docs/mantenedores.md §1. Código manual (sin correlativo), soft
// delete con guard de operaciones abiertas (RN-MAN-04) vía zonaId en
// Cotizacion/OrdenTrabajo.
// ============================================================================

try {
  process.loadEnvFile()
} catch {
  // .env ya cargado o inexistente.
}

const prisma = new PrismaClient()

const idsCreados: number[] = []
let clienteId: number
let grupoId: number

beforeAll(async () => {
  // RN-GEO-01: Cliente.paisId es FK al catálogo Pais sembrado.
  const { id: paisId } = await prisma.pais.findUniqueOrThrow({ where: { codigo: 'CHL' } })
  const cliente = await prisma.cliente.create({
    data: { codigo: 'QA-ZON-CLI', tipo: 'AGENCIA', razonSocial: 'QA Zonas', paisId, creadoPor: 'test' },
  })
  clienteId = cliente.id
  const grupo = await prisma.grupo.create({
    data: { codigo: 'QA-ZON-GR', apellido: 'QA', clienteId, cantidadPax: 2, creadoPor: 'test' },
  })
  grupoId = grupo.id
})

afterAll(async () => {
  await prisma.zona.deleteMany({ where: { id: { in: idsCreados } } }).catch(() => {})
  if (grupoId) await prisma.grupo.delete({ where: { id: grupoId } }).catch(() => {})
  if (clienteId) await prisma.cliente.delete({ where: { id: clienteId } }).catch(() => {})
  await prisma.$disconnect()
})

describe('crearZona', () => {
  it('crea una zona con código único', async () => {
    const zona = await crearZona({ codigo: 'QAZ1', nombre: 'Zona QA 1' }, 'test')
    idsCreados.push(zona.id)
    expect(zona.codigo).toBe('QAZ1')
  })

  it('rechaza un código duplicado (CONFLICT)', async () => {
    await expect(crearZona({ codigo: 'QAZ1', nombre: 'Otra' }, 'test')).rejects.toMatchObject({
      code: 'CONFLICT',
    })
  })
})

describe('RN-MAN-05: una zona eliminada sigue siendo accesible por id', () => {
  let zonaId: number

  beforeAll(async () => {
    const zona = await crearZona({ codigo: 'QAZ2', nombre: 'Zona QA 2' }, 'test')
    idsCreados.push(zona.id)
    zonaId = zona.id
    await eliminarZona(zonaId, 'test')
  })

  it('no aparece en el listado', async () => {
    const { data } = await listarZonas(1, 200)
    expect(data.some((z) => z.id === zonaId)).toBe(false)
  })

  it('sigue siendo accesible por id', async () => {
    const zona = await obtenerZona(zonaId)
    expect(zona.id).toBe(zonaId)
    expect(zona.eliminadoEn).not.toBeNull()
  })

  it('no admite más mutaciones (CONFLICT)', async () => {
    await expect(actualizarZona(zonaId, { nombre: 'Editada' }, 'test')).rejects.toMatchObject({
      code: 'CONFLICT',
    })
  })
})

describe('RN-MAN-04: soft delete bloqueado por operación no cerrada', () => {
  let zonaId: number
  let cotizacionId: number

  beforeAll(async () => {
    const zona = await crearZona({ codigo: 'QAZ3', nombre: 'Zona QA 3' }, 'test')
    idsCreados.push(zona.id)
    zonaId = zona.id

    const cot = await prisma.cotizacion.create({
      data: {
        numero: 'COT-QA-ZON',
        clienteId,
        grupoId,
        zonaId,
        areaNegocio: 'RECEPTIVO',
        fechaOperacion: new Date(),
        cantidadPax: 2,
        moneda: 'USD',
        tipoCambio: '1',
        estado: 'ENVIADA',
        creadoPor: 'test',
      },
    })
    cotizacionId = cot.id
  })

  afterAll(async () => {
    if (cotizacionId) await prisma.cotizacion.delete({ where: { id: cotizacionId } }).catch(() => {})
  })

  it('rechaza el borrado con CONFLICT y detalla la cotización', async () => {
    try {
      await eliminarZona(zonaId, 'test')
      expect.unreachable('debía rechazar el borrado')
    } catch (err) {
      const e = err as ErrorApp
      expect(e.code).toBe('CONFLICT')
      expect((e.details as { cotizaciones?: string[] })?.cotizaciones).toContain('COT-QA-ZON')
    }
  })

  it('permite el borrado una vez que la cotización se cierra (PERDIDA)', async () => {
    await prisma.cotizacion.update({ where: { id: cotizacionId }, data: { estado: 'PERDIDA' } })
    await expect(eliminarZona(zonaId, 'test')).resolves.toBeUndefined()
  })
})
