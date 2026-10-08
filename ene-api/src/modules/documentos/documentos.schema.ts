import { z } from 'zod'

const idiomaEnum = z.enum(['es', 'en'])
const modalidadEnum = z.enum(['total', 'desglosado', 'desglosado_pax'])

// GET /api/documentos/preview?tipo=cotizacion&id=&idioma=es&modalidad=total
export const previewQuerySchema = z.object({
  tipo: z.string().min(1),
  id: z.coerce.number().int().positive(),
  idioma: idiomaEnum.default('es'),
  modalidad: modalidadEnum.default('total'),
})

// POST /api/documentos/emitir { tipo, documentoId, idioma, modalidad }
export const emitirBodySchema = z.object({
  tipo: z.string().min(1),
  documentoId: z.coerce.number().int().positive(),
  idioma: idiomaEnum.default('es'),
  modalidad: modalidadEnum.default('total'),
})
