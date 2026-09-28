import { noEncontrado } from '../../../shared/errors.js'
import { findCotizacionById } from '../../cotizaciones/cotizaciones.repository.js'
import type { OpcionesDocumento } from '../documentos.types.js'
import type { CotizacionPdfPayload } from '../schemas/cotizacion.schema.js'

// Datos del emisor (CLAUDE.md §1: Extremo Norte Expediciones). ENE es una sola
// empresa; no hay tabla de empresa como en FAS, así que el emisor es constante.
const EMISOR = {
  nombre: 'Extremo Norte Expediciones',
  rut: null as string | null,
  email: 'no-reply@extremonorte.com',
  web: 'www.extremonorte.com',
}

/** Fecha del día N del itinerario: día 1 = fecha de inicio, día N = inicio +
 * (N−1), en UTC (mismo criterio que cotizaciones.service.fechaDelDia). */
function fechaDelDia(inicio: Date, dia: number): Date {
  const f = new Date(inicio.getTime())
  f.setUTCDate(f.getUTCDate() + (dia - 1))
  return f
}

// Resolver de Cotización — CLAUDE.md §8: consulta la base y arma un payload
// tipado con Zod, sin lógica de presentación. Los textos de dominio se eligen
// acá según el idioma (RN-COT-06): la descripción de cada línea se guardó
// localizada al capturar (desde Servicio.nombre/nombreEn), y la zona sale de
// Zona.nombre/nombreEn. Reusa el repository de cotizaciones en vez de
// duplicar la query.
export async function resolverCotizacion(id: number, opciones: OpcionesDocumento): Promise<CotizacionPdfPayload> {
  const cot = await findCotizacionById(id)
  if (!cot || cot.eliminadoEn) throw noEncontrado('Cotización', id)
  const version = cot.versionVigente
  if (!version) throw noEncontrado('Versión vigente de la cotización', id)

  const { idioma } = opciones
  const zona = cot.zona ? (idioma === 'en' ? (cot.zona.nombreEn ?? cot.zona.nombre) : cot.zona.nombre) : null

  // Agrupa las líneas por día y bloque (ya vienen ordenadas por dia, bloque,
  // orden desde el repository).
  const porDia = new Map<number, Map<'AM' | 'PM', CotizacionPdfPayload['dias'][number]['bloques'][number]['lineas']>>()
  for (const l of version.lineas) {
    const descripcion = idioma === 'en' ? (l.descripcionEn ?? l.descripcion) : l.descripcion
    if (!porDia.has(l.dia)) porDia.set(l.dia, new Map())
    const bloques = porDia.get(l.dia)!
    if (!bloques.has(l.bloque)) bloques.set(l.bloque, [])
    bloques.get(l.bloque)!.push({
      descripcion,
      cantidadPax: l.cantidadPax,
      ventaTotal: l.ventaTotal.toString(),
    })
  }

  const dias: CotizacionPdfPayload['dias'] = [...porDia.keys()]
    .sort((a, b) => a - b)
    .map((dia) => ({
      dia,
      fecha: fechaDelDia(cot.fechaOperacion, dia).toISOString(),
      bloques: (['AM', 'PM'] as const)
        .filter((b) => porDia.get(dia)!.has(b))
        .map((bloque) => ({ bloque, lineas: porDia.get(dia)!.get(bloque)! })),
    }))

  return {
    numero: cot.numero,
    emisor: EMISOR,
    cliente: { razonSocial: cot.cliente.razonSocial, rut: cot.cliente.rut ?? null },
    grupoApellido: cot.grupo.apellido,
    areaNegocio: cot.areaNegocio,
    fechaOperacion: cot.fechaOperacion.toISOString(),
    cantidadPax: cot.cantidadPax,
    moneda: cot.moneda,
    zona,
    dias,
    totalVenta: version.ventaTotal.toString(),
    idioma,
    modalidad: opciones.modalidad,
  }
}
