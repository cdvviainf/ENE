import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import {
  crearNegocio,
  actualizarNegocio,
  eliminarNegocio,
  obtenerNegocio,
  crearPasajero,
} from '../src/modules/negocios/negocios.service.js'

// ============================================================================
// Negocio — Docs/mantenedores.md §4. RN-GRP-02 (apellido no único), RN-GRP-04
// (pasajeros siempre opcionales), más los guards genéricos RN-MAN-04/05.
// ============================================================================

try {
  process.loadEnvFile()
} catch {
  // .env ya cargado o inexistente.
}

const prisma = new PrismaClient()
const idsCreados: number[] = []
const cotizacionesCreadas: number[] = []
let clienteId: number

beforeAll(async () => {
  // RN-GEO-01: Cliente.paisId es FK al catálogo Pais sembrado.
  const { id: paisId } = await prisma.pais.findUniqueOrThrow({ where: { codigo: 'CHL' } })
  const cliente = await prisma.cliente.create({
    data: { codigo: 'QAG-CLI', tipo: 'AGENCIA', razonSocial: 'QA Negocios', paisId, creadoPor: 'test' },
  })
  clienteId = cliente.id
})

afterAll(async () => {
  await prisma.cotizacion.deleteMany({ where: { id: { in: cotizacionesCreadas } } }).catch(() => {})
  await prisma.pasajero.deleteMany({ where: { negocioId: { in: idsCreados } } }).catch(() => {})
  await prisma.negocio.deleteMany({ where: { id: { in: idsCreados } } }).catch(() => {})
  if (clienteId) await prisma.cliente.delete({ where: { id: clienteId } }).catch(() => {})
  await prisma.$disconnect()
})

describe('RN-GRP-02: el apellido no es único', () => {
  it('permite dos negocios distintos con el mismo apellido', async () => {
    const g1 = await crearNegocio({ codigo: 'QAG-01', apellido: 'Pérez', clienteId, cantidadPax: 2 }, 'test')
    const g2 = await crearNegocio({ codigo: 'QAG-02', apellido: 'Pérez', clienteId, cantidadPax: 4 }, 'test')
    idsCreados.push(g1.id, g2.id)
    expect(g1.apellido).toBe('Pérez')
    expect(g2.apellido).toBe('Pérez')
    expect(g1.id).not.toBe(g2.id)
  })

  it('rechaza un código de negocio duplicado (sí es único)', async () => {
    await expect(
      crearNegocio({ codigo: 'QAG-01', apellido: 'Otro', clienteId, cantidadPax: 1 }, 'test'),
    ).rejects.toMatchObject({ code: 'CONFLICT' })
  })
})

describe('RN-GRP-04: el detalle de pasajeros es opcional y nunca bloquea', () => {
  it('crea un negocio sin pasajeros', async () => {
    const negocio = await crearNegocio({ codigo: 'QAG-03', apellido: 'Sin Pax', clienteId, cantidadPax: 3 }, 'test')
    idsCreados.push(negocio.id)
    const encontrado = await obtenerNegocio(negocio.id)
    expect(encontrado.pasajeros).toHaveLength(0)
  })

  it('crea un negocio con pasajeros en el mismo payload (RN-API-02) y admite agregar más después', async () => {
    const negocio = await crearNegocio(
      {
        codigo: 'QAG-04',
        apellido: 'Con Pax',
        clienteId,
        cantidadPax: 2,
        pasajeros: [{ nombre: 'Pasajero Uno' }],
      },
      'test',
    )
    idsCreados.push(negocio.id)
    expect(negocio.pasajeros).toHaveLength(1)

    await crearPasajero(negocio.id, { nombre: 'Pasajero Dos' }, 'test')
    const encontrado = await obtenerNegocio(negocio.id)
    expect(encontrado.pasajeros).toHaveLength(2)
  })
})

describe('RN-GRP-03: cantidadPax del negocio es referencial (no la usa el costeo)', () => {
  it('se puede editar libremente sin depender de otra entidad', async () => {
    const negocio = await crearNegocio({ codigo: 'QAG-05', apellido: 'Referencial', clienteId, cantidadPax: 2 }, 'test')
    idsCreados.push(negocio.id)
    const actualizado = await actualizarNegocio(negocio.id, { cantidadPax: 10 }, 'test')
    expect(actualizado.cantidadPax).toBe(10)
  })
})

describe('RN-MAN-04/05: soft delete de negocio', () => {
  it('RN-MAN-05: un negocio eliminado sigue siendo accesible por id, pero no mutable', async () => {
    const negocio = await crearNegocio({ codigo: 'QAG-06', apellido: 'Eliminado', clienteId, cantidadPax: 1 }, 'test')
    idsCreados.push(negocio.id)
    await eliminarNegocio(negocio.id, 'test')

    const encontrado = await obtenerNegocio(negocio.id)
    expect(encontrado.eliminadoEn).not.toBeNull()
    await expect(actualizarNegocio(negocio.id, { apellido: 'x' }, 'test')).rejects.toMatchObject({
      code: 'CONFLICT',
    })
  })

  it('RN-MAN-04: rechaza el borrado si el negocio tiene una OT no cerrada', async () => {
    const negocio = await crearNegocio({ codigo: 'QAG-07', apellido: 'Con OT', clienteId, cantidadPax: 1 }, 'test')
    idsCreados.push(negocio.id)

    const cot = await prisma.cotizacion.create({
      data: {
        numero: 'COT-QAG-07',
        clienteId,
        negocioId: negocio.id,
        areaNegocio: 'RECEPTIVO',
        fechaOperacion: new Date(),
        cantidadPax: 1,
        moneda: 'USD',
        tipoCambio: '1',
        estado: 'APROBADA',
        creadoPor: 'test',
      },
    })
    cotizacionesCreadas.push(cot.id)
    const ot = await prisma.ordenTrabajo.create({
      data: {
        numero: 'OT-QAG-07',
        cotizacionId: cot.id,
        clienteId,
        negocioId: negocio.id,
        apellido: 'Con OT',
        areaNegocio: 'RECEPTIVO',
        fechaOperacion: new Date(),
        cantidadPax: 1,
        moneda: 'USD',
        tipoCambioCotizacion: '1',
        estado: 'EN_ESPERA',
        creadoPor: 'test',
      },
    })

    await expect(eliminarNegocio(negocio.id, 'test')).rejects.toMatchObject({ code: 'CONFLICT' })

    await prisma.ordenTrabajo.update({ where: { id: ot.id }, data: { estado: 'CERRADA' } })
    await expect(eliminarNegocio(negocio.id, 'test')).resolves.toBeUndefined()

    await prisma.ordenTrabajo.delete({ where: { id: ot.id } }).catch(() => {})
  })
})
