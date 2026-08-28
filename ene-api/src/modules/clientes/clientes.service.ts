import { prisma } from '../../lib/prisma.js'
import { noEncontrado, conflicto, validacion } from '../../shared/errors.js'
import { resolverCodigo } from '../../shared/correlativos.js'
import { validarRutChileno, formatearRut } from '../../shared/rut-validator.js'
import { operacionesAbiertas, hayOperacionesAbiertas, errorSoftDeleteBloqueado } from '../../shared/operaciones-abiertas.js'
import * as repo from './clientes.repository.js'
import type { ClienteCreateInput, ClienteUpdateInput, EjecutivoInput, EjecutivoUpdateInput } from './clientes.schema.js'

function monedaPorDefecto(tipo: 'AGENCIA' | 'EMPRESA'): 'CLP' | 'USD' {
  // Docs/mantenedores.md §3: default USD si AGENCIA, CLP si EMPRESA.
  return tipo === 'EMPRESA' ? 'CLP' : 'USD'
}

function normalizarRut(rut: string): string {
  if (!validarRutChileno(rut)) throw validacion('El RUT ingresado no es válido')
  return formatearRut(rut)
}

export async function listarClientes(
  page: number,
  limit: number,
  filtros: { q?: string; tipo?: 'AGENCIA' | 'EMPRESA'; pais?: string; monedaHabitual?: 'CLP' | 'USD' },
) {
  const { data, total } = await repo.findAllClientes(page, limit, filtros)
  return { data, meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } }
}

export async function obtenerCliente(id: number) {
  const cliente = await repo.findClienteById(id)
  if (!cliente) throw noEncontrado('Cliente', id)
  return cliente
}

// RN-MAN-05: el registro eliminado se puede consultar (obtenerCliente), pero
// no se puede volver a mutar. Usar antes de cualquier escritura sobre él.
async function obtenerClienteVigente(id: number) {
  const cliente = await obtenerCliente(id)
  if (cliente.eliminadoEn) throw conflicto('El cliente fue eliminado y no admite cambios')
  return cliente
}

// RN-CLI-02 [ADVIERTE]: el detalle expone si el cliente ya tiene operaciones
// —cualquier cotización u OT, sin importar su estado—, para que el formulario
// avise antes de cambiar el tipo (cambia la moneda por defecto de las
// cotizaciones nuevas, no las existentes). No reutiliza el guard de
// operaciones ABIERTAS de RN-MAN-04: son reglas distintas.
export async function obtenerClienteConEstado(id: number) {
  const cliente = await obtenerCliente(id)
  const tieneOperaciones = await repo.tieneAlgunaOperacion(id)
  return { ...cliente, tieneOperaciones }
}

export async function crearCliente(input: ClienteCreateInput, creadoPor: string) {
  // RN-CLI-01 [BLOQUEA]: rut obligatorio si tipo=EMPRESA.
  if (input.tipo === 'EMPRESA' && !input.rut) {
    throw validacion('El RUT es obligatorio para clientes de tipo Empresa (RN-CLI-01)')
  }
  const rut = input.rut ? normalizarRut(input.rut) : undefined

  return prisma.$transaction(async (tx) => {
    const codigo = await resolverCodigo(tx, 'CLIENTE', input.codigo)
    if (await repo.findClienteByCodigo(codigo, undefined, tx)) {
      throw conflicto(`Ya existe un cliente con el código "${codigo}"`)
    }

    return repo.createCliente(
      tx,
      {
        codigo,
        tipo: input.tipo,
        razonSocial: input.razonSocial,
        rut,
        nombreComercial: input.nombreComercial,
        pais: input.pais,
        monedaHabitual: input.monedaHabitual ?? monedaPorDefecto(input.tipo),
        condicionesPago: input.condicionesPago,
        email: input.email,
        telefono: input.telefono,
      },
      input.ejecutivos,
      creadoPor,
    )
  })
}

export async function actualizarCliente(id: number, input: ClienteUpdateInput, actualizadoPor: string) {
  const cliente = await obtenerClienteVigente(id)

  // RN-CLI-01 se revalida con el estado resultante: tipo/rut pueden venir
  // parciales en el PATCH.
  const tipoFinal = input.tipo ?? cliente.tipo
  const rutFinal = input.rut !== undefined ? input.rut : (cliente.rut ?? undefined)
  if (tipoFinal === 'EMPRESA' && !rutFinal) {
    throw validacion('El RUT es obligatorio para clientes de tipo Empresa (RN-CLI-01)')
  }

  // RN-CLI-02 [ADVIERTE]: cambiar el tipo de un cliente con operaciones se
  // permite; la advertencia la muestra el frontend antes de confirmar.
  return repo.updateCliente(
    id,
    { ...input, rut: input.rut !== undefined ? normalizarRut(input.rut) : undefined },
    actualizadoPor,
  )
}

export async function eliminarCliente(id: number, eliminadoPor: string) {
  await obtenerClienteVigente(id)
  const referencias = await operacionesAbiertas({ clienteId: id })
  if (hayOperacionesAbiertas(referencias)) throw errorSoftDeleteBloqueado('el cliente', referencias)
  await repo.softDeleteCliente(id, eliminadoPor)
}

// ─── Ejecutivos ──────────────────────────────────────────────────────────────

export async function crearEjecutivo(clienteId: number, input: EjecutivoInput, creadoPor: string) {
  await obtenerClienteVigente(clienteId)
  return repo.createEjecutivo(clienteId, input, creadoPor)
}

// RN-CLI-04 [BLOQUEA]: no se puede desactivar (ni eliminar) el último
// ejecutivo activo de un cliente con operaciones abiertas.
async function verificarNoUltimoEjecutivoActivo(clienteId: number, ejecutivoId: number) {
  const activosRestantes = await repo.countEjecutivosActivos(clienteId, ejecutivoId)
  if (activosRestantes === 0) {
    const referencias = await operacionesAbiertas({ clienteId })
    if (hayOperacionesAbiertas(referencias)) {
      throw conflicto(
        'No se puede desactivar ni eliminar: es el último ejecutivo activo de un cliente con operaciones abiertas (RN-CLI-04)',
      )
    }
  }
}

export async function actualizarEjecutivo(
  clienteId: number,
  ejecutivoId: number,
  input: EjecutivoUpdateInput,
  actualizadoPor: string,
) {
  const ejecutivo = await repo.findEjecutivoById(clienteId, ejecutivoId)
  if (!ejecutivo) throw noEncontrado('Ejecutivo', ejecutivoId)

  if (input.activo === false && ejecutivo.activo) {
    await verificarNoUltimoEjecutivoActivo(clienteId, ejecutivoId)
  }

  return repo.updateEjecutivo(ejecutivoId, input, actualizadoPor)
}

export async function eliminarEjecutivo(clienteId: number, ejecutivoId: number, eliminadoPor: string) {
  const ejecutivo = await repo.findEjecutivoById(clienteId, ejecutivoId)
  if (!ejecutivo) throw noEncontrado('Ejecutivo', ejecutivoId)

  if (ejecutivo.activo) {
    await verificarNoUltimoEjecutivoActivo(clienteId, ejecutivoId)
  }

  await repo.softDeleteEjecutivo(ejecutivoId, eliminadoPor)
}
