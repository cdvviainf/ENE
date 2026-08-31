import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import {
  crearSiguienteVersion,
  versionBase,
  cargarVersionHistorica,
} from '../src/shared/versionado/index.js'
import { ordenTrabajoVersionable } from '../src/shared/versionado/adaptadores/ordenTrabajo.js'
import { ordenCompraVersionable } from '../src/shared/versionado/adaptadores/ordenCompra.js'

// ============================================================================
// Versionado — INTEGRACIÓN de los adaptadores concretos de OT y OC contra
// PostgreSQL. Cubre RN-VER-09 (lectura histórica), RN-VER-10 (tipoCambio en OT),
// RN-VER-12 (línea base) y RN-VER-13 (OC referencia la versión de OT).
// Requiere el Postgres del docker-compose arriba.
// ============================================================================

try {
  process.loadEnvFile()
} catch {
  // .env ya cargado o inexistente.
}

const prisma = new PrismaClient()

let clienteId: number
let grupoId: number
let proveedorId: number
let cotizacionId: number
let otId: number
let ocId: number
let otV1Id: number

beforeAll(async () => {
  // RN-GEO-01: Cliente.paisId es FK al catálogo Pais sembrado.
  const { id: paisId } = await prisma.pais.findUniqueOrThrow({ where: { codigo: 'CHL' } })
  const cliente = await prisma.cliente.create({
    data: {
      codigo: 'QA-ADAP',
      tipo: 'AGENCIA',
      razonSocial: 'QA Adaptadores',
      paisId,
      monedaHabitual: 'USD',
      creadoPor: 'test',
    },
  })
  clienteId = cliente.id

  const grupo = await prisma.grupo.create({
    data: { codigo: 'GQA-ADAP', apellido: 'QA', clienteId, cantidadPax: 2, creadoPor: 'test' },
  })
  grupoId = grupo.id

  const tipoServicio = await prisma.tipoServicio.findFirstOrThrow()
  const proveedor = await prisma.proveedor.create({
    data: {
      codigo: 'PQA-ADAP',
      razonSocial: 'Proveedor QA',
      rut: '55555555-5',
      tipoServicioId: tipoServicio.id,
      creadoPor: 'test',
    },
  })
  proveedorId = proveedor.id

  const cot = await prisma.cotizacion.create({
    data: {
      numero: 'COT-QA-ADAP',
      clienteId,
      grupoId,
      areaNegocio: 'RECEPTIVO',
      fechaOperacion: new Date(),
      cantidadPax: 2,
      moneda: 'USD',
      tipoCambio: '1',
      estado: 'APROBADA',
      creadoPor: 'test',
    },
  })
  cotizacionId = cot.id

  const ot = await prisma.ordenTrabajo.create({
    data: {
      numero: 'OT-QA-ADAP',
      cotizacionId,
      clienteId,
      grupoId,
      apellido: 'QA',
      areaNegocio: 'RECEPTIVO',
      fechaOperacion: new Date(),
      cantidadPax: 2,
      moneda: 'USD',
      tipoCambioCotizacion: '1',
      creadoPor: 'test',
    },
  })
  otId = ot.id

  const oc = await prisma.ordenCompra.create({
    data: { numero: 'OC-QA-ADAP', ordenTrabajoId: otId, proveedorId, moneda: 'USD', creadoPor: 'test' },
  })
  ocId = oc.id

  // Línea base v1 de la OT + una línea guardada en esa versión.
  const v1 = await prisma.$transaction((tx) =>
    crearSiguienteVersion(tx, ordenTrabajoVersionable, {
      cabeceraId: otId,
      datos: { costoTeoricoTotal: '100', margenTotal: '50', ventaTotal: '150' },
      usuario: 'test',
    }),
  )
  otV1Id = v1.id

  await prisma.ordenTrabajoLinea.create({
    data: {
      ordenTrabajoVersionId: otV1Id,
      dia: 1,
      bloque: 'AM',
      tipoLinea: 'ESTANDAR',
      descripcion: 'City tour',
      cantidadPax: 2,
      costoTeorico: '100',
      margenPct: '0.5',
      ventaLinea: '150',
      estadoServicio: 'PENDIENTE',
    },
  })
})

afterAll(async () => {
  // OC
  if (ocId) {
    await prisma.ordenCompra.update({ where: { id: ocId }, data: { versionVigenteId: null } }).catch(() => {})
    const ocVers = await prisma.ordenCompraVersion.findMany({ where: { ordenCompraId: ocId }, select: { id: true } })
    await prisma.ordenCompraLinea.deleteMany({ where: { ordenCompraVersionId: { in: ocVers.map((v) => v.id) } } })
    await prisma.ordenCompraVersion.deleteMany({ where: { ordenCompraId: ocId } })
    await prisma.ordenCompra.delete({ where: { id: ocId } }).catch(() => {})
  }
  // OT
  if (otId) {
    await prisma.ordenTrabajo.update({ where: { id: otId }, data: { versionVigenteId: null } }).catch(() => {})
    const otVers = await prisma.ordenTrabajoVersion.findMany({ where: { ordenTrabajoId: otId }, select: { id: true } })
    await prisma.ordenTrabajoLinea.deleteMany({ where: { ordenTrabajoVersionId: { in: otVers.map((v) => v.id) } } })
    await prisma.ordenTrabajoVersion.deleteMany({ where: { ordenTrabajoId: otId } })
    await prisma.ordenTrabajo.delete({ where: { id: otId } }).catch(() => {})
  }
  // Cotización
  if (cotizacionId) {
    await prisma.cotizacion.update({ where: { id: cotizacionId }, data: { versionVigenteId: null } }).catch(() => {})
    await prisma.cotizacionVersion.deleteMany({ where: { cotizacionId } })
    await prisma.cotizacion.delete({ where: { id: cotizacionId } }).catch(() => {})
  }
  if (proveedorId) await prisma.proveedor.delete({ where: { id: proveedorId } }).catch(() => {})
  if (grupoId) await prisma.grupo.delete({ where: { id: grupoId } }).catch(() => {})
  if (clienteId) await prisma.cliente.delete({ where: { id: clienteId } }).catch(() => {})
  await prisma.$disconnect()
})

describe('versionado OT — RN-VER-10: tipoCambio obligatorio desde la v2', () => {
  it('rechaza crear la v2 sin declarar tipoCambio', async () => {
    await expect(
      prisma.$transaction((tx) =>
        crearSiguienteVersion(tx, ordenTrabajoVersionable, {
          cabeceraId: otId,
          datos: { costoTeoricoTotal: '100', margenTotal: '50', ventaTotal: '150' },
          usuario: 'test',
          motivo: 'sin tipoCambio',
        }),
      ),
    ).rejects.toThrow(/RN-VER-10|tipoCambio/i)
  })

  it('crea la v2 con tipoCambio CORRECCION y copia las líneas de la v1', async () => {
    const v2 = await prisma.$transaction((tx) =>
      crearSiguienteVersion(tx, ordenTrabajoVersionable, {
        cabeceraId: otId,
        datos: { tipoCambio: 'CORRECCION', costoTeoricoTotal: '100', margenTotal: '50', ventaTotal: '150' },
        usuario: 'test',
        motivo: 'corrige glosa',
      }),
    )

    expect(v2.version).toBe(2)
    expect(v2.tipoCambio).toBe('CORRECCION')

    const lineasV2 = await prisma.ordenTrabajoLinea.findMany({ where: { ordenTrabajoVersionId: v2.id } })
    expect(lineasV2).toHaveLength(1)
    expect(lineasV2[0].descripcion).toBe('City tour')
  })

  it('rechaza una CORRECCION que cambia el ventaTotal respecto de la vigente', async () => {
    await expect(
      prisma.$transaction((tx) =>
        crearSiguienteVersion(tx, ordenTrabajoVersionable, {
          cabeceraId: otId,
          datos: { tipoCambio: 'CORRECCION', costoTeoricoTotal: '100', margenTotal: '50', ventaTotal: '999' },
          usuario: 'test',
          motivo: 'intenta subir la venta',
        }),
      ),
    ).rejects.toThrow(/RN-VER-10|no puede cambiar la venta/i)
  })

  it('RN-VER-11: rechaza una CORRECCION que cambia el costo teórico (misma venta)', async () => {
    await expect(
      prisma.$transaction((tx) =>
        crearSiguienteVersion(tx, ordenTrabajoVersionable, {
          cabeceraId: otId,
          datos: { tipoCambio: 'CORRECCION', costoTeoricoTotal: '200', margenTotal: '-50', ventaTotal: '150' },
          usuario: 'test',
          motivo: 'variación solo de costo',
        }),
      ),
    ).rejects.toThrow(/RN-VER-11|variación de costo/i)
  })

  it('RN-VER-10: rechaza un ALCANCE sin aprobación del cliente', async () => {
    await expect(
      prisma.$transaction((tx) =>
        crearSiguienteVersion(tx, ordenTrabajoVersionable, {
          cabeceraId: otId,
          datos: { tipoCambio: 'ALCANCE', costoTeoricoTotal: '200', margenTotal: '100', ventaTotal: '300' },
          usuario: 'test',
          motivo: 'agrega un servicio',
        }),
      ),
    ).rejects.toThrow(/RN-VER-10|aprobación del cliente/i)
  })

  it('RN-VER-10: acepta un ALCANCE con aprobación del cliente y venta distinta', async () => {
    const vAlcance = await prisma.$transaction((tx) =>
      crearSiguienteVersion(tx, ordenTrabajoVersionable, {
        cabeceraId: otId,
        datos: {
          tipoCambio: 'ALCANCE',
          aprobadoPorCliente: true,
          costoTeoricoTotal: '200',
          margenTotal: '100',
          ventaTotal: '300',
        },
        usuario: 'test',
        motivo: 'agrega un servicio, aprobado',
      }),
    )
    expect(vAlcance.tipoCambio).toBe('ALCANCE')
    expect(vAlcance.ventaTotal.toString()).toBe('300')
  })
})

describe('versionado OT — RN-VER-12/09: línea base y lectura histórica inmutable', () => {
  it('versionBase devuelve la v1 con sus líneas originales', async () => {
    const base = await prisma.$transaction((tx) => versionBase(tx, ordenTrabajoVersionable, otId))
    expect(base?.version.version).toBe(1)
    expect(base?.lineas).toHaveLength(1)
    expect(base?.lineas[0].descripcion).toBe('City tour')
  })

  it('editar la línea de la v2 no altera la lectura histórica de la v1', async () => {
    // Modifica la línea copiada en la v2.
    await prisma.ordenTrabajoLinea.updateMany({
      where: { ordenTrabajoVersionId: { not: otV1Id }, descripcion: 'City tour' },
      data: { descripcion: 'City tour EDITADO' },
    })

    const hist = await prisma.$transaction((tx) => cargarVersionHistorica(tx, ordenTrabajoVersionable, otId, 1))
    expect(hist?.lineas[0].descripcion).toBe('City tour') // la v1 permanece intacta
  })
})

describe('versionado OC — RN-VER-13: la versión de OC referencia la versión de OT', () => {
  it('crea la v1 de OC guardando el ordenTrabajoVersionId contra el que se emitió', async () => {
    const ocv1 = await prisma.$transaction((tx) =>
      crearSiguienteVersion(tx, ordenCompraVersionable, {
        cabeceraId: ocId,
        datos: { ordenTrabajoVersionId: otV1Id, montoTotal: '200' },
        usuario: 'test',
      }),
    )

    expect(ocv1.version).toBe(1)
    expect(ocv1.ordenTrabajoVersionId).toBe(otV1Id)

    const found = await prisma.$transaction((tx) =>
      ordenCompraVersionable.cargarVersionPorNumero(tx, ocId, 1),
    )
    expect(found?.id).toBe(ocv1.id)
  })

  it('rechaza una versión de OC que referencia la versión de OTRA OT', async () => {
    // OT ajena con su propia cotización (OT.cotizacionId es único).
    const cotB = await prisma.cotizacion.create({
      data: {
        numero: 'COT-QA-ADAP-B',
        clienteId,
        grupoId,
        areaNegocio: 'RECEPTIVO',
        fechaOperacion: new Date(),
        cantidadPax: 2,
        moneda: 'USD',
        tipoCambio: '1',
        estado: 'APROBADA',
        creadoPor: 'test',
      },
    })
    const otB = await prisma.ordenTrabajo.create({
      data: {
        numero: 'OT-QA-ADAP-B',
        cotizacionId: cotB.id,
        clienteId,
        grupoId,
        apellido: 'QA',
        areaNegocio: 'RECEPTIVO',
        fechaOperacion: new Date(),
        cantidadPax: 2,
        moneda: 'USD',
        tipoCambioCotizacion: '1',
        creadoPor: 'test',
      },
    })
    const otBv1 = await prisma.$transaction((tx) =>
      crearSiguienteVersion(tx, ordenTrabajoVersionable, {
        cabeceraId: otB.id,
        datos: { costoTeoricoTotal: '0', margenTotal: '0', ventaTotal: '0' },
        usuario: 'test',
      }),
    )

    await expect(
      prisma.$transaction((tx) =>
        crearSiguienteVersion(tx, ordenCompraVersionable, {
          cabeceraId: ocId,
          datos: { ordenTrabajoVersionId: otBv1.id, montoTotal: '50' },
          usuario: 'test',
          motivo: 'ot ajena',
        }),
      ),
    ).rejects.toThrow(/RN-VER-13|misma OT/i)

    // Limpieza de la OT/cotización ajenas.
    await prisma.ordenTrabajo.update({ where: { id: otB.id }, data: { versionVigenteId: null } }).catch(() => {})
    await prisma.ordenTrabajoVersion.deleteMany({ where: { ordenTrabajoId: otB.id } })
    await prisma.ordenTrabajo.delete({ where: { id: otB.id } }).catch(() => {})
    await prisma.cotizacion.update({ where: { id: cotB.id }, data: { versionVigenteId: null } }).catch(() => {})
    await prisma.cotizacionVersion.deleteMany({ where: { cotizacionId: cotB.id } })
    await prisma.cotizacion.delete({ where: { id: cotB.id } }).catch(() => {})
  })
})

describe('versionado OT/OC — RN-VER-04/07: concurrencia con namespaces propios', () => {
  it('OT: dos creaciones concurrentes producen versiones 2 y 3 sin duplicados', async () => {
    const cot = await prisma.cotizacion.create({
      data: {
        numero: 'COT-QA-ADAP-OTC', clienteId, grupoId, areaNegocio: 'RECEPTIVO',
        fechaOperacion: new Date(), cantidadPax: 2, moneda: 'USD', tipoCambio: '1',
        estado: 'APROBADA', creadoPor: 'test',
      },
    })
    const ot = await prisma.ordenTrabajo.create({
      data: {
        numero: 'OT-QA-ADAP-OTC', cotizacionId: cot.id, clienteId, grupoId, apellido: 'QA',
        areaNegocio: 'RECEPTIVO', fechaOperacion: new Date(), cantidadPax: 2, moneda: 'USD',
        tipoCambioCotizacion: '1', creadoPor: 'test',
      },
    })
    await prisma.$transaction((tx) =>
      crearSiguienteVersion(tx, ordenTrabajoVersionable, {
        cabeceraId: ot.id,
        datos: { costoTeoricoTotal: '100', margenTotal: '50', ventaTotal: '150' },
        usuario: 'test',
      }),
    )

    // CORRECCION con la MISMA venta que la vigente: pasa la validación RN-VER-10.
    const nueva = () =>
      prisma.$transaction((tx) =>
        crearSiguienteVersion(tx, ordenTrabajoVersionable, {
          cabeceraId: ot.id,
          datos: { tipoCambio: 'CORRECCION', costoTeoricoTotal: '100', margenTotal: '50', ventaTotal: '150' },
          usuario: 'test',
          motivo: 'concurrencia',
        }),
      )
    const [a, b] = await Promise.all([nueva(), nueva()])
    expect([a.version, b.version].sort((x, y) => x - y)).toEqual([2, 3])

    await prisma.ordenTrabajo.update({ where: { id: ot.id }, data: { versionVigenteId: null } }).catch(() => {})
    await prisma.ordenTrabajoVersion.deleteMany({ where: { ordenTrabajoId: ot.id } })
    await prisma.ordenTrabajo.delete({ where: { id: ot.id } }).catch(() => {})
    await prisma.cotizacion.update({ where: { id: cot.id }, data: { versionVigenteId: null } }).catch(() => {})
    await prisma.cotizacionVersion.deleteMany({ where: { cotizacionId: cot.id } })
    await prisma.cotizacion.delete({ where: { id: cot.id } }).catch(() => {})
  })

  it('OC: dos creaciones concurrentes producen versiones 2 y 3 sin duplicados', async () => {
    const cot = await prisma.cotizacion.create({
      data: {
        numero: 'COT-QA-ADAP-OCC', clienteId, grupoId, areaNegocio: 'RECEPTIVO',
        fechaOperacion: new Date(), cantidadPax: 2, moneda: 'USD', tipoCambio: '1',
        estado: 'APROBADA', creadoPor: 'test',
      },
    })
    const ot = await prisma.ordenTrabajo.create({
      data: {
        numero: 'OT-QA-ADAP-OCC', cotizacionId: cot.id, clienteId, grupoId, apellido: 'QA',
        areaNegocio: 'RECEPTIVO', fechaOperacion: new Date(), cantidadPax: 2, moneda: 'USD',
        tipoCambioCotizacion: '1', creadoPor: 'test',
      },
    })
    const otv1 = await prisma.$transaction((tx) =>
      crearSiguienteVersion(tx, ordenTrabajoVersionable, {
        cabeceraId: ot.id,
        datos: { costoTeoricoTotal: '0', margenTotal: '0', ventaTotal: '0' },
        usuario: 'test',
      }),
    )
    const oc = await prisma.ordenCompra.create({
      data: { numero: 'OC-QA-ADAP-OCC', ordenTrabajoId: ot.id, proveedorId, moneda: 'USD', creadoPor: 'test' },
    })
    await prisma.$transaction((tx) =>
      crearSiguienteVersion(tx, ordenCompraVersionable, {
        cabeceraId: oc.id,
        datos: { ordenTrabajoVersionId: otv1.id, montoTotal: '100' },
        usuario: 'test',
      }),
    )

    const nueva = () =>
      prisma.$transaction((tx) =>
        crearSiguienteVersion(tx, ordenCompraVersionable, {
          cabeceraId: oc.id,
          datos: { ordenTrabajoVersionId: otv1.id, montoTotal: '100' },
          usuario: 'test',
          motivo: 'concurrencia',
        }),
      )
    const [a, b] = await Promise.all([nueva(), nueva()])
    expect([a.version, b.version].sort((x, y) => x - y)).toEqual([2, 3])

    await prisma.ordenCompra.update({ where: { id: oc.id }, data: { versionVigenteId: null } }).catch(() => {})
    await prisma.ordenCompraVersion.deleteMany({ where: { ordenCompraId: oc.id } })
    await prisma.ordenCompra.delete({ where: { id: oc.id } }).catch(() => {})
    await prisma.ordenTrabajo.update({ where: { id: ot.id }, data: { versionVigenteId: null } }).catch(() => {})
    await prisma.ordenTrabajoVersion.deleteMany({ where: { ordenTrabajoId: ot.id } })
    await prisma.ordenTrabajo.delete({ where: { id: ot.id } }).catch(() => {})
    await prisma.cotizacion.update({ where: { id: cot.id }, data: { versionVigenteId: null } }).catch(() => {})
    await prisma.cotizacionVersion.deleteMany({ where: { cotizacionId: cot.id } })
    await prisma.cotizacion.delete({ where: { id: cot.id } }).catch(() => {})
  })
})
