import { conflicto, noEncontrado, validacion } from '../../../shared/errors.js'
import { guardarArchivo, leerArchivo, extensionDeMime } from '../../../shared/storage/archivos.js'
import * as repo from './empresa.repository.js'
import { MIME_LOGO_PERMITIDOS, type EmpresaUpdateInput } from './empresa.schema.js'

export async function obtenerEmpresa(actor = 'system') {
  return repo.ensureEmpresa(actor)
}

export async function actualizarEmpresa(input: EmpresaUpdateInput, actualizadoPor: string) {
  const empresa = await repo.ensureEmpresa(actualizadoPor)
  return repo.updateEmpresa(empresa.id, input, actualizadoPor)
}

export async function guardarLogo(buffer: Buffer, mimeType: string, actualizadoPor: string) {
  const ext = extensionDeMime(mimeType)
  if (!ext || !MIME_LOGO_PERMITIDOS.includes(mimeType.toLowerCase())) {
    throw validacion('Formato de logo no permitido (usa PNG, JPG, WEBP o SVG)')
  }
  if (buffer.length === 0) throw validacion('El archivo del logo está vacío')
  const empresa = await repo.ensureEmpresa(actualizadoPor)
  const storageKey = `empresa/logo-${empresa.id}.${ext}`
  await guardarArchivo(storageKey, buffer)
  return repo.updateLogo(empresa.id, storageKey, mimeType, actualizadoPor)
}

export async function obtenerLogo() {
  const empresa = await repo.findEmpresa()
  if (!empresa?.logoStorageKey || !empresa.logoMimeType) {
    throw noEncontrado('Logo de la empresa')
  }
  try {
    const buffer = await leerArchivo(empresa.logoStorageKey)
    return { buffer, mimeType: empresa.logoMimeType }
  } catch {
    throw conflicto('El archivo del logo no se encuentra en el almacenamiento')
  }
}
