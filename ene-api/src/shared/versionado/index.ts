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
/// `L` es el tipo de línea que la entidad guarda por versión (RN-VER-09).
export interface Versionable<C extends Cabecera, V extends Version, D, L = unknown> {
  /// Namespace de pg_advisory_xact_lock para serializar la creación.
  readonly lockNamespace: number

  /// Nombre legible para los mensajes de error ("Orden de Trabajo").
  readonly entidad: string

  cargarCabecera(tx: Prisma.TransactionClient, cabeceraId: number): Promise<C | null>

  /// Mayor número de versión existente. 0 si no hay ninguna.
  ultimaVersion(tx: Prisma.TransactionClient, cabeceraId: number): Promise<number>

  /// Regla propia de la entidad antes de crear la versión `numero`. Debe lanzar
  /// si los datos no cumplen. Recibe la transacción y la cabecera ya cargada,
  /// para poder comparar contra la versión vigente (RN-VER-10: una CORRECCION de
  /// OT no toca la venta) o validar integridad referencial (RN-VER-13: la OC
  /// referencia una versión de su propia OT). Opcional: entidades sin reglas
  /// extra la omiten.
  validarNuevaVersion?(
    tx: Prisma.TransactionClient,
    cabecera: C,
    numero: number,
    datos: D,
  ): Promise<void>

  /// Crea la fila de versión con el número ya resuelto. `motivo` se persiste en
  /// la versión (RN-VER-06); llega validado por el orquestador.
  crearVersion(
    tx: Prisma.TransactionClient,
    cabeceraId: number,
    numero: number,
    datos: D,
    usuario: string,
    motivo?: string,
  ): Promise<V>

  /// Copia las líneas de la versión origen a la nueva. Se omite en la v1.
  copiarLineas(tx: Prisma.TransactionClient, desdeVersionId: number, haciaVersionId: number): Promise<void>

  /// Apunta la cabecera a la nueva versión (RN-VER-05).
  fijarVigente(tx: Prisma.TransactionClient, cabeceraId: number, versionId: number): Promise<void>

  /// Devuelve la versión con ese número, o null. Base de la lectura histórica
  /// (RN-VER-09) y de la línea base (RN-VER-12).
  cargarVersionPorNumero(
    tx: Prisma.TransactionClient,
    cabeceraId: number,
    numero: number,
  ): Promise<V | null>

  /// Líneas tal como quedaron guardadas en esa versión. No se reconstruyen desde
  /// los maestros actuales (RN-VER-09).
  cargarLineas(tx: Prisma.TransactionClient, versionId: number): Promise<L[]>
}

export interface OpcionesNuevaVersion<D> {
  cabeceraId: number
  datos: D
  usuario: string
  /// Obligatorio a partir de la versión 2 (RN-VER-06).
  motivo?: string
}

/// Crea la siguiente versión de forma serializada y transaccional.
///
/// Dos llamadas concurrentes sobre la misma cabecera no pueden producir dos
/// versiones con el mismo número: el advisory lock se toma antes de leer el
/// último número y se libera solo al cerrar la transacción (RN-VER-07).
export async function crearSiguienteVersion<C extends Cabecera, V extends Version, D, L>(
  tx: Prisma.TransactionClient,
  entidad: Versionable<C, V, D, L>,
  opciones: OpcionesNuevaVersion<D>,
): Promise<V> {
  const { cabeceraId, datos, usuario, motivo } = opciones

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

  // Reglas propias de la entidad (RN-VER-10 en OT, RN-VER-13 en OC). Lanza si no cumplen.
  await entidad.validarNuevaVersion?.(tx, cabecera, numero, datos)

  const nueva = await entidad.crearVersion(tx, cabeceraId, numero, datos, usuario, motivo)

  // RN-VER-02: modificar es crear la versión siguiente copiando las líneas.
  // Siempre se copia desde la vigente para las versiones posteriores a la 1.
  if (numero > 1 && cabecera.versionVigenteId) {
    await entidad.copiarLineas(tx, cabecera.versionVigenteId, nueva.id)
  }

  await entidad.fijarVigente(tx, cabeceraId, nueva.id)

  return nueva
}

/// Guarda de inmutabilidad (RN-VER-02 y RN-VER-08).
///
/// Llamar antes de cualquier escritura sobre una versión o sus líneas. Solo la
/// versión vigente admite edición, y solo mientras no exista una posterior.
export async function exigirVersionEditable<C extends Cabecera, V extends Version, D, L>(
  tx: Prisma.TransactionClient,
  entidad: Versionable<C, V, D, L>,
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

/// Documento en una versión concreta: la versión y sus líneas guardadas.
export interface DocumentoVersion<V extends Version, L> {
  version: V
  lineas: L[]
}

/// RN-VER-09: devuelve una versión tal como estaba —sus líneas guardadas en ese
/// momento—, sin reconstruir nada desde los maestros actuales. `null` si no
/// existe esa versión.
export async function cargarVersionHistorica<C extends Cabecera, V extends Version, D, L>(
  tx: Prisma.TransactionClient,
  entidad: Versionable<C, V, D, L>,
  cabeceraId: number,
  numero: number,
): Promise<DocumentoVersion<V, L> | null> {
  const version = await entidad.cargarVersionPorNumero(tx, cabeceraId, numero)
  if (!version) return null
  const lineas = await entidad.cargarLineas(tx, version.id)
  return { version, lineas }
}

/// RN-VER-12: la versión 1 es la línea base congelada. Toda desviación se mide
/// contra ella, no contra la vigente.
export async function versionBase<C extends Cabecera, V extends Version, D, L>(
  tx: Prisma.TransactionClient,
  entidad: Versionable<C, V, D, L>,
  cabeceraId: number,
): Promise<DocumentoVersion<V, L> | null> {
  return cargarVersionHistorica(tx, entidad, cabeceraId, 1)
}
