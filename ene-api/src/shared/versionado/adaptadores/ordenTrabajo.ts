import { Prisma } from '@prisma/client'
import type { OrdenTrabajoLinea, OrdenTrabajoVersion, TipoCambioVersion } from '@prisma/client'
import { LOCK_ORDEN_TRABAJO_VERSION } from '../../advisory-locks.js'
import { validacion } from '../../errors.js'
import type { Cabecera, Versionable } from '../index.js'

// Adaptador de versionado para Orden de Trabajo (RN-VER-01). La versión 1 es la
// línea base congelada (RN-VER-12); las posteriores declaran su tipoCambio.

/// Datos propios de una versión de OT. `tipoCambio` es obligatorio desde la v2
/// (RN-VER-10); en la v1 se omite y la base de datos aplica su default.
///
/// `aprobadoPorCliente` es la evidencia mínima que exige el mecanismo para
/// aceptar un ALCANCE (RN-VER-10). El flujo completo de aprobación —quién,
/// cuándo, con qué documento— es responsabilidad del módulo de OT (etapa 8);
/// acá solo se comprueba que exista.
export interface DatosOTVersion {
  tipoCambio?: TipoCambioVersion
  aprobadoPorCliente?: boolean
  costoTeoricoTotal: string
  margenTotal: string
  ventaTotal: string
}

export const ordenTrabajoVersionable: Versionable<
  Cabecera,
  OrdenTrabajoVersion,
  DatosOTVersion,
  OrdenTrabajoLinea
> = {
  lockNamespace: LOCK_ORDEN_TRABAJO_VERSION,
  entidad: 'Orden de Trabajo',

  cargarCabecera: (tx, id) =>
    tx.ordenTrabajo.findUnique({ where: { id }, select: { id: true, versionVigenteId: true } }),

  async ultimaVersion(tx, cabeceraId) {
    const agg = await tx.ordenTrabajoVersion.aggregate({
      where: { ordenTrabajoId: cabeceraId },
      _max: { version: true },
    })
    return agg._max.version ?? 0
  },

  // RN-VER-10/11 [BLOQUEA]: toda versión de OT posterior a la 1 declara su
  // tipoCambio. Un ALCANCE recotiza y exige aprobación del cliente; una
  // CORRECCION no toca ni la venta (RN-VER-10) ni el costo (RN-VER-11): solo
  // corrige datos no monetarios. Una variación de costo se absorbe en margen y
  // se registra como costo real en la OC, no crea versión de OT.
  async validarNuevaVersion(tx, cabecera, numero, datos) {
    if (numero <= 1) return

    if (datos.tipoCambio == null) {
      throw validacion(
        'Toda versión de OT posterior a la 1 debe declarar tipoCambio ALCANCE o CORRECCION (RN-VER-10)',
      )
    }

    if (datos.tipoCambio === 'ALCANCE') {
      if (!datos.aprobadoPorCliente) {
        throw validacion('Una versión ALCANCE de OT requiere aprobación del cliente (RN-VER-10).')
      }
      return
    }

    // CORRECCION: comparar contra la vigente.
    if (cabecera.versionVigenteId == null) return
    const vigente = await tx.ordenTrabajoVersion.findUnique({
      where: { id: cabecera.versionVigenteId },
      select: { ventaTotal: true, costoTeoricoTotal: true },
    })
    if (!vigente) return

    if (!new Prisma.Decimal(datos.ventaTotal).equals(vigente.ventaTotal)) {
      throw validacion(
        'Una versión CORRECCION de OT no puede cambiar la venta: debe coincidir con la vigente (RN-VER-10). ' +
          'Un cambio de venta requiere tipoCambio ALCANCE.',
      )
    }
    if (!new Prisma.Decimal(datos.costoTeoricoTotal).equals(vigente.costoTeoricoTotal)) {
      throw validacion(
        'Una variación de costo del mismo servicio no crea una versión de OT: se absorbe en margen y se ' +
          'registra como costo real en la OC (RN-VER-11).',
      )
    }
  },

  crearVersion: (tx, cabeceraId, numero, datos, usuario, motivo) =>
    tx.ordenTrabajoVersion.create({
      data: {
        ordenTrabajoId: cabeceraId,
        version: numero,
        tipoCambio: datos.tipoCambio,
        motivo: motivo ?? null,
        costoTeoricoTotal: datos.costoTeoricoTotal,
        margenTotal: datos.margenTotal,
        ventaTotal: datos.ventaTotal,
        creadoPor: usuario,
      },
    }),

  async copiarLineas(tx, desde, hacia) {
    const lineas = await tx.ordenTrabajoLinea.findMany({ where: { ordenTrabajoVersionId: desde } })
    if (lineas.length === 0) return
    await tx.ordenTrabajoLinea.createMany({
      data: lineas.map((l) => ({
        ordenTrabajoVersionId: hacia,
        dia: l.dia,
        bloque: l.bloque,
        orden: l.orden,
        tipoLinea: l.tipoLinea,
        servicioId: l.servicioId,
        proveedorId: l.proveedorId,
        descripcion: l.descripcion,
        descripcionEn: l.descripcionEn,
        cantidadPax: l.cantidadPax,
        acomodacion: l.acomodacion,
        costoTeorico: l.costoTeorico,
        margenPct: l.margenPct,
        ventaLinea: l.ventaLinea,
        estadoServicio: l.estadoServicio,
        fechaServicio: l.fechaServicio,
      })),
    })
  },

  async fijarVigente(tx, cabeceraId, versionId) {
    await tx.ordenTrabajo.update({ where: { id: cabeceraId }, data: { versionVigenteId: versionId } })
  },

  cargarVersionPorNumero: (tx, cabeceraId, numero) =>
    tx.ordenTrabajoVersion.findUnique({
      where: { ordenTrabajoId_version: { ordenTrabajoId: cabeceraId, version: numero } },
    }),

  cargarLineas: (tx, versionId) =>
    tx.ordenTrabajoLinea.findMany({
      where: { ordenTrabajoVersionId: versionId },
      orderBy: [{ dia: 'asc' }, { bloque: 'asc' }, { orden: 'asc' }],
    }),
}
