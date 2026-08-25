import type { Prisma } from '@prisma/client'
import { tomarLock } from '../advisory-locks.js'
import { conflicto, validacion } from '../errors.js'

// ============================================================================
// Versionado — mecanismo transversal, etapa 1.
// Reglas RN-VER-01 a RN-VER-13 en Docs/reglas-negocio.md.
//
// Un solo contrato para Cotización, OT y OC:
//   cabecera estable → N versiones → líneas colgando de la versión.
//
// Las etapas 6, 7 y 8 consumen esto; no reimplementan versionado.
// ============================================================================

/// Toda cabecera versionable expone su id y a qué versión apunta hoy.
export interface Cabecera {
  id: number
  versionVigenteId: number | null
}

/// Toda versión conoce su cabecera y su número.
export interface Version {
  id: number
  version: number
}

/// Contrato que cada entidad versionable implementa una vez.
/// `tx` siempre es la transacción en curso: crear una versión nunca ocurre
/// fuera de transacción (RN-VER-07).
export interface Versionable<C extends Cabecera, V extends Version, D> {
  /// Namespace de pg_advisory_xact_lock para serializar la creación.
  readonly lockNamespace: number

  /// Nombre legible para los mensajes de error ("Orden de Trabajo").
  readonly entidad: string

  cargarCabecera(tx: Prisma.TransactionClient, cabeceraId: number): Promise<C | null>

  /// Mayor número de versión existente. 0 si no hay ninguna.
  ultimaVersion(tx: Prisma.TransactionClient, cabeceraId: number): Promise<number>

  /// Crea la fila de versión con el número ya resuelto.
  crearVersion(
    tx: Prisma.TransactionClient,
    cabeceraId: number,
    numero: number,
    datos: D,
    usuario: string,
  ): Promise<V>

  /// Copia las líneas de la versión origen a la nueva. Se omite en la v1.
  copiarLineas(tx: Prisma.TransactionClient, desdeVersionId: number, haciaVersionId: number): Promise<void>

  /// Apunta la cabecera a la nueva versión (RN-VER-05).
  fijarVigente(tx: Prisma.TransactionClient, cabeceraId: number, versionId: number): Promise<void>
}

export interface OpcionesNuevaVersion<D> {
  cabeceraId: number
  datos: D
  usuario: string
  /// Obligatorio a partir de la versión 2 (RN-VER-06).
  motivo?: string
  /// Si es false, la versión nace vacía en vez de copiar la anterior.
  copiarLineas?: boolean
}

/// Crea la siguiente versión de forma serializada y transaccional.
///
/// Dos llamadas concurrentes sobre la misma cabecera no pueden producir dos
/// versiones con el mismo número: el advisory lock se toma antes de leer el
/// último número y se libera solo al cerrar la transacción (RN-VER-07).
export async function crearSiguienteVersion<C extends Cabecera, V extends Version, D>(
  tx: Prisma.TransactionClient,
  entidad: Versionable<C, V, D>,
  opciones: OpcionesNuevaVersion<D>,
): Promise<V> {
  const { cabeceraId, datos, usuario, motivo, copiarLineas = true } = opciones

  await tomarLock(tx, entidad.lockNamespace, cabeceraId)

  const cabecera = await entidad.cargarCabecera(tx, cabeceraId)
  if (!cabecera) {
    throw conflicto(`${entidad.entidad} ${cabeceraId} no existe`)
  }

  const ultima = await entidad.ultimaVersion(tx, cabeceraId)
  const numero = ultima + 1

  if (numero > 1 && !motivo?.trim()) {
    throw validacion(`El motivo es obligatorio a partir de la versión 2 (RN-VER-06)`)
  }

  const nueva = await entidad.crearVersion(tx, cabeceraId, numero, datos, usuario)

  if (numero > 1 && copiarLineas && cabecera.versionVigenteId) {
    await entidad.copiarLineas(tx, cabecera.versionVigenteId, nueva.id)
  }

  await entidad.fijarVigente(tx, cabeceraId, nueva.id)

  return nueva
}

/// Guarda de inmutabilidad (RN-VER-02 y RN-VER-08).
///
/// Llamar antes de cualquier escritura sobre una versión o sus líneas. Solo la
/// versión vigente admite edición, y solo mientras no exista una posterior.
export async function exigirVersionEditable<C extends Cabecera, V extends Version, D>(
  tx: Prisma.TransactionClient,
  entidad: Versionable<C, V, D>,
  cabeceraId: number,
  versionId: number,
): Promise<void> {
  const cabecera = await entidad.cargarCabecera(tx, cabeceraId)
  if (!cabecera) {
    throw conflicto(`${entidad.entidad} ${cabeceraId} no existe`)
  }
  if (cabecera.versionVigenteId !== versionId) {
    throw conflicto(
      `La versión ${versionId} de ${entidad.entidad} ${cabeceraId} es histórica y no se puede editar. ` +
        `Crear una versión nueva (RN-VER-02).`,
    )
  }
}
