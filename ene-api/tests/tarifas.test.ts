import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import {
  crearTarifario,
  crearNuevaVersion,
  listarTarifarios,
  buscarTramoQueCubra,
  seSolapanVigencias,
} from '../src/modules/tarifas/tarifas.service.js'
import { tarifarioCreateSchema } from '../src/modules/tarifas/tarifas.schema.js'

// ============================================================================
// Tarifario — Docs/mantenedores.md §7. RN-TAR-01 a RN-TAR-07 (RN-TAR-07 vive
// hoy solo en mantenedores.md, no en reglas-negocio.md — ver nota de
// gobernanza documental en Docs/mantenedores.md §7, se implementa igual).
// RN-COS-06 (costoTeorico congelado, no se recalcula) se verifica desde acá
// aunque su dueño real sea Etapa 6 — es la única garantía que Tarifario debe
// respetar al versionar.
// ============================================================================

try {
  process.loadEnvFile()
} catch {
  // .env ya cargado o inexistente.
}

const prisma = new PrismaClient()
const serviciosCreados: number[] = []
const cotizacionLineasCreadas: number[] = []
const cotizacionVersionesCreadas: number[] = []
const cotizacionesCreadas: number[] = []
const gruposCreados: number[] = []
const clientesCreados: number[] = []
let tipoServicioId: number
let proveedorId: number
let contador = 0

beforeAll(async () => {
  const tipoServicio = await prisma.tipoServicio.findFirstOrThrow()
  tipoServicioId = tipoServicio.id
  const proveedor = await prisma.proveedor.create({
    data: {
      codigo: 'QAT-PROV',
      razonSocial: 'QA Tarifas',
      rut: '55555555-5',
      tiposServicio: { create: [{ tipoServicioId }] },
      creadoPor: 'test',
    },
  })
  proveedorId = proveedor.id
})

afterAll(async () => {
  await prisma.cotizacionLinea.deleteMany({ where: { id: { in: cotizacionLineasCreadas } } }).catch(() => {})
  await prisma.cotizacionVersion.deleteMany({ where: { id: { in: cotizacionVersionesCreadas } } }).catch(() => {})
  await prisma.cotizacion.deleteMany({ where: { id: { in: cotizacionesCreadas } } }).catch(() => {})
  await prisma.grupo.deleteMany({ where: { id: { in: gruposCreados } } }).catch(() => {})
  await prisma.cliente.deleteMany({ where: { id: { in: clientesCreados } } }).catch(() => {})
  await prisma.tarifario.deleteMany({ where: { servicioId: { in: serviciosCreados } } }).catch(() => {}) // cascadea TarifarioValor
  await prisma.servicio.deleteMany({ where: { id: { in: serviciosCreados } } }).catch(() => {})
  if (proveedorId) await prisma.proveedor.delete({ where: { id: proveedorId } }).catch(() => {})
  await prisma.$disconnect()
})

async function nuevoServicio(modeloTarifa: 'TRAMO_PAX' | 'ACOMODACION' | 'UNITARIO_PAX') {
  contador += 1
  const servicio = await prisma.servicio.create({
    data: { codigo: `QAT-SV-${contador}`, nombre: `Servicio QA Tarifas ${contador}`, tipoServicioId, modeloTarifa, creadoPor: 'test' },
  })
  serviciosCreados.push(servicio.id)
  return servicio.id
}

describe('RN-TAR-02: los tramos de TRAMO_PAX no pueden solaparse ni dejar huecos', () => {
  it('rechaza tramos solapados (1-2 y 2-5)', async () => {
    const servicioId = await nuevoServicio('TRAMO_PAX')
    await expect(
      crearTarifario(
        {
          proveedorId, servicioId, moneda: 'USD', vigenciaDesde: new Date('2026-01-01'),
          valores: [
            { modelo: 'TRAMO_PAX', paxDesde: 1, paxHasta: 2, valor: '95000' },
            { modelo: 'TRAMO_PAX', paxDesde: 2, paxHasta: 5, valor: '130000' },
          ],
        } as any,
        'test',
      ),
    ).rejects.toMatchObject({ code: 'CONFLICT' })
  })

  it('rechaza tramos con hueco (1-2 y 4-6)', async () => {
    const servicioId = await nuevoServicio('TRAMO_PAX')
    await expect(
      crearTarifario(
        {
          proveedorId, servicioId, moneda: 'USD', vigenciaDesde: new Date('2026-01-01'),
          valores: [
            { modelo: 'TRAMO_PAX', paxDesde: 1, paxHasta: 2, valor: '95000' },
            { modelo: 'TRAMO_PAX', paxDesde: 4, paxHasta: 6, valor: '185000' },
          ],
        } as any,
        'test',
      ),
    ).rejects.toMatchObject({ code: 'CONFLICT' })
  })

  it('rechaza un tramo abierto (paxHasta null) que no es el de mayor rango', async () => {
    const servicioId = await nuevoServicio('TRAMO_PAX')
    await expect(
      crearTarifario(
        {
          proveedorId, servicioId, moneda: 'USD', vigenciaDesde: new Date('2026-01-01'),
          valores: [
            { modelo: 'TRAMO_PAX', paxDesde: 1, paxHasta: null, valor: '95000' },
            { modelo: 'TRAMO_PAX', paxDesde: 3, paxHasta: 5, valor: '130000' },
          ],
        } as any,
        'test',
      ),
    ).rejects.toMatchObject({ code: 'CONFLICT' })
  })

  it('acepta tramos contiguos bien formados (1-2, 3-5, 6-∞)', async () => {
    const servicioId = await nuevoServicio('TRAMO_PAX')
    const resultado = await crearTarifario(
      {
        proveedorId, servicioId, moneda: 'USD', vigenciaDesde: new Date('2026-01-01'),
        valores: [
          { modelo: 'TRAMO_PAX', paxDesde: 1, paxHasta: 2, valor: '95000' },
          { modelo: 'TRAMO_PAX', paxDesde: 3, paxHasta: 5, valor: '130000' },
          { modelo: 'TRAMO_PAX', paxDesde: 6, paxHasta: null, valor: '185000' },
        ],
      } as any,
      'test',
    )
    expect(resultado.valores).toHaveLength(3)
  })
})

describe('RN-TAR-04: el suplemento single advierte si no cuadra, pero nunca bloquea', () => {
  it('no advierte cuando el suplemento cuadra (100.000/140.000/60.000)', async () => {
    const servicioId = await nuevoServicio('ACOMODACION')
    const resultado = await crearTarifario(
      {
        proveedorId, servicioId, moneda: 'USD', vigenciaDesde: new Date('2026-01-01'), vigenciaHasta: new Date('2026-01-31'),
        valores: [
          { modelo: 'ACOMODACION', acomodacion: 'SINGLE', valor: '100000' },
          { modelo: 'ACOMODACION', acomodacion: 'DOBLE', valor: '140000', suplementoSingle: '60000' },
        ],
      } as any,
      'test',
    )
    expect(resultado.advertencias).toHaveLength(0)
  })

  it('advierte (sin bloquear) cuando el suplemento no cuadra', async () => {
    const servicioId = await nuevoServicio('ACOMODACION')
    const resultado = await crearTarifario(
      {
        proveedorId, servicioId, moneda: 'USD', vigenciaDesde: new Date('2026-02-01'), vigenciaHasta: new Date('2026-02-28'),
        valores: [
          { modelo: 'ACOMODACION', acomodacion: 'SINGLE', valor: '100000' },
          { modelo: 'ACOMODACION', acomodacion: 'DOBLE', valor: '140000', suplementoSingle: '55000' },
        ],
      } as any,
      'test',
    )
    expect(resultado.advertencias).toHaveLength(1)
    expect(resultado.advertencias[0]).toMatchObject({ regla: 'RN-TAR-04' })
    // No bloqueó: el valor se guardó tal cual.
    const filaDoble = resultado.valores.find((v: any) => v.acomodacion === 'DOBLE')
    expect(filaDoble!.suplementoSingle!.toString()).toBe('55000')
  })

  it('advierte "no se pudo verificar" cuando no hay fila SINGLE en el payload', async () => {
    const servicioId = await nuevoServicio('ACOMODACION')
    const resultado = await crearTarifario(
      {
        proveedorId, servicioId, moneda: 'USD', vigenciaDesde: new Date('2026-03-01'), vigenciaHasta: new Date('2026-03-31'),
        valores: [{ modelo: 'ACOMODACION', acomodacion: 'DOBLE', valor: '140000', suplementoSingle: '60000' }],
      } as any,
      'test',
    )
    expect(resultado.advertencias).toHaveLength(1)
    expect(resultado.advertencias[0]!.mensaje).toMatch(/no se pudo verificar/i)
  })
})

describe('RN-TAR-01: UNITARIO_PAX', () => {
  it('acepta un único valor, con paxDesde/paxHasta/acomodacion nulos', async () => {
    const servicioId = await nuevoServicio('UNITARIO_PAX')
    const resultado = await crearTarifario(
      { proveedorId, servicioId, moneda: 'USD', vigenciaDesde: new Date('2026-01-01'), valores: [{ modelo: 'UNITARIO_PAX', valor: '32000' }] } as any,
      'test',
    )
    expect(resultado.valores).toHaveLength(1)
    expect(resultado.valores[0]!.paxDesde).toBeNull()
    expect(resultado.valores[0]!.paxHasta).toBeNull()
    expect(resultado.valores[0]!.acomodacion).toBeNull()
  })

  it('rechaza dos valores en un tarifario UNITARIO_PAX (schema)', () => {
    const parseado = tarifarioCreateSchema.safeParse({
      proveedorId: 1, servicioId: 1, moneda: 'USD', vigenciaDesde: '2026-01-01',
      valores: [
        { modelo: 'UNITARIO_PAX', valor: '32000' },
        { modelo: 'UNITARIO_PAX', valor: '35000' },
      ],
    })
    expect(parseado.success).toBe(false)
  })
})

describe('Invariante: el modelo de los valores debe calzar con Servicio.modeloTarifa', () => {
  it('rechaza un payload ACOMODACION contra un servicio TRAMO_PAX', async () => {
    const servicioId = await nuevoServicio('TRAMO_PAX')
    await expect(
      crearTarifario(
        {
          proveedorId, servicioId, moneda: 'USD', vigenciaDesde: new Date('2026-01-01'),
          valores: [{ modelo: 'ACOMODACION', acomodacion: 'SINGLE', valor: '100000' }],
        } as any,
        'test',
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })
})

describe('QA-TAR-002: el proveedor debe existir y no estar eliminado', () => {
  it('rechaza un proveedorId inexistente con NOT_FOUND en vez de un error interno', async () => {
    const servicioId = await nuevoServicio('TRAMO_PAX')
    await expect(
      crearTarifario(
        {
          proveedorId: 999_999_999, servicioId, moneda: 'USD', vigenciaDesde: new Date('2026-01-01'),
          valores: [{ modelo: 'TRAMO_PAX', paxDesde: 1, paxHasta: null, valor: '100000' }],
        } as any,
        'test',
      ),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('rechaza un proveedor eliminado', async () => {
    const servicioId = await nuevoServicio('TRAMO_PAX')
    const proveedorEliminado = await prisma.proveedor.create({
      data: { codigo: 'QAT-PROV-ELIM', razonSocial: 'QA Eliminado', rut: '55555555-5', tiposServicio: { create: [{ tipoServicioId }] }, creadoPor: 'test', eliminadoEn: new Date(), eliminadoPor: 'test' },
    })
    await expect(
      crearTarifario(
        {
          proveedorId: proveedorEliminado.id, servicioId, moneda: 'USD', vigenciaDesde: new Date('2026-01-01'),
          valores: [{ modelo: 'TRAMO_PAX', paxDesde: 1, paxHasta: null, valor: '100000' }],
        } as any,
        'test',
      ),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    await prisma.proveedor.delete({ where: { id: proveedorEliminado.id } })
  })
})

describe('RN-TAR-07: no pueden existir dos tarifarios activos del mismo proveedor+servicio con vigencias solapadas', () => {
  it('rechaza un segundo tarifario activo con vigencia que se solapa', async () => {
    const servicioId = await nuevoServicio('TRAMO_PAX')
    await crearTarifario(
      {
        proveedorId, servicioId, moneda: 'USD',
        vigenciaDesde: new Date('2026-01-01'), vigenciaHasta: new Date('2026-06-30'),
        valores: [{ modelo: 'TRAMO_PAX', paxDesde: 1, paxHasta: null, valor: '100000' }],
      } as any,
      'test',
    )
    await expect(
      crearTarifario(
        {
          proveedorId, servicioId, moneda: 'USD',
          vigenciaDesde: new Date('2026-06-01'), // solapa en junio
          valores: [{ modelo: 'TRAMO_PAX', paxDesde: 1, paxHasta: null, valor: '110000' }],
        } as any,
        'test',
      ),
    ).rejects.toMatchObject({ code: 'CONFLICT' })
  })

  it('acepta dos tarifarios activos con vigencias no solapadas', async () => {
    const servicioId = await nuevoServicio('TRAMO_PAX')
    await crearTarifario(
      {
        proveedorId, servicioId, moneda: 'USD',
        vigenciaDesde: new Date('2026-01-01'), vigenciaHasta: new Date('2026-03-31'),
        valores: [{ modelo: 'TRAMO_PAX', paxDesde: 1, paxHasta: null, valor: '100000' }],
      } as any,
      'test',
    )
    await expect(
      crearTarifario(
        {
          proveedorId, servicioId, moneda: 'USD',
          vigenciaDesde: new Date('2026-04-01'),
          valores: [{ modelo: 'TRAMO_PAX', paxDesde: 1, paxHasta: null, valor: '110000' }],
        } as any,
        'test',
      ),
    ).resolves.toMatchObject({ activo: true })
  })
})

describe('RN-TAR-06: una nueva versión no reemplaza, versiona', () => {
  it('crea v2, deja v1 con activo=false y version=v1.version+1', async () => {
    const servicioId = await nuevoServicio('TRAMO_PAX')
    const v1 = await crearTarifario(
      {
        proveedorId, servicioId, moneda: 'USD', vigenciaDesde: new Date('2026-01-01'),
        valores: [{ modelo: 'TRAMO_PAX', paxDesde: 1, paxHasta: null, valor: '100000' }],
      } as any,
      'test',
    )
    const v2 = await crearNuevaVersion(
      v1.id,
      { vigenciaDesde: new Date('2026-01-01'), valores: [{ modelo: 'TRAMO_PAX', paxDesde: 1, paxHasta: null, valor: '120000' }] } as any,
      'test',
    )
    expect(v2.version).toBe(v1.version + 1)
    expect(v2.activo).toBe(true)

    const v1Recargado = await prisma.tarifario.findUniqueOrThrow({ where: { id: v1.id } })
    expect(v1Recargado.activo).toBe(false)
  })

  it('RN-COS-06: una línea ya valorizada contra v1 sigue apuntando al mismo TarifarioValor tras crear v2', async () => {
    const servicioId = await nuevoServicio('TRAMO_PAX')
    const v1 = await crearTarifario(
      {
        proveedorId, servicioId, moneda: 'USD', vigenciaDesde: new Date('2026-01-01'),
        valores: [{ modelo: 'TRAMO_PAX', paxDesde: 1, paxHasta: null, valor: '100000' }],
      } as any,
      'test',
    )
    const tarifarioValorId = v1.valores[0]!.id

    const { id: paisId } = await prisma.pais.findUniqueOrThrow({ where: { codigo: 'CHL' } })
    const cliente = await prisma.cliente.create({ data: { codigo: 'QAT-CLI', tipo: 'AGENCIA', razonSocial: 'QA', paisId, creadoPor: 'test' } })
    clientesCreados.push(cliente.id)
    const grupo = await prisma.grupo.create({ data: { codigo: 'QAT-GR', apellido: 'QA', clienteId: cliente.id, cantidadPax: 1, creadoPor: 'test' } })
    gruposCreados.push(grupo.id)
    const cot = await prisma.cotizacion.create({
      data: {
        numero: 'COT-QAT-01', clienteId: cliente.id, grupoId: grupo.id, areaNegocio: 'RECEPTIVO',
        fechaOperacion: new Date(), cantidadPax: 1, moneda: 'USD', tipoCambio: '1', estado: 'ENVIADA', creadoPor: 'test',
      },
    })
    cotizacionesCreadas.push(cot.id)
    const version = await prisma.cotizacionVersion.create({
      data: { cotizacionId: cot.id, version: 1, costoTotal: '100000', margenTotal: '50000', ventaTotal: '150000', creadoPor: 'test' },
    })
    cotizacionVersionesCreadas.push(version.id)
    const linea = await prisma.cotizacionLinea.create({
      data: {
        cotizacionVersionId: version.id, dia: 1, bloque: 'AM', orden: 1, tipoLinea: 'ESTANDAR',
        servicioId, tarifarioValorId, descripcion: 'QA', cantidadPax: 1,
        costoUnitario: '100000', costoTotal: '100000', margenPct: '0.5', ventaTotal: '150000',
      },
    })
    cotizacionLineasCreadas.push(linea.id)

    await crearNuevaVersion(
      v1.id,
      { vigenciaDesde: new Date('2026-01-01'), valores: [{ modelo: 'TRAMO_PAX', paxDesde: 1, paxHasta: null, valor: '999999' }] } as any,
      'test',
    )

    const lineaRecargada = await prisma.cotizacionLinea.findUniqueOrThrow({ where: { id: linea.id } })
    expect(lineaRecargada.tarifarioValorId).toBe(tarifarioValorId)
    expect(lineaRecargada.costoTotal.toString()).toBe('100000')
  })

  it('rechaza versionar un tarifario que ya no está activo (fue reemplazado)', async () => {
    const servicioId = await nuevoServicio('TRAMO_PAX')
    const v1 = await crearTarifario(
      {
        proveedorId, servicioId, moneda: 'USD', vigenciaDesde: new Date('2026-01-01'),
        valores: [{ modelo: 'TRAMO_PAX', paxDesde: 1, paxHasta: null, valor: '100000' }],
      } as any,
      'test',
    )
    await crearNuevaVersion(
      v1.id,
      { vigenciaDesde: new Date('2026-01-01'), valores: [{ modelo: 'TRAMO_PAX', paxDesde: 1, paxHasta: null, valor: '120000' }] } as any,
      'test',
    )
    await expect(
      crearNuevaVersion(
        v1.id,
        { vigenciaDesde: new Date('2026-01-01'), valores: [{ modelo: 'TRAMO_PAX', paxDesde: 1, paxHasta: null, valor: '130000' }] } as any,
        'test',
      ),
    ).rejects.toMatchObject({ code: 'CONFLICT' })
  })

  it('RN-TAR-07 en nueva-version: rechaza si la vigencia nueva solapa con OTRO tarifario activo del mismo proveedor+servicio', async () => {
    const servicioId = await nuevoServicio('TRAMO_PAX')
    // "Otra cadena": queda activa e intacta durante todo el test.
    await crearTarifario(
      {
        proveedorId, servicioId, moneda: 'USD',
        vigenciaDesde: new Date('2026-01-01'), vigenciaHasta: new Date('2026-03-31'),
        valores: [{ modelo: 'TRAMO_PAX', paxDesde: 1, paxHasta: null, valor: '50000' }],
      } as any,
      'test',
    )
    const y = await crearTarifario(
      {
        proveedorId, servicioId, moneda: 'USD',
        vigenciaDesde: new Date('2026-04-01'),
        valores: [{ modelo: 'TRAMO_PAX', paxDesde: 1, paxHasta: null, valor: '60000' }],
      } as any,
      'test',
    )
    await expect(
      crearNuevaVersion(
        y.id,
        {
          vigenciaDesde: new Date('2026-02-01'), // solapa con la "otra cadena" [ene-mar]
          valores: [{ modelo: 'TRAMO_PAX', paxDesde: 1, paxHasta: null, valor: '61000' }],
        } as any,
        'test',
      ),
    ).rejects.toMatchObject({ code: 'CONFLICT' })
  })
})

describe('Listado: filtro vigenteA', () => {
  it('solo devuelve tarifarios vigentes a la fecha dada', async () => {
    const servicioId = await nuevoServicio('TRAMO_PAX')
    await crearTarifario(
      {
        proveedorId, servicioId, moneda: 'USD',
        vigenciaDesde: new Date('2026-01-01'), vigenciaHasta: new Date('2026-03-31'),
        valores: [{ modelo: 'TRAMO_PAX', paxDesde: 1, paxHasta: null, valor: '50000' }],
      } as any,
      'test',
    )
    await crearTarifario(
      {
        proveedorId, servicioId, moneda: 'USD',
        vigenciaDesde: new Date('2026-04-01'),
        valores: [{ modelo: 'TRAMO_PAX', paxDesde: 1, paxHasta: null, valor: '60000' }],
      } as any,
      'test',
    )

    const enFebrero = await listarTarifarios(1, 50, { servicioId, vigenteA: new Date('2026-02-15') })
    expect(enFebrero.data).toHaveLength(1)
    expect(enFebrero.data[0]!.valores[0]!.valor.toString()).toBe('50000')

    const enMayo = await listarTarifarios(1, 50, { servicioId, vigenteA: new Date('2026-05-15') })
    expect(enMayo.data).toHaveLength(1)
    expect(enMayo.data[0]!.valores[0]!.valor.toString()).toBe('60000')
  })
})

describe('Funciones puras (helpers reutilizables por Etapa 6)', () => {
  it('buscarTramoQueCubra encuentra el tramo que cubre N pax, o null si ninguno', () => {
    const tramos = [
      { paxDesde: 1, paxHasta: 2 },
      { paxDesde: 3, paxHasta: 5 },
      { paxDesde: 6, paxHasta: null },
    ]
    expect(buscarTramoQueCubra(tramos, 4)).toMatchObject({ paxDesde: 3, paxHasta: 5 })
    expect(buscarTramoQueCubra(tramos, 10)).toMatchObject({ paxDesde: 6, paxHasta: null })
    expect(buscarTramoQueCubra(tramos, 0)).toBeNull()
  })

  it('seSolapanVigencias detecta solape, adyacencia y rangos abiertos', () => {
    const d = (s: string) => new Date(s)
    expect(seSolapanVigencias(d('2026-01-01'), d('2026-03-31'), d('2026-04-01'), null)).toBe(false) // adyacentes, no solapan
    expect(seSolapanVigencias(d('2026-01-01'), d('2026-04-01'), d('2026-04-01'), null)).toBe(true) // se tocan en el mismo día
    expect(seSolapanVigencias(d('2026-01-01'), null, d('2026-06-01'), null)).toBe(true) // ambos abiertos
    expect(seSolapanVigencias(d('2026-01-01'), d('2026-01-31'), d('2026-02-01'), d('2026-02-28'))).toBe(false)
  })
})
