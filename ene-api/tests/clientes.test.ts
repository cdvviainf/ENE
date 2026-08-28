import { describe, it, expect, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import {
  crearCliente,
  actualizarCliente,
  eliminarCliente,
  obtenerCliente,
  obtenerClienteConEstado,
  crearEjecutivo,
  actualizarEjecutivo,
  eliminarEjecutivo,
} from '../src/modules/clientes/clientes.service.js'

// ============================================================================
// Cliente — Docs/mantenedores.md §3. RN-CLI-01 (RUT condicional), RN-CLI-02
// (tieneOperaciones), RN-CLI-04 (último ejecutivo activo), más los guards
// genéricos RN-MAN-04/05. Los códigos usados acá son siempre explícitos y no
// calzan con la sugerencia viva (ver correlativos.test.ts para esa parte).
// ============================================================================

try {
  process.loadEnvFile()
} catch {
  // .env ya cargado o inexistente.
}

const prisma = new PrismaClient()
const idsCreados: number[] = []
const cotizacionesCreadas: number[] = []
const gruposCreados: number[] = []

// Orden de borrado por dependencias de FK: cotización (referencia grupo y
// cliente) → grupo → ejecutivos → cliente. Un grupo borrado antes que la
// cotización que lo referencia falla en silencio (índice RESTRICT) y deja el
// cliente huérfano-bloqueado entre corridas.
afterAll(async () => {
  await prisma.cotizacion.deleteMany({ where: { id: { in: cotizacionesCreadas } } }).catch(() => {})
  await prisma.grupo.deleteMany({ where: { id: { in: gruposCreados } } }).catch(() => {})
  await prisma.clienteEjecutivo.deleteMany({ where: { clienteId: { in: idsCreados } } }).catch(() => {})
  await prisma.cliente.deleteMany({ where: { id: { in: idsCreados } } }).catch(() => {})
  await prisma.$disconnect()
})

const agencia = (codigo: string) => ({
  codigo,
  tipo: 'AGENCIA' as const,
  razonSocial: `Agencia QA ${codigo}`,
  pais: 'Perú',
})

describe('RN-CLI-01: el RUT es obligatorio si tipo=EMPRESA', () => {
  it('rechaza una EMPRESA sin RUT (VALIDATION_ERROR)', async () => {
    await expect(
      crearCliente({ codigo: 'QAC-E1', tipo: 'EMPRESA', razonSocial: 'Empresa QA', pais: 'Chile' }, 'test'),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('acepta una EMPRESA con RUT válido y lo normaliza', async () => {
    const cliente = await crearCliente(
      { codigo: 'QAC-E2', tipo: 'EMPRESA', razonSocial: 'Empresa QA 2', pais: 'Chile', rut: '11.111.111-1' },
      'test',
    )
    idsCreados.push(cliente.id)
    expect(cliente.rut).toBe('11111111-1')
  })

  it('acepta una AGENCIA sin RUT (opcional)', async () => {
    const cliente = await crearCliente(agencia('QAC-A1'), 'test')
    idsCreados.push(cliente.id)
    expect(cliente.rut).toBeNull()
  })

  it('rechaza un RUT chileno inválido', async () => {
    await expect(
      crearCliente({ ...agencia('QAC-A2'), rut: '11111111-9' }, 'test'),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('revalida RN-CLI-01 al editar: no se puede quitar el RUT de una EMPRESA', async () => {
    const cliente = await crearCliente(
      { codigo: 'QAC-E3', tipo: 'EMPRESA', razonSocial: 'Empresa QA 3', pais: 'Chile', rut: '11111111-1' },
      'test',
    )
    idsCreados.push(cliente.id)
    await expect(actualizarCliente(cliente.id, { rut: '' }, 'test')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    })
  })

  it('la moneda por defecto es USD para AGENCIA y CLP para EMPRESA', async () => {
    const ag = await crearCliente(agencia('QAC-A3'), 'test')
    idsCreados.push(ag.id)
    expect(ag.monedaHabitual).toBe('USD')

    const emp = await crearCliente(
      { codigo: 'QAC-E4', tipo: 'EMPRESA', razonSocial: 'Empresa QA 4', pais: 'Chile', rut: '11111111-1' },
      'test',
    )
    idsCreados.push(emp.id)
    expect(emp.monedaHabitual).toBe('CLP')
  })
})

describe('RN-CLI-02: tieneOperaciones expone cualquier cotización u OT, sin filtrar por estado', () => {
  it('es false para un cliente sin operaciones', async () => {
    const cliente = await crearCliente(agencia('QAC-OP1'), 'test')
    idsCreados.push(cliente.id)
    const conEstado = await obtenerClienteConEstado(cliente.id)
    expect(conEstado.tieneOperaciones).toBe(false)
  })

  it('es true aunque la única cotización esté PERDIDA', async () => {
    const cliente = await crearCliente(agencia('QAC-OP2'), 'test')
    idsCreados.push(cliente.id)
    const grupo = await prisma.grupo.create({
      data: { codigo: 'QAC-OP2-GR', apellido: 'QA', clienteId: cliente.id, cantidadPax: 1, creadoPor: 'test' },
    })
    gruposCreados.push(grupo.id)

    const cot = await prisma.cotizacion.create({
      data: {
        numero: 'COT-QAC-OP2',
        clienteId: cliente.id,
        grupoId: grupo.id,
        areaNegocio: 'RECEPTIVO',
        fechaOperacion: new Date(),
        cantidadPax: 1,
        moneda: 'USD',
        tipoCambio: '1',
        estado: 'PERDIDA',
        creadoPor: 'test',
      },
    })
    cotizacionesCreadas.push(cot.id)

    const conEstado = await obtenerClienteConEstado(cliente.id)
    expect(conEstado.tieneOperaciones).toBe(true)
  })
})

describe('Ejecutivos — RN-CLI-03/RN-CLI-04', () => {
  it('crea, edita y permite desactivar un ejecutivo que no es el último activo', async () => {
    const cliente = await crearCliente(agencia('QAC-EJ1'), 'test')
    idsCreados.push(cliente.id)

    const e1 = await crearEjecutivo(cliente.id, { nombre: 'Ejecutivo Uno' }, 'test')
    const e2 = await crearEjecutivo(cliente.id, { nombre: 'Ejecutivo Dos' }, 'test')

    await expect(actualizarEjecutivo(cliente.id, e1.id, { activo: false }, 'test')).resolves.toMatchObject({
      activo: false,
    })
    // e2 sigue activo, no bloquea.
    void e2
  })

  it('RN-CLI-04: no se puede desactivar el último ejecutivo activo de un cliente con operaciones abiertas', async () => {
    const cliente = await crearCliente(agencia('QAC-EJ2'), 'test')
    idsCreados.push(cliente.id)
    const grupo = await prisma.grupo.create({
      data: { codigo: 'QAC-EJ2-GR', apellido: 'QA', clienteId: cliente.id, cantidadPax: 1, creadoPor: 'test' },
    })
    gruposCreados.push(grupo.id)
    const cot = await prisma.cotizacion.create({
      data: {
        numero: 'COT-QAC-EJ2',
        clienteId: cliente.id,
        grupoId: grupo.id,
        areaNegocio: 'RECEPTIVO',
        fechaOperacion: new Date(),
        cantidadPax: 1,
        moneda: 'USD',
        tipoCambio: '1',
        estado: 'ENVIADA', // abierta
        creadoPor: 'test',
      },
    })
    cotizacionesCreadas.push(cot.id)

    const unico = await crearEjecutivo(cliente.id, { nombre: 'Único activo' }, 'test')

    await expect(actualizarEjecutivo(cliente.id, unico.id, { activo: false }, 'test')).rejects.toMatchObject({
      code: 'CONFLICT',
    })
    await expect(eliminarEjecutivo(cliente.id, unico.id, 'test')).rejects.toMatchObject({ code: 'CONFLICT' })

    await prisma.cotizacion.update({ where: { id: cot.id }, data: { estado: 'DESISTIDA' } })
  })

  it('permite desactivar el último ejecutivo activo si el cliente no tiene operaciones abiertas', async () => {
    const cliente = await crearCliente(agencia('QAC-EJ3'), 'test')
    idsCreados.push(cliente.id)
    const unico = await crearEjecutivo(cliente.id, { nombre: 'Único sin operaciones' }, 'test')

    await expect(actualizarEjecutivo(cliente.id, unico.id, { activo: false }, 'test')).resolves.toMatchObject({
      activo: false,
    })
  })
})

describe('RN-MAN-04/05: soft delete de cliente', () => {
  it('RN-MAN-05: un cliente eliminado sigue siendo accesible por id, pero no mutable', async () => {
    const cliente = await crearCliente(agencia('QAC-DEL1'), 'test')
    idsCreados.push(cliente.id)
    await eliminarCliente(cliente.id, 'test')

    const encontrado = await obtenerCliente(cliente.id)
    expect(encontrado.eliminadoEn).not.toBeNull()
    await expect(actualizarCliente(cliente.id, { razonSocial: 'x' }, 'test')).rejects.toMatchObject({
      code: 'CONFLICT',
    })
  })

  it('RN-MAN-04: rechaza el borrado si el cliente tiene una cotización no cerrada', async () => {
    const cliente = await crearCliente(agencia('QAC-DEL2'), 'test')
    idsCreados.push(cliente.id)
    const grupo = await prisma.grupo.create({
      data: { codigo: 'QAC-DEL2-GR', apellido: 'QA', clienteId: cliente.id, cantidadPax: 1, creadoPor: 'test' },
    })
    gruposCreados.push(grupo.id)
    const cot = await prisma.cotizacion.create({
      data: {
        numero: 'COT-QAC-DEL2',
        clienteId: cliente.id,
        grupoId: grupo.id,
        areaNegocio: 'RECEPTIVO',
        fechaOperacion: new Date(),
        cantidadPax: 1,
        moneda: 'USD',
        tipoCambio: '1',
        estado: 'BORRADOR',
        creadoPor: 'test',
      },
    })
    cotizacionesCreadas.push(cot.id)

    await expect(eliminarCliente(cliente.id, 'test')).rejects.toMatchObject({ code: 'CONFLICT' })

    // DESISTIDA es un estado "cerrado" para RN-MAN-04: libera el borrado.
    await prisma.cotizacion.update({ where: { id: cot.id }, data: { estado: 'DESISTIDA' } })
    await expect(eliminarCliente(cliente.id, 'test')).resolves.toBeUndefined()
  })
})
