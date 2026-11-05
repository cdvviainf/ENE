import { findEmpresa } from '../../config/empresa/empresa.repository.js'
import { leerComoDataUri } from '../../../shared/storage/archivos.js'
import type { EmisorPdf } from '../schemas/emisor.schema.js'

const NOMBRE_POR_DEFECTO = 'Extremo Norte Expediciones'

/** Datos de la empresa emisora para la cabecera de cualquier PDF (RN-EMP-01).
 * Compartido por todos los resolvers del catálogo: el logo es dinámico — sale
 * del mantenedor Datos de empresa (`/config/empresa`) en cada emisión, sin
 * tocar plantillas. Se incrusta como data URI (el render no tiene red). Si la
 * empresa no está sembrada o el archivo del logo no se encuentra, el documento
 * sale igual, sin logo: la cabecera nunca bloquea una emisión. */
export async function resolverEmisor(): Promise<EmisorPdf> {
  const empresa = await findEmpresa()
  if (!empresa) {
    return { nombre: NOMBRE_POR_DEFECTO, rut: null, direccion: null, email: null, web: null, telefono: null, logoDataUri: null }
  }
  let logoDataUri: string | null = null
  if (empresa.logoStorageKey && empresa.logoMimeType) {
    try {
      logoDataUri = await leerComoDataUri(empresa.logoStorageKey, empresa.logoMimeType)
    } catch {
      logoDataUri = null
    }
  }
  return {
    nombre: empresa.nombre,
    rut: empresa.rut,
    direccion: empresa.direccion,
    email: empresa.email,
    web: empresa.web,
    telefono: empresa.telefono,
    logoDataUri,
  }
}
