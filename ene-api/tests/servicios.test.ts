import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import {
  crearServicio,
  actualizarServicio,
  eliminarServicio,
  obtenerServicio,
  listarServicios,
} from '../src/modules/servicios/servicios.service.js'

// ============================================================================
// Servicio — Docs/mantenedores.md §6. RN-SRV-02 (modeloTarifa inmutable con
// tarifarios cargados), RN-MAN-08 (advertencia sin traducción), más los
// guards genéricos RN-MAN-04/05.
// ============================================================================

try {
  process.loadEnvFile()
} catch {
  // .env ya cargado o inexistente.
}

const prisma = new PrismaClient()
const idsCreados: number[] = []
let tipoServicioId: number
let proveedorId: number

beforeAll(async () => {
  const tipoServicio = await prisma.tipoServicio.findFirstOrThrow()
  tipoServicioId = tipoServicio.id
  const proveedor = await prisma.proveedor.create({
    data: {
      codigo: 'QAS-PROV', razonSocial: 'QA Servicios', rut: '55555555-5', tipoServicioId, creadoPor: 'test',
    },
  })
  proveedorId = proveedor.id
})

afterAll(async () => {
  await prisma.tarifario.deleteMany({ where: { servicioId: { in: idsCreados } } }).catch(() => {})
  await prisma.servicio.deleteMany({ where: { id: { in: idsCreados } } }).catch(() => {})
  if (proveedorId) await prisma.proveedor.delete({ where: { id: proveedorId } }).catch(() => {})
  await prisma.$disconnect()
})

const base = (codigo: string) => ({
  codigo,
  nombre: `Servicio QA ${codigo}`,
  tipoServicioId,
  modeloTarifa: 'TRAMO_PAX' as const,
})

describe('RN-MAN-08: advertencia de traducción faltante', () => {
  it('permite guardar sin nombreEn pero lo marca en la respuesta', async () => {
    const servicio = await crearServicio(base('QAS-01'), 'test')
    idsCreados.push(servicio.id)
    const encontrado = await obtenerServicio(servicio.id)
    expect(encontrado.advertenciaSinTraduccion).toBe(true)
  })

  it('no advierte cuando sí trae nombreEn', async () => {
    const servicio = await crearServicio({ ...base('QAS-02'), nombreEn: 'QA Service' }, 'test')
    idsCreados.push(servicio.id)
    const encontrado = await obtenerServicio(servicio.id)
    expect(encontrado.advertenciaSinTraduccion).toBe(false)
  })

  it('el listado también marca la advertencia por fila', async () => {
    const { data } = await listarServicios(1, 200, {})
    const fila = data.find((s) => s.codigo === 'QAS-01')
    expect(fila?.advertenciaSinTraduccion).toBe(true)
  })
})

describe('RN-SRV-02: no se puede cambiar modeloTarifa con tarifarios cargados', () => {
  it('permite cambiar el modelo si no hay tarifarios', async () => {
    const servicio = await crearServicio(base('QAS-03'), 'test')
    idsCreados.push(servicio.id)
    const actualizado = await actualizarServicio(servicio.id, { modeloTarifa: 'UNITARIO_PAX' }, 'test')
    expect(actualizado.modeloTarifa).toBe('UNITARIO_PAX')
  })

  it('rechaza el cambio de modelo si el servicio tiene un tarifario, aunque esté inactivo', async () => {
    const servicio = await crearServicio(base('QAS-04'), 'test')
    idsCreados.push(servicio.id)
    await prisma.tarifario.create({
      data: {
        proveedorId,
        servicioId: servicio.id,
        moneda: 'USD',
        vigenciaDesde: new Date(),
        version: 1,
        activo: false,
        creadoPor: 'test',
      },
    })

    await expect(actualizarServicio(servicio.id, { modeloTarifa: 'ACOMODACION' }, 'test')).rejects.toMatchObject({
      code: 'CONFLICT',
    })
    // Actualizar otro campo sin tocar modeloTarifa sigue permitido.
    await expect(actualizarServicio(servicio.id, { nombre: 'Renombrado QA' }, 'test')).resolves.toMatchObject({
      nombre: 'Renombrado QA',
    })
  })
})

describe('RN-MAN-04/05: soft delete de servicio', () => {
  it('RN-MAN-05: un servicio eliminado sigue siendo accesible por id, pero no mutable', async () => {
    const servicio = await crearServicio(base('QAS-05'), 'test')
    idsCreados.push(servicio.id)
    await eliminarServicio(servicio.id, 'test')

    const encontrado = await obtenerServicio(servicio.id)
    expect(encontrado.eliminadoEn).not.toBeNull()
    await expect(actualizarServicio(servicio.id, { nombre: 'x' }, 'test')).rejects.toMatchObject({
      code: 'CONFLICT',
    })
  })

  it('RN-MAN-04: rechaza el borrado si el servicio está en una línea de cotización no cerrada', async () => {
    const servicio = await crearServicio(base('QAS-06'), 'test')
    idsCreados.push(servicio.id)

    // RN-GEO-01: Cliente.paisId es FK al catálogo Pais sembrado.
    const { id: paisId } = await prisma.pais.findUniqueOrThrow({ where: { codigo: 'CHL' } })
    const cliente = await prisma.cliente.create({
      data: { codigo: 'QAS-06-CLI', tipo: 'AGENCIA', razonSocial: 'QA', paisId, creadoPor: 'test' },
    })
    const grupo = await prisma.grupo.create({
      data: { codigo: 'QAS-06-GR', apellido: 'QA', clienteId: cliente.id, cantidadPax: 1, creadoPor: 'test' },
    })
    const cot = await prisma.cotizacion.create({
      data: {
        numero: 'COT-QAS-06', clienteId: cliente.id, grupoId: grupo.id, areaNegocio: 'RECEPTIVO',
        fechaOperacion: new Date(), cantidadPax: 1, moneda: 'USD', tipoCambio: '1',
        estado: 'ENVIADA', creadoPor: 'test',
      },
    })
    const version = await prisma.cotizacionVersion.create({
      data: {
        cotizacionId: cot.id, version: 1, costoTotal: '100', margenTotal: '50', ventaTotal: '150', creadoPor: 'test',
      },
    })
    const linea = await prisma.cotizacionLinea.create({
      data: {
        cotizacionVersionId: version.id, dia: 1, bloque: 'AM', orden: 1, tipoLinea: 'ESTANDAR',
        servicioId: servicio.id, descripcion: 'QA', cantidadPax: 1,
        costoUnitario: '100', costoTotal: '100', margenPct: '0.5', ventaTotal: '150',
      },
    })

    await expect(eliminarServicio(servicio.id, 'test')).rejects.toMatchObject({ code: 'CONFLICT' })

    await prisma.cotizacion.update({ where: { id: cot.id }, data: { estado: 'PERDIDA' } })
    await expect(eliminarServicio(servicio.id, 'test')).resolves.toBeUndefined()

    await prisma.cotizacionLinea.delete({ where: { id: linea.id } }).catch(() => {})
    await prisma.cotizacionVersion.delete({ where: { id: version.id } }).catch(() => {})
    await prisma.cotizacion.delete({ where: { id: cot.id } }).catch(() => {})
    await prisma.grupo.delete({ where: { id: grupo.id } }).catch(() => {})
    await prisma.cliente.delete({ where: { id: cliente.id } }).catch(() => {})
  })
})
