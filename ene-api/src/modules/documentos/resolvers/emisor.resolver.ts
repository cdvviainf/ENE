import { findEmpresa } from '../../config/empresa/empresa.repository.js'
import { leerLogo } from '../../config/empresa/empresa.service.js'
import type { EmisorPdf } from '../schemas/emisor.schema.js'

const NOMBRE_POR_DEFECTO = 'Extremo Norte Expediciones'

/** Datos de la empresa emisora para la cabecera de cualquier PDF (RN-EMP-01).
 * Compartido por todos los resolvers del catálogo: el logo es dinámico — sale
 * de Configuración general > Logo (`/config/general`) en cada emisión, sin
 * tocar plantillas. Se incrusta como data URI (el render no tiene red). Si la
 * empresa no está sembrada o no tiene logo cargado, el documento sale igual,
 * sin logo: la cabecera nunca bloquea una emisión. */
export async function resolverEmisor(): Promise<EmisorPdf> {
  const empresa = await findEmpresa()
  if (!empresa) {
    return { nombre: NOMBRE_POR_DEFECTO, rut: null, direccion: null, email: null, web: null, telefono: null, logoDataUri: null }
  }
  // El logo vive en la BD (EmpresaLogo); se incrusta como data URI.
  const logo = await leerLogo()
  const logoDataUri = logo ? `data:${logo.mimeType};base64,${logo.buffer.toString('base64')}` : null
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
