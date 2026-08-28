import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'

/**
 * Ids de `tabla` donde alguno de `campos` matchea `q`, insensible a
 * mayúsculas y acentos (RN-MAN-06, RN-PRV-02) vía la extensión `unaccent` de
 * Postgres. Pensado para combinar el resultado con `where: { id: { in } }` en
 * un `findMany` tipado normal, junto al resto de los filtros (soft delete,
 * `tipoServicioId`, etc.) — esta función solo resuelve el texto libre.
 *
 * `tabla` y `campos` son siempre literales fijados en el código de cada
 * repository, nunca input de usuario: se insertan como identificadores
 * crudos. Solo `q` viaja parametrizado. No llamar con `q` vacío.
 */
export async function idsPorTexto(tabla: string, campos: string[], q: string): Promise<number[]> {
  const patron = `%${q}%`
  const condiciones = Prisma.join(
    campos.map(
      (campo) => Prisma.sql`unaccent(lower(${Prisma.raw(`"${campo}"`)})) LIKE unaccent(lower(${patron}))`,
    ),
    ' OR ',
  )
  const filas = await prisma.$queryRaw<{ id: number }[]>(
    Prisma.sql`SELECT "id" FROM ${Prisma.raw(`"${tabla}"`)} WHERE ${condiciones}`,
  )
  return filas.map((f) => f.id)
}
