import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import {
  crearProveedor,
  actualizarProveedor,
  eliminarProveedor,
  obtenerProveedor,
  listarProveedores,
  crearAlias,
} from '../src/modules/proveedores/proveedores.service.js'

// ============================================================================
// Proveedor — Docs/mantenedores.md §5. RN-PRV-01 (RUT único salvo genérico),
// RN-PRV-02 (búsqueda por alias), RN-PRV-03 (alias único, incl. carrera),
// RN-PRV-05 (zonas N:N), más los guards genéricos RN-MAN-04/05.
// ============================================================================

try {
  process.loadEnvFile()
} catch {
  // .env ya cargado o inexistente.
}

const prisma = new PrismaClient()
const idsCreados: number[] = []
let tipoServicioId: number
let zonaAId: number
let zonaBId: number

beforeAll(async () => {
  const tipoServicio = await prisma.tipoServicio.findFirstOrThrow()
  tipoServicioId = tipoServicio.id
  const zonaA = await prisma.zona.create({ data: { codigo: 'QAP-ZA', nombre: 'Zona QA A', creadoPor: 'test' } })
  const zonaB = await prisma.zona.create({ data: { codigo: 'QAP-ZB', nombre: 'Zona QA B', creadoPor: 'test' } })
  zonaAId = zonaA.id
  zonaBId = zonaB.id
})

afterAll(async () => {
  await prisma.proveedorAlias.deleteMany({ where: { proveedorId: { in: idsCreados } } }).catch(() => {})
  await prisma.proveedorZona.deleteMany({ where: { proveedorId: { in: idsCreados } } }).catch(() => {})
  await prisma.proveedor.deleteMany({ where: { id: { in: idsCreados } } }).catch(() => {})
  await prisma.zona.deleteMany({ where: { id: { in: [zonaAId, zonaBId] } } }).catch(() => {})
  await prisma.$disconnect()
})

const base = (codigo: string, rut: string) => ({
  codigo,
  razonSocial: `Proveedor QA ${codigo}`,
  rut,
  // RN-PRV-08: tipoServicioId pasó de valor único a arreglo (N:N).
  tiposServicio: [tipoServicioId],
})

describe('RN-PRV-01: el RUT es obligatorio y único, salvo el genérico', () => {
  it('crea un proveedor con RUT válido', async () => {
    const proveedor = await crearProveedor(base('QAP-01', '11.111.111-1'), 'test')
    idsCreados.push(proveedor.id)
    expect(proveedor.rut).toBe('11111111-1')
  })

  it('rechaza un RUT real duplicado entre proveedores distintos', async () => {
    await expect(crearProveedor(base('QAP-02', '11111111-1'), 'test')).rejects.toMatchObject({
      code: 'CONFLICT',
    })
  })

  it('rechaza un RUT chileno inválido', async () => {
    await expect(crearProveedor(base('QAP-03', '11111111-9'), 'test')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    })
  })

  it('permite que el RUT genérico 55.555.555-5 se repita entre proveedores extranjeros distintos', async () => {
    const p1 = await crearProveedor(base('QAP-04', '55.555.555-5'), 'test')
    const p2 = await crearProveedor(base('QAP-05', '55.555.555-5'), 'test')
    idsCreados.push(p1.id, p2.id)
    expect(p1.rut).toBe('55555555-5')
    expect(p2.rut).toBe('55555555-5')
  })
})

describe('RN-PRV-02: la búsqueda encuentra por razón social, nombre comercial y alias', () => {
  it('encuentra por alias, no solo por razón social', async () => {
    const proveedor = await crearProveedor(
      { ...base('QAP-06', '22.222.222-2'), nombreComercial: 'Nombre Comercial QA' },
      'test',
    )
    idsCreados.push(proveedor.id)
    await crearAlias(proveedor.id, { alias: 'Glosa Bancaria QA' }, 'test')

    const porAlias = await listarProveedores(1, 20, { q: 'Glosa Bancaria' })
    expect(porAlias.data.some((p) => p.id === proveedor.id)).toBe(true)

    const porNombreComercial = await listarProveedores(1, 20, { q: 'Nombre Comercial QA' })
    expect(porNombreComercial.data.some((p) => p.id === proveedor.id)).toBe(true)

    const porRazonSocial = await listarProveedores(1, 20, { q: `Proveedor QA QAP-06` })
    expect(porRazonSocial.data.some((p) => p.id === proveedor.id)).toBe(true)
  })
})

describe('RN-PRV-03: un alias no puede repetirse entre proveedores distintos', () => {
  it('rechaza un alias duplicado contra otro proveedor', async () => {
    const p1 = await crearProveedor(base('QAP-07', '33.333.333-3'), 'test')
    const p2 = await crearProveedor(base('QAP-08', '44.444.444-4'), 'test')
    idsCreados.push(p1.id, p2.id)

    await crearAlias(p1.id, { alias: 'Alias Único QA' }, 'test')
    await expect(crearAlias(p2.id, { alias: 'Alias Único QA' }, 'test')).rejects.toMatchObject({
      code: 'CONFLICT',
    })
    // Insensible a mayúsculas.
    await expect(crearAlias(p2.id, { alias: 'alias único qa' }, 'test')).rejects.toMatchObject({
      code: 'CONFLICT',
    })
  })

  it('rechaza alias repetidos dentro del mismo payload de alta', async () => {
    await expect(
      crearProveedor(
        {
          ...base('QAP-09', '66.666.666-6'),
          alias: [{ alias: 'Repetido QA' }, { alias: 'Repetido QA' }],
        },
        'test',
      ),
    ).rejects.toMatchObject({ code: 'CONFLICT' })
  })

  it('dos altas concurrentes con el mismo alias: una gana, la otra recibe CONFLICT', async () => {
    const resultados = await Promise.allSettled([
      crearProveedor({ ...base('QAP-10A', '77.777.777-7'), alias: [{ alias: 'Alias Carrera QA' }] }, 'test'),
      crearProveedor({ ...base('QAP-10B', '88.888.888-8'), alias: [{ alias: 'Alias Carrera QA' }] }, 'test'),
    ])
    const cumplidas = resultados.filter((r) => r.status === 'fulfilled')
    const rechazadas = resultados.filter((r) => r.status === 'rejected')
    expect(cumplidas).toHaveLength(1)
    expect(rechazadas).toHaveLength(1)
    expect((rechazadas[0] as PromiseRejectedResult).reason).toMatchObject({ code: 'CONFLICT' })

    const ganador = (cumplidas[0] as PromiseFulfilledResult<{ id: number }>).value
    idsCreados.push(ganador.id)
  })
})

describe('RN-PRV-05: un proveedor puede operar en varias zonas a la vez', () => {
  it('crea el proveedor con dos zonas y permite reemplazarlas al editar', async () => {
    const proveedor = await crearProveedor({ ...base('QAP-11', '99.999.999-9'), zonas: [zonaAId, zonaBId] }, 'test')
    idsCreados.push(proveedor.id)

    const encontrado = await obtenerProveedor(proveedor.id)
    expect(encontrado!.zonas.map((z) => z.zonaId).sort()).toEqual([zonaAId, zonaBId].sort())

    await actualizarProveedor(proveedor.id, { zonas: [zonaAId] }, 'test')
    const actualizado = await obtenerProveedor(proveedor.id)
    expect(actualizado!.zonas.map((z) => z.zonaId)).toEqual([zonaAId])
  })
})

describe('RN-MAN-04/05: soft delete de proveedor', () => {
  it('RN-MAN-05: un proveedor eliminado sigue siendo accesible por id, pero no mutable', async () => {
    const proveedor = await crearProveedor(base('QAP-12', '12.345.678-5'), 'test')
    idsCreados.push(proveedor.id)
    await eliminarProveedor(proveedor.id, 'test')

    const encontrado = await obtenerProveedor(proveedor.id)
    expect(encontrado!.eliminadoEn).not.toBeNull()
    await expect(actualizarProveedor(proveedor.id, { razonSocial: 'x' }, 'test')).rejects.toMatchObject({
      code: 'CONFLICT',
    })
  })

  it('RN-MAN-04: rechaza el borrado si el proveedor tiene una OC vigente', async () => {
    const proveedor = await crearProveedor(base('QAP-13', '15.981.258-8'), 'test')
    idsCreados.push(proveedor.id)

    // RN-GEO-01: Cliente.paisId es FK al catálogo Pais sembrado.
    const { id: paisId } = await prisma.pais.findUniqueOrThrow({ where: { codigo: 'CHL' } })
    const cliente = await prisma.cliente.create({
      data: { codigo: 'QAP-13-CLI', tipo: 'AGENCIA', razonSocial: 'QA', paisId, creadoPor: 'test' },
    })
    const grupo = await prisma.grupo.create({
      data: { codigo: 'QAP-13-GR', apellido: 'QA', clienteId: cliente.id, cantidadPax: 1, creadoPor: 'test' },
    })
    const cot = await prisma.cotizacion.create({
      data: {
        numero: 'COT-QAP-13', clienteId: cliente.id, grupoId: grupo.id, areaNegocio: 'RECEPTIVO',
        fechaOperacion: new Date(), cantidadPax: 1, moneda: 'USD', tipoCambio: '1',
        estado: 'APROBADA', creadoPor: 'test',
      },
    })
    const ot = await prisma.ordenTrabajo.create({
      data: {
        numero: 'OT-QAP-13', cotizacionId: cot.id, clienteId: cliente.id, grupoId: grupo.id, apellido: 'QA',
        areaNegocio: 'RECEPTIVO', fechaOperacion: new Date(), cantidadPax: 1, moneda: 'USD',
        tipoCambioCotizacion: '1', creadoPor: 'test',
      },
    })
    const oc = await prisma.ordenCompra.create({
      data: { numero: 'OC-QAP-13', ordenTrabajoId: ot.id, proveedorId: proveedor.id, moneda: 'USD', estado: 'EMITIDA', creadoPor: 'test' },
    })

    await expect(eliminarProveedor(proveedor.id, 'test')).rejects.toMatchObject({ code: 'CONFLICT' })

    await prisma.ordenCompra.update({ where: { id: oc.id }, data: { estado: 'ANULADA' } })
    await expect(eliminarProveedor(proveedor.id, 'test')).resolves.toBeUndefined()

    await prisma.ordenCompra.delete({ where: { id: oc.id } }).catch(() => {})
    await prisma.ordenTrabajo.delete({ where: { id: ot.id } }).catch(() => {})
    await prisma.cotizacion.delete({ where: { id: cot.id } }).catch(() => {})
    await prisma.grupo.delete({ where: { id: grupo.id } }).catch(() => {})
    await prisma.cliente.delete({ where: { id: cliente.id } }).catch(() => {})
  })
})
