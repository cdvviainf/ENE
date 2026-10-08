import type { ReactElement } from 'react'
import type { ZodType } from 'zod'

// ============================================================================
// Motor de documentos — portado de FAS (CLAUDE.md §8) y extendido con idioma y
// modalidad, lo único genuinamente nuevo. ENE es una sola empresa: el resolver
// NO recibe empresaId (a diferencia de FAS). El snapshot de emisión idempotente
// y el control de copia con marca de agua se difieren (no hay tabla
// DocumentoEmitido en esta etapa); el preview y el PDF bajo demanda cubren el
// criterio de término de la Etapa 7.
// ============================================================================

export type IdiomaDocumento = 'es' | 'en'

/** RN-COT-06/12: el documento al cliente se emite en tres modalidades. `total`
 * muestra solo el gran total; `desglosado` muestra la venta por ítem;
 * `desglosado_pax` muestra servicio, valor por pasajero, pasajeros y total por
 * ítem. Ninguna muestra costo ni margen (RN-COT-07). La modalidad se elige al
 * generar, sin rehacer el costeo. */
export type ModalidadDocumento = 'total' | 'desglosado' | 'desglosado_pax'

export interface OpcionesDocumento {
  idioma: IdiomaDocumento
  modalidad: ModalidadDocumento
}

export interface OpcionesPaginaDocumento {
  formato: 'A4' | 'Letter'
  orientacion: 'portrait' | 'landscape'
  margen: string
}

export interface PropsPlantilla<Payload> {
  d: Payload
  opciones: OpcionesDocumento
  marcaAgua?: 'BORRADOR'
}

/** Un documento del catálogo (CLAUDE.md §8 "Registro central"). `Payload` es el
 * dato ya resuelto y validado con Zod: el mismo tipo que recibe la plantilla,
 * así el compilador avisa si resolver y plantilla se desalinean del schema. */
export interface DocumentDefinition<Payload = unknown> {
  titulo: string
  resolver: (id: number, opciones: OpcionesDocumento) => Promise<Payload>
  schema: ZodType<Payload>
  plantillaActual: string
  plantillas: Record<string, (props: PropsPlantilla<Payload>) => ReactElement>
  pagina: OpcionesPaginaDocumento
  // Ítem de menú cuyo nivel LECTURA habilita preview/descarga. Un array es
  // "cualquiera de estos" (any-of).
  itemMenu: string | string[]
  // El nombre de archivo incorpora el idioma (COT-2026-0142_EN.pdf).
  nombreArchivo: (payload: Payload, idioma: IdiomaDocumento) => string
}

// `any` a propósito: el registro es heterogéneo — cada entrada tiene su propio
// Payload concreto, chequeado en su resolver + schema + plantilla.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DocumentRegistry = Record<string, DocumentDefinition<any>>
