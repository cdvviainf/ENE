import type { IdiomaDocumento } from '../../documentos.types.js'

// Textos fijos de la plantilla de cotización (CLAUDE.md §8). Los textos de
// dominio (nombres de servicios, zona) NO viven acá: vienen del dato
// (Servicio.nombre/nombreEn, Zona.nombre/nombreEn), resueltos en el resolver
// según el idioma. Acá solo lo que es rótulo de la plantilla.

interface TextosCotizacion {
  titulo: string
  cotizacion: string
  cliente: string
  grupo: string
  fechaOperacion: string
  pasajeros: string
  zona: string
  dia: string
  am: string
  pm: string
  servicio: string
  valor: string
  total: string
  areaReceptivo: string
  areaEventos: string
  sinServicios: string
  emitido: string
}

const es: TextosCotizacion = {
  titulo: 'Cotización',
  cotizacion: 'Cotización N°',
  cliente: 'Cliente',
  grupo: 'Grupo',
  fechaOperacion: 'Fecha de operación',
  pasajeros: 'Pasajeros',
  zona: 'Zona',
  dia: 'Día',
  am: 'Mañana',
  pm: 'Tarde',
  servicio: 'Servicio',
  valor: 'Valor',
  total: 'Total',
  areaReceptivo: 'Turismo receptivo',
  areaEventos: 'Eventos corporativos',
  sinServicios: 'Sin servicios',
  emitido: 'Documento emitido el',
}

const en: TextosCotizacion = {
  titulo: 'Quotation',
  cotizacion: 'Quotation No.',
  cliente: 'Client',
  grupo: 'Group',
  fechaOperacion: 'Operation date',
  pasajeros: 'Passengers',
  zona: 'Area',
  dia: 'Day',
  am: 'Morning',
  pm: 'Afternoon',
  servicio: 'Service',
  valor: 'Amount',
  total: 'Total',
  areaReceptivo: 'Inbound tourism',
  areaEventos: 'Corporate events',
  sinServicios: 'No services',
  emitido: 'Document issued on',
}

export function textos(idioma: IdiomaDocumento): TextosCotizacion {
  return idioma === 'en' ? en : es
}
