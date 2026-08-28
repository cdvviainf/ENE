import { z } from 'zod'

// Lista cerrada de entidades con prefijo configurado. COTIZACION/ORDEN_TRABAJO/
// ORDEN_COMPRA/CLIENTE/PROVEEDOR/GRUPO/SERVICIO se sembraron en Etapa 1 para el
// correlativo transaccional (RN-COR-01, con `ultimoValor` + advisory lock — se
// implementa recién en la etapa de cada módulo). PERFIL/USUARIO se suman acá:
// son códigos legibles curados a mano, el "siguiente código" es solo una
// sugerencia editable (RN-PER-07), nunca toca `ultimoValor` ni pide lock.
export const ENTIDADES_PREFIJO = [
  'COTIZACION',
  'ORDEN_TRABAJO',
  'ORDEN_COMPRA',
  'CLIENTE',
  'PROVEEDOR',
  'GRUPO',
  'SERVICIO',
  'PERFIL',
  'USUARIO',
] as const

// Entidades cuyo "siguiente código" ya se resuelve como sugerencia en vivo
// (§ arriba). El resto no tiene consumidor todavía.
export const ENTIDADES_SUGERENCIA_VIVA = ['PERFIL', 'USUARIO'] as const
export type EntidadSugerenciaViva = (typeof ENTIDADES_SUGERENCIA_VIVA)[number]

export const prefijoCodigoCreateSchema = z.object({
  entidad: z.enum(ENTIDADES_PREFIJO),
  prefijo: z.string().min(1, 'El prefijo es requerido').max(10).trim(),
  digitos: z.number().int().min(1).max(10).default(4),
  incluyeAnio: z.boolean().default(false),
})

export const prefijoCodigoUpdateSchema = z.object({
  prefijo: z.string().min(1).max(10).trim().optional(),
  digitos: z.number().int().min(1).max(10).optional(),
  incluyeAnio: z.boolean().optional(),
})

export const prefijoCodigoIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const prefijoCodigoEntidadParamSchema = z.object({
  entidad: z.enum(ENTIDADES_SUGERENCIA_VIVA),
})

export type PrefijoCodigoCreateInput = z.infer<typeof prefijoCodigoCreateSchema>
export type PrefijoCodigoUpdateInput = z.infer<typeof prefijoCodigoUpdateSchema>
