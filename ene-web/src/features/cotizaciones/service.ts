import { api } from '@/lib/api';
import type {
  Cotizacion,
  CotizacionListResponse,
  CotizacionCreateInput,
  CotizacionVersion,
  EstadoCotizacion,
  LineaInput,
  RecalcularPaxResponse,
  PreviewLineaInput,
  PreviewLineaResponse,
  IdiomaDocumento,
  ModalidadDocumento,
  ContenidoVersionInput
} from './types';

export const cotizacionesService = {
  async list(
    params: { page?: number; limit?: number; estado?: EstadoCotizacion; clienteId?: number; q?: string } = {}
  ): Promise<CotizacionListResponse> {
    const searchParams: Record<string, string> = {};
    if (params.page) searchParams.page = String(params.page);
    if (params.limit) searchParams.limit = String(params.limit);
    if (params.estado) searchParams.estado = params.estado;
    if (params.clienteId) searchParams.clienteId = String(params.clienteId);
    if (params.q) searchParams.q = params.q;
    return api.get('cotizaciones', { searchParams }).json();
  },

  async getById(id: number): Promise<Cotizacion> {
    return api.get(`cotizaciones/${id}`).json();
  },

  async create(data: CotizacionCreateInput): Promise<Cotizacion> {
    return api.post('cotizaciones', { json: data }).json();
  },

  // RN-VER-08: en BORRADOR el itinerario se escribe directo sobre la versión
  // vigente, junto con el contenido de encabezado (vigencia, comentarios, forma
  // de pago — RN-COT-09/10/COS-08).
  async guardarItinerario(id: number, lineas: LineaInput[], contenido?: ContenidoVersionInput): Promise<Cotizacion> {
    return api.put(`cotizaciones/${id}/itinerario`, { json: { lineas, ...(contenido ?? {}) } }).json();
  },

  // RN-VER-02: nueva versión de negociación tras el envío; motivo obligatorio.
  async nuevaVersion(id: number, data: { motivo: string; lineas: LineaInput[] } & ContenidoVersionInput): Promise<Cotizacion> {
    return api.post(`cotizaciones/${id}/versiones`, { json: data }).json();
  },

  async listVersiones(id: number): Promise<CotizacionVersion[]> {
    return api.get(`cotizaciones/${id}/versiones`).json();
  },

  async getVersion(id: number, version: number): Promise<CotizacionVersion> {
    return api.get(`cotizaciones/${id}/versiones/${version}`).json();
  },

  // RN-COS-07: preview del recálculo, no persiste.
  async recalcularPax(id: number, cantidadPax: number): Promise<RecalcularPaxResponse> {
    return api.post(`cotizaciones/${id}/recalcular-pax`, { json: { cantidadPax } }).json();
  },

  // Preview de costo/venta de una línea ESTANDAR, no persiste (RN-COS-06).
  async previewLinea(id: number, input: PreviewLineaInput): Promise<PreviewLineaResponse> {
    return api.post(`cotizaciones/${id}/preview-linea`, { json: input }).json();
  },

  // RN-COS-07: aplica el recálculo de forma transaccional (cabecera + líneas).
  // En BORRADOR escribe directo; tras el envío crea una versión (motivo obligatorio).
  async aplicarPax(id: number, cantidadPax: number, motivo?: string): Promise<Cotizacion> {
    return api.patch(`cotizaciones/${id}/cantidad-pax`, { json: { cantidadPax, ...(motivo ? { motivo } : {}) } }).json();
  },

  async cambiarEstado(id: number, estado: EstadoCotizacion): Promise<Cotizacion> {
    return api.patch(`cotizaciones/${id}/estado`, { json: { estado } }).json();
  },

  // RN-COT-04: valida y marca APROBADA (la OT se genera en la Etapa 8).
  async aprobar(id: number): Promise<Cotizacion> {
    return api.post(`cotizaciones/${id}/aprobar`).json();
  },

  // Descarga el PDF (blob) en el idioma y modalidad pedidos (RN-COT-06).
  async emitirPdf(tipo: 'cotizacion', documentoId: number, idioma: IdiomaDocumento, modalidad: ModalidadDocumento): Promise<Blob> {
    return api.post('documentos/emitir', { json: { tipo, documentoId, idioma, modalidad } }).blob();
  }
};

// URL del preview HTML para el iframe (GET directo, no fetch — el navegador
// manda las cookies de sesión al mismo origen /api).
export function previewUrl(documentoId: number, idioma: IdiomaDocumento, modalidad: ModalidadDocumento): string {
  const params = new URLSearchParams({ tipo: 'cotizacion', id: String(documentoId), idioma, modalidad });
  return `/api/documentos/preview?${params.toString()}`;
}
