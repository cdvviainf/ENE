import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { crearCliente, crearDireccion, actualizarDireccion, obtenerCliente } from '../src/modules/clientes/clientes.service.js'

// ============================================================================
// Direcciones (Cliente) — Docs/reglas-negocio.md §13. RN-GEO-02 (comuna
// obligatoria si el país es Chile) y RN-GEO-03 (máximo una dirección
// predeterminada por dueño). ClienteDireccion y ProveedorDireccion comparten
// la misma lógica (shared/direcciones.ts) — se ejercita vía Cliente, que
// alcanza para probar la regla sin duplicar el mismo caso en Proveedor.
// ============================================================================

try {
  process.loadEnvFile()
} catch {
  // .env ya cargado o inexistente.
}

const prisma = new PrismaClient()
const clientesCreados: number[] = []
let chileId: number
let comunaId: number

beforeAll(async () => {
  chileId = (await prisma.pais.findUniqueOrThrow({ where: { codigo: 'CHL' } })).id
  comunaId = (await prisma.comuna.findFirstOrThrow()).id
})

afterAll(async () => {
  await prisma.clienteDireccion.deleteMany({ where: { clienteId: { in: clientesCreados } } }).catch(() => {})
  await prisma.cliente.deleteMany({ where: { id: { in: clientesCreados } } }).catch(() => {})
  await prisma.$disconnect()
})

async function clienteDePrueba(codigo: string) {
  const cliente = await crearCliente(
    { codigo, tipo: 'AGENCIA', razonSocial: `Cliente QA ${codigo}`, paisId: chileId },
    'test',
  )
  clientesCreados.push(cliente.id)
  return cliente.id
}

describe('RN-GEO-02: la comuna es obligatoria cuando el país es Chile', () => {
  it('rechaza una dirección de Chile sin comuna', async () => {
    const clienteId = await clienteDePrueba('QAD-01')
    await expect(
      crearDireccion(clienteId, { etiqueta: 'Oficina', paisId: chileId, direccion: 'Calle Falsa 123' }, 'test'),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('acepta una dirección de Chile con comuna', async () => {
    const clienteId = await clienteDePrueba('QAD-02')
    const direccion = await crearDireccion(
      clienteId,
      { etiqueta: 'Oficina', paisId: chileId, comunaId, direccion: 'Calle Falsa 123' },
      'test',
    )
    expect(direccion.comunaId).toBe(comunaId)
  })
})

describe('RN-GEO-03: como máximo una dirección predeterminada por dueño', () => {
  it('al marcar una segunda dirección como default, desmarca la anterior', async () => {
    const clienteId = await clienteDePrueba('QAD-03')
    const d1 = await crearDireccion(
      clienteId,
      { etiqueta: 'Oficina', paisId: chileId, comunaId, direccion: 'Calle Uno 100', esPorDefecto: true },
      'test',
    )
    expect(d1.esPorDefecto).toBe(true)

    const d2 = await crearDireccion(
      clienteId,
      { etiqueta: 'Bodega', paisId: chileId, comunaId, direccion: 'Calle Dos 200', esPorDefecto: true },
      'test',
    )
    expect(d2.esPorDefecto).toBe(true)

    const cliente = await obtenerCliente(clienteId)
    const direcciones = cliente.direcciones ?? []
    const defaults = direcciones.filter((d) => d.esPorDefecto)
    expect(defaults).toHaveLength(1)
    expect(defaults[0]?.id).toBe(d2.id)
  })

  it('editar una dirección existente a default desmarca la anterior', async () => {
    const clienteId = await clienteDePrueba('QAD-04')
    const d1 = await crearDireccion(
      clienteId,
      { etiqueta: 'Oficina', paisId: chileId, comunaId, direccion: 'Calle Uno 100', esPorDefecto: true },
      'test',
    )
    const d2 = await crearDireccion(
      clienteId,
      { etiqueta: 'Bodega', paisId: chileId, comunaId, direccion: 'Calle Dos 200' },
      'test',
    )

    await actualizarDireccion(clienteId, d2.id, { esPorDefecto: true }, 'test')

    const cliente = await obtenerCliente(clienteId)
    const direcciones = cliente.direcciones ?? []
    expect(direcciones.find((d) => d.id === d1.id)?.esPorDefecto).toBe(false)
    expect(direcciones.find((d) => d.id === d2.id)?.esPorDefecto).toBe(true)
  })
})
