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
