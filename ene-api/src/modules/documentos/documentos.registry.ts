import { resolverCotizacion } from './resolvers/cotizacion.resolver.js'
import { cotizacionPdfPayloadSchema } from './schemas/cotizacion.schema.js'
import { CotizacionV1 } from './templates/cotizacion/v1/index.js'
import type { DocumentDefinition, DocumentRegistry } from './documentos.types.js'

// Registro central de documentos (CLAUDE.md §8): agregar un documento del
// catálogo es agregar una entrada acá. En la Etapa 7 solo existe `cotizacion`;
// `orden-compra` y `comprobante-pago` se registran en las Etapas 9 y 10.
export const DOCUMENT_REGISTRY: DocumentRegistry = {
  cotizacion: {
    titulo: 'Cotización',
    resolver: resolverCotizacion,
    schema: cotizacionPdfPayloadSchema,
    plantillaActual: 'v1',
    plantillas: { v1: CotizacionV1 },
    pagina: { formato: 'A4', orientacion: 'portrait', margen: '16mm 14mm' },
    itemMenu: 'COTIZACIONES',
    // El idioma entra en el nombre de archivo (COT-2026-0142_EN.pdf).
    nombreArchivo: (p, idioma) => `${p.numero}${idioma === 'en' ? '_EN' : ''}.pdf`,
  },
}

export function getDocumentDefinition(tipo: string): DocumentDefinition | undefined {
  return DOCUMENT_REGISTRY[tipo]
}
