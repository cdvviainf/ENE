import { api } from '@/lib/api';
import type {
  Adjunto,
  CrearOrdenDirectaInput,
  EstadoOT,
  EstadoServicio,
  NuevaVersionInput,
  OrdenTrabajo,
  OrdenTrabajoListResponse,
  OrdenTrabajoVersion,
  PreviewCostoInput,
  PreviewCostoResponse
} from './types';

export const ordenesTrabajoService = {
  async list(
    params: { page?: number; limit?: number; estado?: EstadoOT; desde?: string; hasta?: string; q?: string } = {}
  ): Promise<OrdenTrabajoListResponse> {
    const searchParams: Record<string, string> = {};
    if (params.page) searchParams.page = String(params.page);
    if (params.limit) searchParams.limit = String(params.limit);
    if (params.estado) searchParams.estado = params.estado;
    if (params.desde) searchParams.desde = params.desde;
    if (params.hasta) searchParams.hasta = params.hasta;
    if (params.q) searchParams.q = params.q;
    return api.get('ordenes-trabajo', { searchParams }).json();
  },

  async getById(id: number): Promise<OrdenTrabajo> {
    return api.get(`ordenes-trabajo/${id}`).json();
  },

  // RN-VER-09: una versión histórica tal como quedó guardada (líneas + evidencia).
  async getVersion(id: number, version: number): Promise<OrdenTrabajoVersion> {
    return api.get(`ordenes-trabajo/${id}/versiones/${version}`).json();
  },

  // RN-OT-04: transición del ciclo de vida de la OT (requiere nivel TOTAL).
  async cambiarEstado(id: number, estado: EstadoOT): Promise<OrdenTrabajo> {
    return api.patch(`ordenes-trabajo/${id}/estado`, { json: { estado } }).json();
  },

  // Estado operativo de una línea de la versión vigente (requiere nivel TOTAL).
  async cambiarEstadoServicio(id: number, lineaId: number, estadoServicio: EstadoServicio): Promise<OrdenTrabajo> {
    return api
      .patch(`ordenes-trabajo/${id}/lineas/${lineaId}/estado-servicio`, { json: { estadoServicio } })
      .json();
  },

  // RN-VER-02/10: nueva versión de la OT (requiere nivel TOTAL).
  async crearVersion(id: number, data: NuevaVersionInput): Promise<OrdenTrabajo> {
    return api.post(`ordenes-trabajo/${id}/versiones`, { json: data }).json();
  },

  // RN-OT-01 (enmendada): crea una OT directa, sin cotización (requiere TOTAL).
  async crearDirecta(data: CrearOrdenDirectaInput): Promise<OrdenTrabajo> {
    return api.post('ordenes-trabajo', { json: data }).json();
  },

  // Costo del tarifario vigente para una línea ESTANDAR (ayuda de captura).
  async previewCosto(data: PreviewCostoInput): Promise<PreviewCostoResponse> {
    return api.post('ordenes-trabajo/preview-costo', { json: data }).json();
  }
};

// ── Adjuntos (entidad ORDEN_TRABAJO, permiso dinámico por la entidad dueña) ───
export const adjuntosService = {
  async list(ordenTrabajoId: number): Promise<Adjunto[]> {
    return api
      .get('adjuntos', { searchParams: { entidad: 'ORDEN_TRABAJO', entidadId: String(ordenTrabajoId) } })
      .json();
  },

  // Contrato multipart del backend (adjuntos.controller.ts): `entidad` y
  // `entidadId` van ANTES del archivo para quedar disponibles en data.fields al
  // llegar al stream del archivo; el archivo va de último (campo `archivo`).
  async subir(ordenTrabajoId: number, archivo: File): Promise<Adjunto> {
    const form = new FormData();
    form.append('entidad', 'ORDEN_TRABAJO');
    form.append('entidadId', String(ordenTrabajoId));
    form.append('archivo', archivo, archivo.name);
    return api.post('adjuntos', { body: form }).json();
  },

  async eliminar(id: number): Promise<void> {
    await api.delete(`adjuntos/${id}`);
  }
};

// Dispara la descarga binaria de un adjunto en el navegador (GET con cookies de
// sesión al mismo origen /api). Abre la URL directa — el backend manda
// Content-Disposition: attachment con el nombre del archivo.
export function descargarAdjuntoUrl(id: number): string {
  return `/api/adjuntos/${id}/descargar`;
}
