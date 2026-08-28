import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { noEncontrado, conflicto, validacion } from '../../shared/errors.js'
import { resolverCodigo } from '../../shared/correlativos.js'
import { validarRutChileno, formatearRut } from '../../shared/rut-validator.js'
import { operacionesAbiertas, hayOperacionesAbiertas, errorSoftDeleteBloqueado } from '../../shared/operaciones-abiertas.js'
import * as repo from './proveedores.repository.js'
import type {
  AliasInput,
  ContactoInput,
  ContactoUpdateInput,
  CuentaInput,
  CuentaUpdateInput,
  ProveedorCreateInput,
  ProveedorUpdateInput,
} from './proveedores.schema.js'

function normalizarRut(rut: string): string {
  if (!validarRutChileno(rut)) throw validacion('El RUT ingresado no es válido')
  return formatearRut(rut)
}

async function verificarAliasDisponibles(alias: string[], excluirProveedorId?: number) {
  // RN-PRV-03 [BLOQUEA]: rechaza también los duplicados dentro del mismo
  // payload (insensible a mayúsculas) — el prechequeo uno-a-uno contra la
  // base no los detecta porque ninguno existe todavía.
  const vistos = new Set<string>()
  for (const a of alias) {
    const clave = a.toLowerCase()
    if (vistos.has(clave)) {
      throw conflicto(`El alias "${a}" está repetido en la misma solicitud (RN-PRV-03)`)
    }
    vistos.add(clave)
  }

  for (const a of alias) {
    if (await repo.findAliasDuplicado(a, excluirProveedorId)) {
      throw conflicto(`El alias "${a}" ya está en uso por otro proveedor (RN-PRV-03)`)
    }
  }
}

// El prechequeo de verificarAliasDisponibles no cierra condiciones de
// carrera entre requests concurrentes — la garantía real es el índice único
// parcial de la migración. Esto traduce esa violación a un CONFLICT legible
// en vez de dejar pasar el P2002 crudo como INTERNAL_ERROR.
function esViolacionAliasUnico(err: unknown): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== 'P2002') return false
  // El target de un índice creado a mano (no @@unique de Prisma) puede llegar
  // como string o array según el motor — se compara como texto para cubrir
  // ambas formas.
  return JSON.stringify(err.meta?.target ?? '').toLowerCase().includes('alias')
}

export async function listarProveedores(
  page: number,
  limit: number,
  filtros: { q?: string; tipoServicioId?: number; zonaId?: number },
) {
  const { data, total } = await repo.findAllProveedores(page, limit, filtros)
  return { data, meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } }
}

export async function obtenerProveedor(id: number) {
  const proveedor = await repo.findProveedorById(id)
  if (!proveedor) throw noEncontrado('Proveedor', id)
  return proveedor
}

// RN-MAN-05: se puede consultar un proveedor eliminado, pero no volver a mutarlo.
async function obtenerProveedorVigente(id: number) {
  const proveedor = await obtenerProveedor(id)
  if (proveedor.eliminadoEn) throw conflicto('El proveedor fue eliminado y no admite cambios')
  return proveedor
}

export async function crearProveedor(input: ProveedorCreateInput, creadoPor: string) {
  const rut = normalizarRut(input.rut)

  if (await repo.findProveedorByRut(rut)) {
    throw conflicto(`Ya existe un proveedor con el RUT "${rut}"`)
  }
  if (input.alias?.length) {
    await verificarAliasDisponibles(input.alias.map((a) => a.alias))
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const codigo = await resolverCodigo(tx, 'PROVEEDOR', input.codigo)
      if (await repo.findProveedorByCodigo(codigo, undefined, tx)) {
        throw conflicto(`Ya existe un proveedor con el código "${codigo}"`)
      }

      return repo.createProveedor(
        tx,
        {
          codigo,
          razonSocial: input.razonSocial,
          rut,
          nombreComercial: input.nombreComercial,
          tipoServicioId: input.tipoServicioId,
          condicionesPago: input.condicionesPago,
          politicaCancelacion: input.politicaCancelacion,
          email: input.email,
          telefono: input.telefono,
        },
        input.zonas,
        input.alias,
        input.cuentas,
        input.contactos,
        creadoPor,
      )
    })
  } catch (err) {
    // Backstop de RN-PRV-03 ante una carrera que el prechequeo no alcanzó a
    // detectar: el índice único parcial de la migración sí la bloquea.
    if (esViolacionAliasUnico(err)) throw conflicto('Uno de los alias ya está en uso por otro proveedor (RN-PRV-03)')
    throw err
  }
}

export async function actualizarProveedor(id: number, input: ProveedorUpdateInput, actualizadoPor: string) {
  await obtenerProveedorVigente(id)

  const rut = input.rut !== undefined ? normalizarRut(input.rut) : undefined
  if (rut && (await repo.findProveedorByRut(rut, id))) {
    throw conflicto(`Ya existe un proveedor con el RUT "${rut}"`)
  }

  return repo.updateProveedor(id, { ...input, rut }, actualizadoPor)
}

export async function eliminarProveedor(id: number, eliminadoPor: string) {
  await obtenerProveedorVigente(id)
  const referencias = await operacionesAbiertas({ proveedorId: id })
  if (hayOperacionesAbiertas(referencias)) throw errorSoftDeleteBloqueado('el proveedor', referencias)
  await repo.softDeleteProveedor(id, eliminadoPor)
}

// ─── Alias ───────────────────────────────────────────────────────────────────

export async function crearAlias(proveedorId: number, input: AliasInput, creadoPor: string) {
  await obtenerProveedorVigente(proveedorId)
  await verificarAliasDisponibles([input.alias])
  try {
    return await repo.createAlias(proveedorId, input, creadoPor)
  } catch (err) {
    if (esViolacionAliasUnico(err)) throw conflicto(`El alias "${input.alias}" ya está en uso por otro proveedor (RN-PRV-03)`)
    throw err
  }
}

export async function eliminarAlias(proveedorId: number, aliasId: number, eliminadoPor: string) {
  const alias = await repo.findAliasById(proveedorId, aliasId)
  if (!alias) throw noEncontrado('Alias', aliasId)
  await repo.softDeleteAlias(aliasId, eliminadoPor)
}

// ─── Cuentas bancarias ───────────────────────────────────────────────────────

export async function crearCuenta(proveedorId: number, input: CuentaInput, creadoPor: string) {
  await obtenerProveedorVigente(proveedorId)
  return repo.createCuenta(proveedorId, input, creadoPor)
}

export async function actualizarCuenta(
  proveedorId: number,
  cuentaId: number,
  input: CuentaUpdateInput,
  actualizadoPor: string,
) {
  const cuenta = await repo.findCuentaById(proveedorId, cuentaId)
  if (!cuenta) throw noEncontrado('Cuenta bancaria', cuentaId)
  return repo.updateCuenta(cuentaId, input, actualizadoPor)
}

export async function eliminarCuenta(proveedorId: number, cuentaId: number, eliminadoPor: string) {
  const cuenta = await repo.findCuentaById(proveedorId, cuentaId)
  if (!cuenta) throw noEncontrado('Cuenta bancaria', cuentaId)
  await repo.softDeleteCuenta(cuentaId, eliminadoPor)
}

// ─── Contactos ───────────────────────────────────────────────────────────────

export async function crearContacto(proveedorId: number, input: ContactoInput, creadoPor: string) {
  await obtenerProveedorVigente(proveedorId)
  return repo.createContacto(proveedorId, input, creadoPor)
}

export async function actualizarContacto(
  proveedorId: number,
  contactoId: number,
  input: ContactoUpdateInput,
  actualizadoPor: string,
) {
  const contacto = await repo.findContactoById(proveedorId, contactoId)
  if (!contacto) throw noEncontrado('Contacto', contactoId)
  return repo.updateContacto(contactoId, input, actualizadoPor)
}

export async function eliminarContacto(proveedorId: number, contactoId: number, eliminadoPor: string) {
  const contacto = await repo.findContactoById(proveedorId, contactoId)
  if (!contacto) throw noEncontrado('Contacto', contactoId)
  await repo.softDeleteContacto(contactoId, eliminadoPor)
}
