import type { EstadoOT } from '@prisma/client'

/** Filtros de listado de OT (RN-OT-03: búsqueda por apellido sin número). */
export interface FiltrosOrdenTrabajo {
  estado?: EstadoOT
  desde?: Date
  hasta?: Date
  q?: string
}
