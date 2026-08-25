import { z } from 'zod'

export const paginacionSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(20),
})

export type Paginacion = z.infer<typeof paginacionSchema>

export interface Pagina<T> {
  data: T[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

export function paginar<T>(data: T[], total: number, { page, limit }: Paginacion): Pagina<T> {
  return { data, meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } }
}

export const skipTake = ({ page, limit }: Paginacion) => ({ skip: (page - 1) * limit, take: limit })
