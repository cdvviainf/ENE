import type { EstadoCotizacion } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { conflicto } from './errors.js'

// RN-MAN-04: una cotización "cerrada" es APROBADA (generó OT), PERDIDA o
// DESISTIDA. El resto (BORRADOR, ENVIADA, EN_NEGOCIACION) es "no cerrada".
const ESTADOS_COTIZACION_ABIERTA: EstadoCotizacion[] = ['BORRADOR', 'ENVIADA', 'EN_NEGOCIACION']

export interface ReferenciaAbierta {
  cotizaciones: string[]
  ordenesTrabajo: string[]
  ordenesCompra: string[]
}

type FiltroOperacionesAbiertas =
  | { clienteId: number }
  | { proveedorId: number }
  | { grupoId: number }
  | { servicioId: number }
  | { zonaId: number }

// clienteId/grupoId/zonaId están en la cabecera de Cotizacion/OrdenTrabajo;
// proveedorId/servicioId solo en las líneas de su versión vigente — de ahí el
// `some.lineas.some` en vez del filtro plano de cabecera.
function condicionLinea(filtro: FiltroOperacionesAbiertas): { proveedorId: number } | { servicioId: number } | null {
  if ('proveedorId' in filtro) return { proveedorId: filtro.proveedorId }
  if ('servicioId' in filtro) return { servicioId: filtro.servicioId }
  return null
}

function condicionCabecera(filtro: FiltroOperacionesAbiertas): { clienteId?: number; grupoId?: number; zonaId?: number } {
  if ('clienteId' in filtro) return { clienteId: filtro.clienteId }
  if ('grupoId' in filtro) return { grupoId: filtro.grupoId }
  if ('zonaId' in filtro) return { zonaId: filtro.zonaId }
  return {}
}

/**
 * Resuelve las operaciones "no cerradas" que referencian al maestro dado
 * (RN-MAN-04): cotización no cerrada, OT en cualquier estado salvo CERRADA,
 * u OC vigente (no ANULADA). Usado por el guard de soft delete de
 * Cliente/Proveedor/Grupo/Servicio/Zona y por RN-CLI-04 (último ejecutivo
 * activo del cliente).
 */
export async function operacionesAbiertas(filtro: FiltroOperacionesAbiertas): Promise<ReferenciaAbierta> {
  const lineaCond = condicionLinea(filtro)

  const cotizaciones = await prisma.cotizacion.findMany({
    where: {
      estado: { in: ESTADOS_COTIZACION_ABIERTA },
      ...condicionCabecera(filtro),
      ...(lineaCond ? { versiones: { some: { lineas: { some: lineaCond } } } } : {}),
    },
    select: { numero: true },
  })

  const ordenesTrabajo = await prisma.ordenTrabajo.findMany({
    where: {
      estado: { not: 'CERRADA' },
      ...condicionCabecera(filtro),
      ...(lineaCond ? { versiones: { some: { lineas: { some: lineaCond } } } } : {}),
    },
    select: { numero: true },
  })

  const ordenesCompra =
    'proveedorId' in filtro
      ? await prisma.ordenCompra.findMany({
          where: { proveedorId: filtro.proveedorId, estado: { not: 'ANULADA' } },
          select: { numero: true },
        })
      : []

  return {
    cotizaciones: cotizaciones.map((c) => c.numero),
    ordenesTrabajo: ordenesTrabajo.map((o) => o.numero),
    ordenesCompra: ordenesCompra.map((o) => o.numero),
  }
}

export function hayOperacionesAbiertas(ref: ReferenciaAbierta): boolean {
  return ref.cotizaciones.length > 0 || ref.ordenesTrabajo.length > 0 || ref.ordenesCompra.length > 0
}

/// Arma el error CONFLICT con el detalle de qué operaciones bloquean el
/// borrado (formato de ejemplo en Docs/mantenedores.md RN-MAN-04).
export function errorSoftDeleteBloqueado(sujeto: string, ref: ReferenciaAbierta) {
  const total = ref.cotizaciones.length + ref.ordenesTrabajo.length + ref.ordenesCompra.length
  const details: Record<string, string[]> = {}
  if (ref.cotizaciones.length) details.cotizaciones = ref.cotizaciones
  if (ref.ordenesTrabajo.length) details.ordenesTrabajo = ref.ordenesTrabajo
  if (ref.ordenesCompra.length) details.ordenesCompra = ref.ordenesCompra

  return conflicto(
    `No se puede eliminar: ${sujeto} participa en ${total} operación${total === 1 ? '' : 'es'} activa${total === 1 ? '' : 's'}`,
    details,
  )
}
