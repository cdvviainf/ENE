import type { CotizacionLinea, CotizacionVersion } from '@prisma/client'
import { LOCK_COTIZACION_VERSION } from '../../advisory-locks.js'
import type { Cabecera, Versionable } from '../index.js'

// Adaptador de versionado para Cotización (RN-VER-01). El módulo de la etapa 7
// lo consume; no reimplementa el mecanismo.

/// Datos propios de una versión de cotización. Los montos viajan como string
/// (RN-DIN-01); nunca como number.
export interface DatosCotizacionVersion {
  costoTotal: string
  margenTotal: string
  ventaTotal: string
}

export const cotizacionVersionable: Versionable<
  Cabecera,
  CotizacionVersion,
  DatosCotizacionVersion,
  CotizacionLinea
> = {
  lockNamespace: LOCK_COTIZACION_VERSION,
  entidad: 'Cotización',

  cargarCabecera: (tx, id) =>
    tx.cotizacion.findUnique({ where: { id }, select: { id: true, versionVigenteId: true } }),

  async ultimaVersion(tx, cabeceraId) {
    const agg = await tx.cotizacionVersion.aggregate({
      where: { cotizacionId: cabeceraId },
      _max: { version: true },
    })
    return agg._max.version ?? 0
  },

  crearVersion: (tx, cabeceraId, numero, datos, usuario, motivo) =>
    tx.cotizacionVersion.create({
      data: {
        cotizacionId: cabeceraId,
        version: numero,
        motivo: motivo ?? null,
        costoTotal: datos.costoTotal,
        margenTotal: datos.margenTotal,
        ventaTotal: datos.ventaTotal,
        creadoPor: usuario,
      },
    }),

  async copiarLineas(tx, desde, hacia) {
    const lineas = await tx.cotizacionLinea.findMany({ where: { cotizacionVersionId: desde } })
    if (lineas.length === 0) return
    // Los Decimal se copian tal cual (nunca a number): la línea queda idéntica.
    await tx.cotizacionLinea.createMany({
      data: lineas.map((l) => ({
        cotizacionVersionId: hacia,
        dia: l.dia,
        bloque: l.bloque,
        orden: l.orden,
        tipoLinea: l.tipoLinea,
        servicioId: l.servicioId,
        proveedorId: l.proveedorId,
        tarifarioValorId: l.tarifarioValorId,
        descripcion: l.descripcion,
        descripcionEn: l.descripcionEn,
        cantidadPax: l.cantidadPax,
        acomodacion: l.acomodacion,
        costoUnitario: l.costoUnitario,
        costoTotal: l.costoTotal,
        margenPct: l.margenPct,
        ventaTotal: l.ventaTotal,
      })),
    })
  },

  async fijarVigente(tx, cabeceraId, versionId) {
    await tx.cotizacion.update({ where: { id: cabeceraId }, data: { versionVigenteId: versionId } })
  },

  cargarVersionPorNumero: (tx, cabeceraId, numero) =>
    tx.cotizacionVersion.findUnique({
      where: { cotizacionId_version: { cotizacionId: cabeceraId, version: numero } },
    }),

  cargarLineas: (tx, versionId) =>
    tx.cotizacionLinea.findMany({
      where: { cotizacionVersionId: versionId },
      orderBy: [{ dia: 'asc' }, { bloque: 'asc' }, { orden: 'asc' }],
    }),
}
