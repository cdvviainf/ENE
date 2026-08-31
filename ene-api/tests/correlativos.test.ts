import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { peekSiguienteCodigo } from '../src/shared/correlativos.js'
import { crearCliente } from '../src/modules/clientes/clientes.service.js'
import { crearProveedor } from '../src/modules/proveedores/proveedores.service.js'

// ============================================================================
// shared/correlativos.ts — RN-COR-01 (advisory lock transaccional) + RN-MAN-02
// (código sugerido y editable) para CLIENTE/PROVEEDOR/GRUPO/SERVICIO.
//
// A diferencia del correlativo puro de COT/OT/OC (siempre generado por el
// sistema, sin input del usuario), el código de maestro es editable: si el
// valor enviado coincide con la sugerencia recalculada DENTRO del lock, se
// consume (incrementa `ultimoValor`); si no coincide, no se toca el contador
// —así se evitan huecos— y la unicidad la garantiza el `@unique` de la tabla.
//
// Se ejercita a través de los `service` reales (no la primitiva sola) para
// probar el mismo camino que usa la API: `crearCliente`/`crearProveedor` ya
// envuelven `resolverCodigo` + chequeo de unicidad en una sola transacción.
//
// Esto concentra en un único archivo todo lo que consume de verdad el
// contador compartido (namespace 491009, clave por entidad) para no competir
// por el mismo mostrador con los tests de clientes/proveedores/grupos/
// servicios, que solo usan códigos explícitos que nunca calzan con la
// sugerencia viva.
// ============================================================================

try {
  process.loadEnvFile()
} catch {
  // .env ya cargado o inexistente.
}

const prisma = new PrismaClient()
const clientesCreados: number[] = []
const proveedoresCreados: number[] = []

// RN-GEO-01: Cliente.paisId es FK al catálogo Pais sembrado.
let chileId: number

beforeAll(async () => {
  chileId = (await prisma.pais.findUniqueOrThrow({ where: { codigo: 'CHL' } })).id
})

afterAll(async () => {
  await prisma.cliente.deleteMany({ where: { id: { in: clientesCreados } } }).catch(() => {})
  await prisma.proveedor.deleteMany({ where: { id: { in: proveedoresCreados } } }).catch(() => {})
  await prisma.$disconnect()
})

const clienteBase = (codigo: string) => ({
  codigo,
  tipo: 'AGENCIA' as const,
  razonSocial: `QA correlativo ${codigo}`,
  paisId: chileId,
})

describe('RN-MAN-02: la sugerencia se consume solo si el código enviado coincide', () => {
  it('crea el cliente y avanza el contador en exactamente 1 cuando el código coincide con la sugerencia', async () => {
    const sugerido = await peekSiguienteCodigo('CLIENTE')
    expect(sugerido).not.toBeNull()

    const cliente = await crearCliente(clienteBase(sugerido!), 'test')
    clientesCreados.push(cliente.id)
    expect(cliente.codigo).toBe(sugerido)

    const siguienteSugerido = await peekSiguienteCodigo('CLIENTE')
    expect(siguienteSugerido).not.toBe(sugerido)
  })

  it('no avanza el contador cuando el código enviado fue editado por el usuario', async () => {
    const antes = await peekSiguienteCodigo('CLIENTE')

    const cliente = await crearCliente(clienteBase('CL-EDITADO-QA'), 'test')
    clientesCreados.push(cliente.id)
    expect(cliente.codigo).toBe('CL-EDITADO-QA')

    const despues = await peekSiguienteCodigo('CLIENTE')
    expect(despues).toBe(antes) // sin huecos: el contador no se tocó
  })
})

describe('RN-COR-01: dos altas concurrentes con la misma sugerencia no duplican ni saltan el contador', () => {
  it('una gana, la otra recibe CONFLICT, y el contador avanza en exactamente 1', async () => {
    const sugerido = await peekSiguienteCodigo('CLIENTE')
    expect(sugerido).not.toBeNull()

    const resultados = await Promise.allSettled([
      crearCliente(clienteBase(sugerido!), 'test'),
      crearCliente(clienteBase(sugerido!), 'test'),
    ])

    const cumplidas = resultados.filter((r) => r.status === 'fulfilled')
    const rechazadas = resultados.filter((r) => r.status === 'rejected')
    expect(cumplidas).toHaveLength(1)
    expect(rechazadas).toHaveLength(1)

    const ganador = (cumplidas[0] as PromiseFulfilledResult<{ id: number; codigo: string }>).value
    clientesCreados.push(ganador.id)
    expect(ganador.codigo).toBe(sugerido)

    const rechazo = (rechazadas[0] as PromiseRejectedResult).reason
    expect(rechazo).toMatchObject({ code: 'CONFLICT' })

    // Sin saltos ni duplicados: el contador avanzó en exactamente 1.
    const siguienteSugerido = await peekSiguienteCodigo('CLIENTE')
    const numeroActual = Number(sugerido!.replace(/^\D+/, ''))
    const numeroSiguiente = Number(siguienteSugerido!.replace(/^\D+/, ''))
    expect(numeroSiguiente).toBe(numeroActual + 1)
  })
})

describe('RN-COR-01: el namespace se comparte pero la clave por entidad aísla a cada una', () => {
  it('crear un PROVEEDOR con su propia sugerencia no consume el contador de CLIENTE', async () => {
    const antesCliente = await peekSiguienteCodigo('CLIENTE')
    const sugeridoProveedor = await peekSiguienteCodigo('PROVEEDOR')
    expect(sugeridoProveedor).not.toBeNull()

    const tipoServicio = await prisma.tipoServicio.findFirstOrThrow()
    const proveedor = await crearProveedor(
      {
        codigo: sugeridoProveedor!,
        razonSocial: 'QA correlativo proveedor',
        rut: '55555555-5',
        // RN-PRV-08: tipoServicioId pasó de valor único a arreglo (N:N).
        tiposServicio: [tipoServicio.id],
      },
      'test',
    )
    proveedoresCreados.push(proveedor.id)
    expect(proveedor.codigo).toBe(sugeridoProveedor)

    const despuesCliente = await peekSiguienteCodigo('CLIENTE')
    expect(despuesCliente).toBe(antesCliente)
  })
})
