import { z } from 'zod'

// RN-PRV-11: tipo de documento que un proveedor emite a ENE. Mantenedor que
// reemplaza el enum TipoDocProveedor. `formaCalculo` + `porcentaje` dan la
// retención/IVA referencial interna (no afecta el presupuesto). Código manual.
export const formaCalculoEnum = z.enum(['NINGUNO', 'IVA', 'RETENCION'])

export const tipoDocumentoCreateSchema = z.object({
  codigo: z
    .string()
    .min(1, 'El código es requerido')
    .max(40)
    .trim()
    .toUpperCase()
    .regex(/^\S+$/, 'El código no puede tener espacios'),
  nombre: z.string().min(1, 'El nombre es requerido').max(80).trim(),
  formaCalculo: formaCalculoEnum.default('NINGUNO'),
  // Entre 0 y 1 (0.19 = 19% IVA, 0.1475 = 14,75% retención). Máx 4 decimales.
  // coerce: la carga masiva transporta Decimal como string.
  porcentaje: z.coerce.number().min(0, 'No puede ser negativo').max(1, 'No puede superar 100%').default(0),
})

export const tipoDocumentoUpdateSchema = tipoDocumentoCreateSchema.partial()

export const tipoDocumentoIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const tipoDocumentoListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
  q: z.string().optional(),
})

export type TipoDocumentoCreateInput = z.infer<typeof tipoDocumentoCreateSchema>
export type TipoDocumentoUpdateInput = z.infer<typeof tipoDocumentoUpdateSchema>
