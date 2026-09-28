import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { noEncontrado, validacion } from '../../shared/errors.js'
import { renderPdf } from '../../shared/pdf/render.js'
import { getDocumentDefinition } from './documentos.registry.js'
import type { DocumentDefinition, OpcionesDocumento } from './documentos.types.js'

// Motor de documentos — CLAUDE.md §8. El preview es el mismo HTML que se
// fotografía para el PDF. La emisión con snapshot idempotente y control de
// copia (marca COPIA, tabla DocumentoEmitido) se difiere a una etapa posterior:
// acá el PDF se genera bajo demanda con el idioma y la modalidad pedidos.

function getDefinicionOFallar(tipo: string): DocumentDefinition {
  const def = getDocumentDefinition(tipo)
  if (!def) throw noEncontrado('Tipo de documento', tipo)
  return def
}

async function resolverYValidar(tipo: string, id: number, opciones: OpcionesDocumento) {
  const def = getDefinicionOFallar(tipo)
  const payload = await def.resolver(id, opciones)
  const parsed = def.schema.safeParse(payload)
  if (!parsed.success) {
    // No debería pasar en producción: el resolver arma el shape del schema. Si
    // pasa, es un desalineamiento resolver↔schema a corregir en código.
    throw validacion('El payload resuelto no cumple el schema del documento', { issues: parsed.error.issues })
  }
  return { def, payload: parsed.data }
}

function armarHtml(def: DocumentDefinition, payload: unknown, opciones: OpcionesDocumento, marcaAgua?: 'BORRADOR'): string {
  const Plantilla = def.plantillas[def.plantillaActual]
  if (!Plantilla) throw noEncontrado('Versión de plantilla', def.plantillaActual)
  const markup = renderToStaticMarkup(createElement(Plantilla, { d: payload, opciones, marcaAgua }))
  return `<!DOCTYPE html>${markup}`
}

/** HTML del documento para previsualizar en un iframe. Lleva marca BORRADOR:
 * nada generado por esta vía es un documento oficial. */
export async function obtenerPreviewHtml(tipo: string, id: number, opciones: OpcionesDocumento): Promise<string> {
  const { def, payload } = await resolverYValidar(tipo, id, opciones)
  return armarHtml(def, payload, opciones, 'BORRADOR')
}

/** PDF del documento bajo demanda, en el idioma y modalidad pedidos. El nombre
 * de archivo incorpora el idioma (RN-COT-06). */
export async function obtenerPdf(
  tipo: string,
  id: number,
  opciones: OpcionesDocumento,
): Promise<{ buffer: Buffer; nombreArchivo: string }> {
  const { def, payload } = await resolverYValidar(tipo, id, opciones)
  const html = armarHtml(def, payload, opciones)
  const buffer = await renderPdf(html, def.pagina)
  return { buffer, nombreArchivo: def.nombreArchivo(payload, opciones.idioma) }
}
