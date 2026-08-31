import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { validacion } from './errors.js'

// RN-GEO-02 [BLOQUEA]: comunaId es obligatorio cuando el país elegido es
// Chile (Pais.esPaisNacional). Compartido entre ClienteDireccion y
// ProveedorDireccion — misma regla, dos subrecursos distintos.
export async function validarComunaRequerida(paisId: number, comunaId?: number) {
  const pais = await prisma.pais.findUnique({ where: { id: paisId } })
  if (pais?.esPaisNacional && !comunaId) {
    throw validacion('La comuna es requerida cuando el país es Chile (RN-GEO-02)')
  }
}

// RN-GEO-03 [BLOQUEA]: como máximo una dirección default por dueño. El
// service desmarca-y-crea dentro de una transacción, pero si el dueño no
// tiene ninguna default todavía ese UPDATE no bloquea ninguna fila — la
// garantía real contra la carrera es el índice único parcial de la migración
// `direccion_default_unico_parcial`. Esto traduce esa violación a un
// CONFLICT legible en vez de dejar pasar el P2002 crudo como INTERNAL_ERROR.
export function esViolacionDireccionDefaultUnica(err: unknown): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== 'P2002') return false
  return JSON.stringify(err.meta?.target ?? '').toLowerCase().includes('default')
}
