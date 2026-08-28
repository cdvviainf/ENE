import { describe, it, expect, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import {
  crearTipoServicio,
  actualizarTipoServicio,
  eliminarTipoServicio,
  obtenerTipoServicio,
  listarTiposServicio,
} from '../src/modules/config/tipos-servicio/tipos-servicio.service.js'

// ============================================================================
// TipoServicio — Docs/mantenedores.md §2. Código manual, sin correlativo.
// El guard de borrado NO es RN-MAN-04 (operaciones abiertas): es un guard
// referencial directo sobre Servicio/Proveedor vigentes.
// ============================================================================

try {
  process.loadEnvFile()
} catch {
  // .env ya cargado o inexistente.
}

const prisma = new PrismaClient()
const idsCreados: number[] = []

afterAll(async () => {
  await prisma.tipoServicio.deleteMany({ where: { id: { in: idsCreados } } }).catch(() => {})
  await prisma.$disconnect()
})

const nuevo = (codigo: string) => ({
  codigo,
  nombre: `Tipo ${codigo}`,
  modeloTarifaDefault: 'UNITARIO_PAX' as const,
  ventanaAvisoDias: 15,
})

describe('crearTipoServicio', () => {
  it('crea un tipo de servicio con código único', async () => {
    const tipo = await crearTipoServicio(nuevo('QAT1'), 'test')
    idsCreados.push(tipo.id)
    expect(tipo.codigo).toBe('QAT1')
    expect(tipo.ventanaAvisoDias).toBe(15)
  })

  it('rechaza un código duplicado (CONFLICT)', async () => {
    await expect(crearTipoServicio(nuevo('QAT1'), 'test')).rejects.toMatchObject({ code: 'CONFLICT' })
  })
})

describe('RN-MAN-05: un tipo de servicio eliminado sigue siendo accesible por id', () => {
  it('se puede consultar por id pero no mutar tras eliminarlo', async () => {
    const tipo = await crearTipoServicio(nuevo('QAT2'), 'test')
    idsCreados.push(tipo.id)
    await eliminarTipoServicio(tipo.id, 'test')

    const { data } = await listarTiposServicio(1, 200)
    expect(data.some((t) => t.id === tipo.id)).toBe(false)

    const encontrado = await obtenerTipoServicio(tipo.id)
    expect(encontrado.eliminadoEn).not.toBeNull()

    await expect(actualizarTipoServicio(tipo.id, { nombre: 'x' }, 'test')).rejects.toMatchObject({
      code: 'CONFLICT',
    })
  })
})

describe('guard referencial: no se elimina un tipo en uso por servicios o proveedores vigentes', () => {
  it('rechaza el borrado si un servicio vigente lo usa', async () => {
    const tipo = await crearTipoServicio(nuevo('QAT3'), 'test')
    idsCreados.push(tipo.id)

    const servicio = await prisma.servicio.create({
      data: {
        codigo: 'QAT3-SV',
        nombre: 'Servicio QA',
        tipoServicioId: tipo.id,
        modeloTarifa: 'UNITARIO_PAX',
        creadoPor: 'test',
      },
    })

    await expect(eliminarTipoServicio(tipo.id, 'test')).rejects.toMatchObject({ code: 'CONFLICT' })

    // Al eliminar el servicio (soft delete), el tipo queda libre para borrarse.
    await prisma.servicio.update({ where: { id: servicio.id }, data: { eliminadoEn: new Date() } })
    await expect(eliminarTipoServicio(tipo.id, 'test')).resolves.toBeUndefined()

    await prisma.servicio.delete({ where: { id: servicio.id } }).catch(() => {})
  })
})
