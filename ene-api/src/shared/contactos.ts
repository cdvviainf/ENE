import { Prisma } from '@prisma/client'

// RN-CLI-05 / RN-PRV-06 [BLOQUEA]: como máximo un contacto por dueño
// (Cliente/Proveedor) con esRepresentanteLegal=true. El service
// desmarca-y-crea dentro de una transacción, pero si el dueño no tiene
// ninguno marcado todavía ese UPDATE no bloquea ninguna fila — la garantía
// real contra la carrera es el índice único parcial de la migración
// `contactos_representante_legal_multiservicio`. Esto traduce esa violación
// a un CONFLICT legible en vez de dejar pasar el P2002 crudo como
// INTERNAL_ERROR. Mismo patrón que shared/direcciones.ts para RN-GEO-03.
export function esViolacionRepresentanteLegalUnico(err: unknown): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== 'P2002') return false
  return JSON.stringify(err.meta?.target ?? '').toLowerCase().includes('representante_legal')
}
