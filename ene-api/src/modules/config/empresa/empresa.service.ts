import { noEncontrado, validacion } from '../../../shared/errors.js'
import * as repo from './empresa.repository.js'
import { LOGO_MAX_BYTES, detectarMimeLogo, type EmpresaUpdateInput } from './empresa.schema.js'

// RN-EMP-01: datos de la empresa emisora (singleton) y su logo, administrados
// desde Configuración general. La respuesta nunca incluye el binario del logo:
// solo `logo: { mime, subidoEn, subidoPor } | null`.

async function conMetaLogo(id: number) {
  const empresa = await repo.findEmpresaConMetaLogo(id)
  if (!empresa) throw noEncontrado('Empresa', id)
  return empresa
}

export async function obtenerEmpresa(actor = 'system') {
  const empresa = await repo.ensureEmpresa(actor)
  return conMetaLogo(empresa.id)
}

export async function actualizarEmpresa(input: EmpresaUpdateInput, actualizadoPor: string) {
  const empresa = await repo.ensureEmpresa(actualizadoPor)
  await repo.updateEmpresa(empresa.id, input, actualizadoPor)
  return conMetaLogo(empresa.id)
}

export async function guardarLogo(buffer: Buffer, subidoPor: string) {
  if (buffer.length === 0) throw validacion('El archivo del logo está vacío')
  // Se incrusta en base64 en cada PDF: se acota bastante por debajo del límite
  // general de adjuntos.
  if (buffer.length > LOGO_MAX_BYTES) {
    throw validacion(`El logo no puede superar ${LOGO_MAX_BYTES / (1024 * 1024)} MB`)
  }
  // El formato se determina por los bytes (QA-CFG-004); el MIME guardado es el
  // detectado, nunca el declarado por el cliente.
  const mime = detectarMimeLogo(buffer)
  if (!mime) throw validacion('Formato de logo no permitido: usa una imagen PNG, JPG o WEBP')
  const empresa = await repo.ensureEmpresa(subidoPor)
  await repo.upsertLogo(empresa.id, mime, buffer, subidoPor)
  return conMetaLogo(empresa.id)
}

export async function eliminarLogo(actor: string) {
  const empresa = await repo.ensureEmpresa(actor)
  await repo.deleteLogo(empresa.id)
  return conMetaLogo(empresa.id)
}

/** Binario del logo, o `null` si no hay. Lo usan GET /empresa/logo y el
 * resolver de cabecera de los PDF. */
export async function leerLogo(): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const empresa = await repo.findEmpresa()
  if (!empresa) return null
  const logo = await repo.findLogo(empresa.id)
  return logo ? { buffer: Buffer.from(logo.datos), mimeType: logo.mime } : null
}

export async function obtenerLogo() {
  const logo = await leerLogo()
  if (!logo) throw noEncontrado('Logo de la empresa')
  return logo
}
