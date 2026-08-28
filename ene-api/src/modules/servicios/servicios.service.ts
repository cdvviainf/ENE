import { prisma } from '../../lib/prisma.js'
import { noEncontrado, conflicto } from '../../shared/errors.js'
import { resolverCodigo } from '../../shared/correlativos.js'
import { operacionesAbiertas, hayOperacionesAbiertas, errorSoftDeleteBloqueado } from '../../shared/operaciones-abiertas.js'
import * as repo from './servicios.repository.js'
import type { ServicioCreateInput, ServicioUpdateInput } from './servicios.schema.js'

// RN-MAN-08 [ADVIERTE]: guardar sin nombreEn se permite, pero el listado lo marca.
function conAdvertencia<T extends { nombreEn: string | null }>(servicio: T) {
  return { ...servicio, advertenciaSinTraduccion: !servicio.nombreEn }
}

export async function listarServicios(
  page: number,
  limit: number,
  filtros: {
    q?: string
    zonaId?: number
    tipoServicioId?: number
    modeloTarifa?: 'TRAMO_PAX' | 'ACOMODACION' | 'UNITARIO_PAX'
  },
) {
  const { data, total } = await repo.findAllServicios(page, limit, filtros)
  return {
    data: data.map(conAdvertencia),
    meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
  }
}

export async function obtenerServicio(id: number) {
  const servicio = await repo.findServicioById(id)
  if (!servicio) throw noEncontrado('Servicio', id)
  return conAdvertencia(servicio)
}

// RN-MAN-05: se puede consultar un servicio eliminado, pero no volver a mutarlo.
async function obtenerServicioVigente(id: number) {
  const servicio = await obtenerServicio(id)
  if (servicio.eliminadoEn) throw conflicto('El servicio fue eliminado y no admite cambios')
  return servicio
}

export async function crearServicio(input: ServicioCreateInput, creadoPor: string) {
  return prisma.$transaction(async (tx) => {
    const codigo = await resolverCodigo(tx, 'SERVICIO', input.codigo)
    if (await repo.findServicioByCodigo(codigo, undefined, tx)) {
      throw conflicto(`Ya existe un servicio con el código "${codigo}"`)
    }
    return repo.createServicio(tx, { ...input, codigo }, creadoPor)
  })
}

export async function actualizarServicio(id: number, input: ServicioUpdateInput, actualizadoPor: string) {
  const servicio = await obtenerServicioVigente(id)

  // RN-SRV-02 [BLOQUEA]: no se puede cambiar el modeloTarifa de un servicio
  // que ya tiene tarifarios cargados — dejaría los valores existentes sin
  // interpretación válida. Cuenta cualquier tarifario, activo o no: la regla
  // no da excepción por estado.
  if (input.modeloTarifa && input.modeloTarifa !== servicio.modeloTarifa) {
    const tarifarios = await repo.contarTarifarios(id)
    if (tarifarios > 0) {
      throw conflicto(
        `No se puede cambiar el modelo de tarifa: el servicio tiene ${tarifarios} tarifario(s) cargado(s) (RN-SRV-02)`,
      )
    }
  }

  return repo.updateServicio(id, input, actualizadoPor)
}

export async function eliminarServicio(id: number, eliminadoPor: string) {
  await obtenerServicioVigente(id)
  const referencias = await operacionesAbiertas({ servicioId: id })
  if (hayOperacionesAbiertas(referencias)) throw errorSoftDeleteBloqueado('el servicio', referencias)
  await repo.softDeleteServicio(id, eliminadoPor)
}
