import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import {
  crearGrupo,
  actualizarGrupo,
  eliminarGrupo,
  obtenerGrupo,
  crearPasajero,
} from '../src/modules/grupos/grupos.service.js'

// ============================================================================
// Grupo — Docs/mantenedores.md §4. RN-GRP-02 (apellido no único), RN-GRP-04
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
  const cliente = await prisma.cliente.create({
    data: { codigo: 'QAG-CLI', tipo: 'AGENCIA', razonSocial: 'QA Grupos', pais: 'Chile', creadoPor: 'test' },
  })
  clienteId = cliente.id
})

afterAll(async () => {
  await prisma.cotizacion.deleteMany({ where: { id: { in: cotizacionesCreadas } } }).catch(() => {})
  await prisma.pasajero.deleteMany({ where: { grupoId: { in: idsCreados } } }).catch(() => {})
  await prisma.grupo.deleteMany({ where: { id: { in: idsCreados } } }).catch(() => {})
  if (clienteId) await prisma.cliente.delete({ where: { id: clienteId } }).catch(() => {})
  await prisma.$disconnect()
})

describe('RN-GRP-02: el apellido no es único', () => {
  it('permite dos grupos distintos con el mismo apellido', async () => {
    const g1 = await crearGrupo({ codigo: 'QAG-01', apellido: 'Pérez', clienteId, cantidadPax: 2 }, 'test')
    const g2 = await crearGrupo({ codigo: 'QAG-02', apellido: 'Pérez', clienteId, cantidadPax: 4 }, 'test')
    idsCreados.push(g1.id, g2.id)
    expect(g1.apellido).toBe('Pérez')
    expect(g2.apellido).toBe('Pérez')
    expect(g1.id).not.toBe(g2.id)
  })

  it('rechaza un código de grupo duplicado (sí es único)', async () => {
    await expect(
      crearGrupo({ codigo: 'QAG-01', apellido: 'Otro', clienteId, cantidadPax: 1 }, 'test'),
    ).rejects.toMatchObject({ code: 'CONFLICT' })
  })
})

describe('RN-GRP-04: el detalle de pasajeros es opcional y nunca bloquea', () => {
  it('crea un grupo sin pasajeros', async () => {
    const grupo = await crearGrupo({ codigo: 'QAG-03', apellido: 'Sin Pax', clienteId, cantidadPax: 3 }, 'test')
    idsCreados.push(grupo.id)
    const encontrado = await obtenerGrupo(grupo.id)
    expect(encontrado.pasajeros).toHaveLength(0)
  })

  it('crea un grupo con pasajeros en el mismo payload (RN-API-02) y admite agregar más después', async () => {
    const grupo = await crearGrupo(
      {
        codigo: 'QAG-04',
        apellido: 'Con Pax',
        clienteId,
        cantidadPax: 2,
        pasajeros: [{ nombre: 'Pasajero Uno' }],
      },
      'test',
    )
    idsCreados.push(grupo.id)
    expect(grupo.pasajeros).toHaveLength(1)

    await crearPasajero(grupo.id, { nombre: 'Pasajero Dos' }, 'test')
    const encontrado = await obtenerGrupo(grupo.id)
    expect(encontrado.pasajeros).toHaveLength(2)
  })
})

describe('RN-GRP-03: cantidadPax del grupo es referencial (no la usa el costeo)', () => {
  it('se puede editar libremente sin depender de otra entidad', async () => {
    const grupo = await crearGrupo({ codigo: 'QAG-05', apellido: 'Referencial', clienteId, cantidadPax: 2 }, 'test')
    idsCreados.push(grupo.id)
    const actualizado = await actualizarGrupo(grupo.id, { cantidadPax: 10 }, 'test')
    expect(actualizado.cantidadPax).toBe(10)
  })
})

describe('RN-MAN-04/05: soft delete de grupo', () => {
  it('RN-MAN-05: un grupo eliminado sigue siendo accesible por id, pero no mutable', async () => {
    const grupo = await crearGrupo({ codigo: 'QAG-06', apellido: 'Eliminado', clienteId, cantidadPax: 1 }, 'test')
    idsCreados.push(grupo.id)
    await eliminarGrupo(grupo.id, 'test')

    const encontrado = await obtenerGrupo(grupo.id)
    expect(encontrado.eliminadoEn).not.toBeNull()
    await expect(actualizarGrupo(grupo.id, { apellido: 'x' }, 'test')).rejects.toMatchObject({
      code: 'CONFLICT',
    })
  })

  it('RN-MAN-04: rechaza el borrado si el grupo tiene una OT no cerrada', async () => {
    const grupo = await crearGrupo({ codigo: 'QAG-07', apellido: 'Con OT', clienteId, cantidadPax: 1 }, 'test')
    idsCreados.push(grupo.id)

    const cot = await prisma.cotizacion.create({
      data: {
        numero: 'COT-QAG-07',
        clienteId,
        grupoId: grupo.id,
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
        grupoId: grupo.id,
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

    await expect(eliminarGrupo(grupo.id, 'test')).rejects.toMatchObject({ code: 'CONFLICT' })

    await prisma.ordenTrabajo.update({ where: { id: ot.id }, data: { estado: 'CERRADA' } })
    await expect(eliminarGrupo(grupo.id, 'test')).resolves.toBeUndefined()

    await prisma.ordenTrabajo.delete({ where: { id: ot.id } }).catch(() => {})
  })
})
