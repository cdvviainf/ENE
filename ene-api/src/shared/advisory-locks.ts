// Namespaces de pg_advisory_xact_lock(namespace, key) del proyecto ENE.
// Un lock solo serializa dos flujos entre sí si AMBOS usan el mismo namespace,
// por eso viven en un único lugar. El rango 491xxx es propio de ENE: no debe
// chocar con los de FAS (490234, 490236-490241) si alguna vez comparten base.

/// Correlativo de Cotización — clave: año.
export const LOCK_COTIZACION_CORRELATIVO = 491001

/// Correlativo de Orden de Trabajo — clave: año.
export const LOCK_ORDEN_TRABAJO_CORRELATIVO = 491002

/// Correlativo de Orden de Compra — clave: año.
export const LOCK_ORDEN_COMPRA_CORRELATIVO = 491003

/// Folio interno de documento tributario — clave: tipo de documento.
export const LOCK_DOCUMENTO_TRIBUTARIO_FOLIO = 491004

/// Emisión idempotente de documentos del motor de PDF.
/// Clave: hashtext(tipo || ':' || documentoId) — el namespace es compartido
/// entre TODOS los tipos, así que dos documentos de tipos distintos con el
/// mismo id numérico no deben compartir lock.
export const LOCK_DOCUMENTOS_EMISION = 491005

/// Versionado de OT — serializa dos POST /versiones concurrentes sobre la
/// misma OT. Clave: ordenTrabajoId.
export const LOCK_ORDEN_TRABAJO_VERSION = 491006

/// Versionado de Cotización — serializa la creación de versiones sobre la misma
/// cotización. Clave: cotizacionId. Namespace propio para no colisionar con el
/// correlativo de cotización (491001), que se serializa por año.
export const LOCK_COTIZACION_VERSION = 491007

/// Versionado de Orden de Compra — serializa la creación de versiones sobre la
/// misma OC. Clave: ordenCompraId. Namespace propio, separado del correlativo
/// de OC (491003).
export const LOCK_ORDEN_COMPRA_VERSION = 491008

/// Correlativo de código de maestro (Cliente/Proveedor/Grupo/Servicio,
/// RN-COR-01 + RN-MAN-02). Namespace COMPARTIDO entre las cuatro entidades,
/// igual que 491005 — la clave distingue: `hashtext(entidad)`, así que dos
/// entidades distintas nunca se serializan entre sí por error.
export const LOCK_MAESTRO_CODIGO_CORRELATIVO = 491009

import type { Prisma } from '@prisma/client'

/// Toma el lock dentro de la transacción actual. Se libera al hacer commit
/// o rollback — no hay que liberarlo a mano.
export async function tomarLock(
  tx: Prisma.TransactionClient,
  namespace: number,
  clave: number,
): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${namespace}::int, ${clave}::int)`
}

/// Variante para namespaces con clave de texto (ej. 491005, 491009), donde la
/// clave real es `hashtext(texto)`. El hash lo calcula Postgres, no Node, para
/// no arriesgar una reimplementación distinta del algoritmo interno.
export async function tomarLockPorTexto(
  tx: Prisma.TransactionClient,
  namespace: number,
  claveTexto: string,
): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${namespace}::int, hashtext(${claveTexto}))`
}
