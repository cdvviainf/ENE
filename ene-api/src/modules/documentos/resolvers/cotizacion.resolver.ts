import { noEncontrado } from '../../../shared/errors.js'
import { aString, dividir, monto, sumar } from '../../../shared/dinero/index.js'
import { findCotizacionById } from '../../cotizaciones/cotizaciones.repository.js'
import { findEmpresa } from '../../config/empresa/empresa.repository.js'
import { leerComoDataUri } from '../../../shared/storage/archivos.js'
import type { OpcionesDocumento } from '../documentos.types.js'
import type { CotizacionPdfPayload } from '../schemas/cotizacion.schema.js'

/** Fecha del día N del itinerario: día 1 = fecha de inicio, día N = inicio +
 * (N−1), en UTC (mismo criterio que cotizaciones.service.fechaDelDia). */
function fechaDelDia(inicio: Date, dia: number): Date {
  const f = new Date(inicio.getTime())
  f.setUTCDate(f.getUTCDate() + (dia - 1))
  return f
}

/** Datos de la empresa emisora (RN-EMP-01). El logo se incrusta como data URI
 * para que el PDF sea autocontenido (se renderiza con setContent, sin red). */
async function resolverEmpresa(): Promise<CotizacionPdfPayload['empresa']> {
  const empresa = await findEmpresa()
  if (!empresa) {
    return { nombre: 'Extremo Norte Expediciones', rut: null, direccion: null, email: null, web: null, telefono: null, logoDataUri: null }
  }
  let logoDataUri: string | null = null
  if (empresa.logoStorageKey && empresa.logoMimeType) {
    try {
      logoDataUri = await leerComoDataUri(empresa.logoStorageKey, empresa.logoMimeType)
    } catch {
      logoDataUri = null // el archivo del logo no está; el PDF sale sin logo.
    }
  }
  return {
    nombre: empresa.nombre,
    rut: empresa.rut,
    direccion: empresa.direccion,
    email: empresa.email,
    web: empresa.web,
    telefono: empresa.telefono,
    logoDataUri,
  }
}

// Resolver de Cotización — CLAUDE.md §8: consulta la base y arma un payload
// tipado con Zod, sin lógica de presentación. Los textos de dominio se eligen
// acá según el idioma (RN-COT-06): descripciones/observaciones de línea, zonas
// y comentarios de encabezado se guardaron localizados.
export async function resolverCotizacion(id: number, opciones: OpcionesDocumento): Promise<CotizacionPdfPayload> {
  const cot = await findCotizacionById(id)
  if (!cot || cot.eliminadoEn) throw noEncontrado('Cotización', id)
  const version = cot.versionVigente
  if (!version) throw noEncontrado('Versión vigente de la cotización', id)

  const { idioma } = opciones
  const esEn = idioma === 'en'
  const empresa = await resolverEmpresa()

  const zonas = cot.zonas.map((z) => (esEn ? (z.zona.nombreEn ?? z.zona.nombre) : z.zona.nombre))

  // Agrupa las líneas por día y bloque (ya vienen ordenadas por dia, bloque,
  // orden desde el repository).
  const porDia = new Map<number, Map<'AM' | 'PM', CotizacionPdfPayload['dias'][number]['bloques'][number]['lineas']>>()
  for (const l of version.lineas) {
    const descripcion = esEn ? (l.descripcionEn ?? l.descripcion) : l.descripcion
    const observacion = esEn ? (l.observacionEn ?? l.observacion) : l.observacion
    const ventaTotal = l.ventaTotal.toString()
    const ventaPorPax = l.cantidadPax > 0 ? aString(dividir(monto(ventaTotal), String(l.cantidadPax))) : ventaTotal
    if (!porDia.has(l.dia)) porDia.set(l.dia, new Map())
    const bloques = porDia.get(l.dia)!
    if (!bloques.has(l.bloque)) bloques.set(l.bloque, [])
    bloques.get(l.bloque)!.push({
      descripcion,
      observacion: observacion ?? null,
      cantidadPax: l.cantidadPax,
      ventaTotal,
      ventaPorPax,
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

  const totalVenta = version.ventaTotal.toString()
  const recargoTotal = version.recargoTotal.toString()
  const totalConRecargo = aString(sumar(monto(totalVenta), monto(recargoTotal)))

  return {
    numero: cot.numero,
    version: version.version,
    empresa,
    cliente: { razonSocial: cot.cliente.razonSocial, rut: cot.cliente.rut ?? null },
    ejecutivo: cot.ejecutivo ? { nombre: cot.ejecutivo.nombre, email: cot.ejecutivo.email ?? null } : null,
    negocioApellido: cot.negocio.apellido,
    areaNegocio: cot.areaNegocio,
    fechaOperacion: cot.fechaOperacion.toISOString(),
    fechaCotizacion: version.creadoEn.toISOString(),
    fechaVigencia: version.fechaVigencia ? version.fechaVigencia.toISOString() : null,
    cantidadPax: cot.cantidadPax,
    moneda: cot.moneda,
    zonas,
    incluidos: (esEn ? (version.incluidosEn ?? version.incluidos) : version.incluidos) ?? null,
    noIncluidos: (esEn ? (version.noIncluidosEn ?? version.noIncluidos) : version.noIncluidos) ?? null,
    notasImportantes: (esEn ? (version.notasImportantesEn ?? version.notasImportantes) : version.notasImportantes) ?? null,
    dias,
    totalVenta,
    recargoFormaPago: version.formaPago ? version.formaPago.nombre : null,
    recargoTotal,
    totalConRecargo,
    idioma,
    modalidad: opciones.modalidad,
  }
}
