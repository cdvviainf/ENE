import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import {
  crearTarifaVenta,
  crearNuevaVersion,
  editarTarifaVenta,
  listarServiciosConTarifa,
  resolverTarifaVentaVigente,
  estadoDeTarifa,
  representativa,
  estadoDeServicio,
  hoyComoFecha,
} from '../src/modules/tarifas-venta/tarifas-venta.service.js'
import { tarifaVentaCreateSchema } from '../src/modules/tarifas-venta/tarifas-venta.schema.js'
import { previewVentaLinea } from '../src/modules/ordenes-trabajo/ordenes-trabajo.service.js'

// ============================================================================
// Tarifas de venta — Docs/reglas-negocio.md §4 bis (RN-TVE-01..06).
// ============================================================================

try {
  process.loadEnvFile()
} catch {
  // .env ya cargado o inexistente.
}

const prisma = new PrismaClient()
const serviciosCreados: number[] = []
let tipoServicioId: number
let contador = 0

const d = (s: string) => new Date(`${s}T00:00:00.000Z`)

beforeAll(async () => {
  tipoServicioId = (await prisma.tipoServicio.findFirstOrThrow()).id
})

afterAll(async () => {
  await prisma.tarifaVenta.deleteMany({ where: { servicioId: { in: serviciosCreados } } }).catch(() => {}) // cascadea valores
  await prisma.servicio.deleteMany({ where: { id: { in: serviciosCreados } } }).catch(() => {})
  await prisma.$disconnect()
})

async function nuevoServicio(modeloTarifa: 'TRAMO_PAX' | 'ACOMODACION' | 'UNITARIO_PAX') {
  contador += 1
  const servicio = await prisma.servicio.create({
    data: {
      codigo: `QATV-SV-${Date.now()}-${contador}`,
      nombre: `Servicio QA Venta ${contador}`,
      tipoServicioId,
      modeloTarifa,
      creadoPor: 'test',
    },
  })
  serviciosCreados.push(servicio.id)
  return servicio
}

describe('RN-TVE-04: estado de vigencia (funciones puras)', () => {
  const hoy = d('2026-11-16')
  it('VIGENTE / PROGRAMADA / VENCIDA con extremos inclusivos', () => {
    expect(estadoDeTarifa({ vigenciaDesde: d('2026-11-16'), vigenciaHasta: d('2026-11-16') }, hoy)).toBe('VIGENTE')
    expect(estadoDeTarifa({ vigenciaDesde: d('2026-01-01'), vigenciaHasta: null }, hoy)).toBe('VIGENTE')
    expect(estadoDeTarifa({ vigenciaDesde: d('2026-11-17'), vigenciaHasta: null }, hoy)).toBe('PROGRAMADA')
    expect(estadoDeTarifa({ vigenciaDesde: d('2026-01-01'), vigenciaHasta: d('2026-11-15') }, hoy)).toBe('VENCIDA')
  })

  it('la representativa prefiere vigente, luego programada próxima, luego vencida reciente', () => {
    const vencida = { id: 1, vigenciaDesde: d('2025-01-01'), vigenciaHasta: d('2025-12-31') }
    const prog1 = { id: 2, vigenciaDesde: d('2027-06-01'), vigenciaHasta: null }
    const prog2 = { id: 3, vigenciaDesde: d('2027-01-01'), vigenciaHasta: d('2027-05-31') }
    const vigente = { id: 4, vigenciaDesde: d('2026-01-01'), vigenciaHasta: d('2026-12-31') }
    expect(representativa([vencida, prog1, prog2, vigente], hoy)?.id).toBe(4)
    expect(representativa([vencida, prog1, prog2], hoy)?.id).toBe(3)
    expect(representativa([vencida], hoy)?.estado).toBe('VENCIDA')
    expect(representativa([], hoy)).toBeNull()
  })

  it('el estado del servicio es el mejor entre sus monedas', () => {
    expect(estadoDeServicio([])).toBe('SIN_TARIFA')
    expect(estadoDeServicio(['VENCIDA', 'PROGRAMADA'])).toBe('PROGRAMADA')
    expect(estadoDeServicio(['VENCIDA', 'VIGENTE'])).toBe('VIGENTE')
  })

  it('hoy se calcula en America/Santiago', () => {
    // 2026-11-17 02:00 UTC = 2026-11-16 23:00 en Santiago (UTC-3).
    expect(hoyComoFecha(new Date('2026-11-17T02:00:00Z')).toISOString()).toBe('2026-11-16T00:00:00.000Z')
  })
})

describe('RN-TVE-01/02: forma de los valores', () => {
  it('rechaza suplemento single', () => {
    const r = tarifaVentaCreateSchema.safeParse({
      servicioId: 1,
      moneda: 'USD',
      vigenciaDesde: '2026-01-01',
      valores: [{ modelo: 'ACOMODACION', acomodacion: 'DOBLE', valor: '200', suplementoSingle: '50' }],
    })
    expect(r.success).toBe(false)
  })

  it('rechaza vigencia hasta anterior a desde', () => {
    const r = tarifaVentaCreateSchema.safeParse({
      servicioId: 1,
      moneda: 'USD',
      vigenciaDesde: '2026-02-01',
      vigenciaHasta: '2026-01-01',
      valores: [{ modelo: 'UNITARIO_PAX', valor: '10' }],
    })
    expect(r.success).toBe(false)
  })

  it('rechaza un modelo distinto al del servicio', async () => {
    const s = await nuevoServicio('TRAMO_PAX')
    await expect(
      crearTarifaVenta({ servicioId: s.id, moneda: 'USD', vigenciaDesde: d('2026-01-01'), valores: [{ modelo: 'UNITARIO_PAX', valor: '10' }] }, 'test'),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('rechaza tramos con hueco (RN-TAR-02)', async () => {
    const s = await nuevoServicio('TRAMO_PAX')
    await expect(
      crearTarifaVenta(
        {
          servicioId: s.id,
          moneda: 'USD',
          vigenciaDesde: d('2026-01-01'),
          valores: [
            { modelo: 'TRAMO_PAX', paxDesde: 1, paxHasta: 2, valor: '100' },
            { modelo: 'TRAMO_PAX', paxDesde: 4, paxHasta: null, valor: '150' },
          ],
        },
        'test',
      ),
    ).rejects.toMatchObject({ code: 'CONFLICT' })
  })
})

describe('RN-TVE-03: sin solape por servicio y moneda', () => {
  it('rechaza dos activas solapadas en la misma moneda, pero acepta otra moneda en paralelo', async () => {
    const s = await nuevoServicio('UNITARIO_PAX')
    const base = { servicioId: s.id, vigenciaDesde: d('2026-01-01'), vigenciaHasta: d('2026-12-31'), valores: [{ modelo: 'UNITARIO_PAX' as const, valor: '10' }] }
    await crearTarifaVenta({ ...base, moneda: 'USD' }, 'test')
    await expect(crearTarifaVenta({ ...base, moneda: 'USD', vigenciaDesde: d('2026-06-01') }, 'test')).rejects.toMatchObject({ code: 'CONFLICT' })
    await expect(crearTarifaVenta({ ...base, moneda: 'CLP', valores: [{ modelo: 'UNITARIO_PAX', valor: '9500' }] }, 'test')).resolves.toBeTruthy()
    // Período no solapado en la misma moneda: cadena independiente (como RN-TAR-06).
    const otra = await crearTarifaVenta({ ...base, moneda: 'USD', vigenciaDesde: d('2027-01-01'), vigenciaHasta: undefined }, 'test')
    expect(otra.version).toBe(1)
  })

  it('dos altas concurrentes solapadas: una gana y la otra recibe CONFLICT', async () => {
    const s = await nuevoServicio('UNITARIO_PAX')
    const input = { servicioId: s.id, moneda: 'USD' as const, vigenciaDesde: d('2026-01-01'), valores: [{ modelo: 'UNITARIO_PAX' as const, valor: '10' }] }
    const resultados = await Promise.allSettled([crearTarifaVenta(input, 'test'), crearTarifaVenta(input, 'test')])
    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect(resultados.find((r) => r.status === 'rejected')).toMatchObject({ reason: { code: 'CONFLICT' } })
  })
})

describe('RN-TVE-05: nueva versión y edición', () => {
  it('nueva versión incrementa version y desactiva la anterior; la anterior ya no admite cambios', async () => {
    const s = await nuevoServicio('UNITARIO_PAX')
    const v1 = await crearTarifaVenta(
      { servicioId: s.id, moneda: 'USD', vigenciaDesde: d('2026-01-01'), valores: [{ modelo: 'UNITARIO_PAX', valor: '10' }] },
      'test',
    )
    const v2 = await crearNuevaVersion(v1.id, { vigenciaDesde: d('2026-03-01'), valores: [{ modelo: 'UNITARIO_PAX', valor: '12' }] }, 'test')
    expect(v2.version).toBe(2)
    expect(v2.moneda).toBe('USD')
    expect((await prisma.tarifaVenta.findUniqueOrThrow({ where: { id: v1.id } })).activo).toBe(false)

    await expect(
      editarTarifaVenta(v1.id, { vigenciaDesde: d('2026-01-01'), valores: [{ modelo: 'UNITARIO_PAX', valor: '11' }] }, 'test'),
    ).rejects.toMatchObject({ code: 'CONFLICT' })

    const editada = await editarTarifaVenta(v2.id, { vigenciaDesde: d('2026-03-01'), vigenciaHasta: d('2026-12-31'), valores: [{ modelo: 'UNITARIO_PAX', valor: '13' }] }, 'test')
    expect(editada.version).toBe(2)
    expect(editada.valores[0]!.valor.toString()).toBe('13')
    expect(editada.vigenciaHasta?.toISOString()).toBe('2026-12-31T00:00:00.000Z')
  })
})

describe('RN-TVE-04: listado de servicios con estado', () => {
  it('marca SIN_TARIFA, VIGENTE y VENCIDA y filtra por estado', async () => {
    const sin = await nuevoServicio('UNITARIO_PAX')
    const vig = await nuevoServicio('UNITARIO_PAX')
    const ven = await nuevoServicio('UNITARIO_PAX')
    await crearTarifaVenta({ servicioId: vig.id, moneda: 'USD', vigenciaDesde: d('2020-01-01'), valores: [{ modelo: 'UNITARIO_PAX', valor: '10' }] }, 'test')
    await crearTarifaVenta(
      { servicioId: ven.id, moneda: 'CLP', vigenciaDesde: d('2020-01-01'), vigenciaHasta: d('2020-12-31'), valores: [{ modelo: 'UNITARIO_PAX', valor: '10' }] },
      'test',
    )

    const todos = await listarServiciosConTarifa({ page: 1, limit: 200, q: 'Servicio QA Venta' })
    const porId = new Map(todos.data.map((f) => [f.id, f]))
    expect(porId.get(sin.id)?.estado).toBe('SIN_TARIFA')
    expect(porId.get(sin.id)?.tarifas).toEqual([])
    expect(porId.get(vig.id)?.estado).toBe('VIGENTE')
    expect(porId.get(vig.id)?.tarifas[0]).toMatchObject({ moneda: 'USD', estado: 'VIGENTE', vigenciaHasta: null })
    expect(porId.get(ven.id)?.estado).toBe('VENCIDA')

    const vencidas = await listarServiciosConTarifa({ page: 1, limit: 200, q: 'Servicio QA Venta', estado: 'VENCIDA' })
    expect(vencidas.data.every((f) => f.estado === 'VENCIDA')).toBe(true)
    expect(vencidas.data.some((f) => f.id === ven.id)).toBe(true)
  })
})

describe('RN-TVE-06: precarga de venta en la OT directa', () => {
  it('TRAMO_PAX: toma el tramo que cubre el pax, en la moneda de la OT', async () => {
    const s = await nuevoServicio('TRAMO_PAX')
    await crearTarifaVenta(
      {
        servicioId: s.id,
        moneda: 'USD',
        vigenciaDesde: d('2026-01-01'),
        valores: [
          { modelo: 'TRAMO_PAX', paxDesde: 1, paxHasta: 2, valor: '100' },
          { modelo: 'TRAMO_PAX', paxDesde: 3, paxHasta: null, valor: '180' },
        ],
      },
      'test',
    )
    const r = await previewVentaLinea({ fechaOperacion: d('2026-05-01'), moneda: 'USD', tipoCambio: '950', dia: 1, servicioId: s.id, cantidadPax: 4 })
    expect(r).toMatchObject({ disponible: true, ventaTotal: '180.0000', advertenciaVigencia: false })
  })

  it('UNITARIO_PAX en CLP convertido a una OT en USD', async () => {
    const s = await nuevoServicio('UNITARIO_PAX')
    await crearTarifaVenta({ servicioId: s.id, moneda: 'CLP', vigenciaDesde: d('2026-01-01'), valores: [{ modelo: 'UNITARIO_PAX', valor: '9500' }] }, 'test')
    const r = await previewVentaLinea({ fechaOperacion: d('2026-05-01'), moneda: 'USD', tipoCambio: '950', dia: 1, servicioId: s.id, cantidadPax: 3 })
    expect(r).toMatchObject({ disponible: true, monedaTarifa: 'CLP', ventaTotal: '30.0000' })
  })

  it('prefiere la tarifa en la moneda de la OT cuando hay dos que cubren la fecha', async () => {
    const s = await nuevoServicio('UNITARIO_PAX')
    await crearTarifaVenta({ servicioId: s.id, moneda: 'CLP', vigenciaDesde: d('2026-01-01'), valores: [{ modelo: 'UNITARIO_PAX', valor: '9500' }] }, 'test')
    await crearTarifaVenta({ servicioId: s.id, moneda: 'USD', vigenciaDesde: d('2026-01-01'), valores: [{ modelo: 'UNITARIO_PAX', valor: '12' }] }, 'test')
    const t = await resolverTarifaVentaVigente(s.id, d('2026-05-01'), 'USD')
    expect(t?.moneda).toBe('USD')
  })

  it('ACOMODACION: valor de la habitación; sin tarifa que cubra la fecha advierte', async () => {
    const s = await nuevoServicio('ACOMODACION')
    await crearTarifaVenta(
      {
        servicioId: s.id,
        moneda: 'USD',
        vigenciaDesde: d('2026-01-01'),
        vigenciaHasta: d('2026-03-31'),
        valores: [
          { modelo: 'ACOMODACION', acomodacion: 'SINGLE', valor: '120' },
          { modelo: 'ACOMODACION', acomodacion: 'DOBLE', valor: '160' },
        ],
      },
      'test',
    )
    const r = await previewVentaLinea({
      fechaOperacion: d('2026-05-01'),
      moneda: 'USD',
      tipoCambio: '950',
      dia: 1,
      servicioId: s.id,
      acomodacion: 'DOBLE',
      cantidadPax: 2,
    })
    expect(r).toMatchObject({ disponible: true, ventaTotal: '160.0000', advertenciaVigencia: true })
  })

  it('sin tarifa de venta: disponible false', async () => {
    const s = await nuevoServicio('UNITARIO_PAX')
    const r = await previewVentaLinea({ fechaOperacion: d('2026-05-01'), moneda: 'USD', tipoCambio: '950', dia: 1, servicioId: s.id, cantidadPax: 3 })
    expect(r.disponible).toBe(false)
  })
})
