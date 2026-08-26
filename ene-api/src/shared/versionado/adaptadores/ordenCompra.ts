import type { OrdenCompraLinea, OrdenCompraVersion } from '@prisma/client'
import { LOCK_ORDEN_COMPRA_VERSION } from '../../advisory-locks.js'
import { validacion } from '../../errors.js'
import type { Cabecera, Versionable } from '../index.js'

// Adaptador de versionado para Orden de Compra (RN-VER-01). Cada versión registra
// contra qué versión de OT fue emitida (RN-VER-13).

/// Datos propios de una versión de OC. `ordenTrabajoVersionId` es obligatorio:
/// deja trazado contra qué versión de la OT se emitió esta OC (RN-VER-13).
export interface DatosOCVersion {
  ordenTrabajoVersionId: number
  montoTotal: string
}

export const ordenCompraVersionable: Versionable<
  Cabecera,
  OrdenCompraVersion,
  DatosOCVersion,
  OrdenCompraLinea
> = {
  lockNamespace: LOCK_ORDEN_COMPRA_VERSION,
  entidad: 'Orden de Compra',

  cargarCabecera: (tx, id) =>
    tx.ordenCompra.findUnique({ where: { id }, select: { id: true, versionVigenteId: true } }),

  async ultimaVersion(tx, cabeceraId) {
    const agg = await tx.ordenCompraVersion.aggregate({
      where: { ordenCompraId: cabeceraId },
      _max: { version: true },
    })
    return agg._max.version ?? 0
  },

  // RN-VER-13: la versión de OT referenciada debe pertenecer a la MISMA OT de
  // esta OC. La FK simple del schema no lo garantiza; se valida en transacción.
  async validarNuevaVersion(tx, cabecera, _numero, datos) {
    const [otVersion, oc] = await Promise.all([
      tx.ordenTrabajoVersion.findUnique({
        where: { id: datos.ordenTrabajoVersionId },
        select: { ordenTrabajoId: true },
      }),
      tx.ordenCompra.findUnique({
        where: { id: cabecera.id },
        select: { ordenTrabajoId: true },
      }),
    ])
    if (!otVersion || !oc || otVersion.ordenTrabajoId !== oc.ordenTrabajoId) {
      throw validacion(
        'La versión de OT referenciada por la OC debe pertenecer a la misma OT de la OC (RN-VER-13).',
      )
    }
  },

  crearVersion: (tx, cabeceraId, numero, datos, usuario, motivo) =>
    tx.ordenCompraVersion.create({
      data: {
        ordenCompraId: cabeceraId,
        version: numero,
        ordenTrabajoVersionId: datos.ordenTrabajoVersionId,
        motivo: motivo ?? null,
        montoTotal: datos.montoTotal,
        creadoPor: usuario,
      },
    }),

  async copiarLineas(tx, desde, hacia) {
    const lineas = await tx.ordenCompraLinea.findMany({ where: { ordenCompraVersionId: desde } })
    if (lineas.length === 0) return
    await tx.ordenCompraLinea.createMany({
      data: lineas.map((l) => ({
        ordenCompraVersionId: hacia,
        ordenTrabajoLineaId: l.ordenTrabajoLineaId,
        descripcion: l.descripcion,
        fechaServicio: l.fechaServicio,
        cantidadPax: l.cantidadPax,
        costoReal: l.costoReal,
        moneda: l.moneda,
      })),
    })
  },

  async fijarVigente(tx, cabeceraId, versionId) {
    await tx.ordenCompra.update({ where: { id: cabeceraId }, data: { versionVigenteId: versionId } })
  },

  cargarVersionPorNumero: (tx, cabeceraId, numero) =>
    tx.ordenCompraVersion.findUnique({
      where: { ordenCompraId_version: { ordenCompraId: cabeceraId, version: numero } },
    }),

  cargarLineas: (tx, versionId) =>
    tx.ordenCompraLinea.findMany({
      where: { ordenCompraVersionId: versionId },
      orderBy: { id: 'asc' },
    }),
}
