import type { IdiomaDocumento } from '../../documentos.types.js'

// Textos fijos de la plantilla de cotización (CLAUDE.md §8). Los textos de
// dominio (nombres de servicios, zonas, comentarios, observaciones) NO viven
// acá: vienen del dato, resueltos en el resolver según el idioma. Acá solo
// rótulos de la plantilla.

interface TextosCotizacion {
  titulo: string
  cotizacion: string
  version: string
  cliente: string
  ejecutivo: string
  negocio: string
  fechaOperacion: string
  fechaCotizacion: string
  vigencia: string
  pasajeros: string
  zona: string
  dia: string
  am: string
  pm: string
  servicio: string
  valor: string
  valorPorPax: string
  pax: string
  total: string
  recargo: string
  totalConRecargo: string
  incluidos: string
  noIncluidos: string
  notasImportantes: string
  areaReceptivo: string
  areaEventos: string
  sinServicios: string
}

const es: TextosCotizacion = {
  titulo: 'Cotización',
  cotizacion: 'Cotización N°',
  version: 'Versión',
  cliente: 'Cliente',
  ejecutivo: 'Ejecutivo',
  negocio: 'Negocio',
  fechaOperacion: 'Fecha de operación',
  fechaCotizacion: 'Fecha de cotización',
  vigencia: 'Válida hasta',
  pasajeros: 'Pasajeros',
  zona: 'Zonas',
  dia: 'Día',
  am: 'Mañana',
  pm: 'Tarde',
  servicio: 'Servicio',
  valor: 'Valor',
  valorPorPax: 'Valor por pasajero',
  pax: 'Pasajeros',
  total: 'Total',
  recargo: 'Recargo forma de pago',
  totalConRecargo: 'Total con recargo',
  incluidos: 'Servicios incluidos',
  noIncluidos: 'Servicios no incluidos',
  notasImportantes: 'Notas importantes',
  areaReceptivo: 'Turismo receptivo',
  areaEventos: 'Eventos corporativos',
  sinServicios: 'Sin servicios',
}

const en: TextosCotizacion = {
  titulo: 'Quotation',
  cotizacion: 'Quotation No.',
  version: 'Version',
  cliente: 'Client',
  ejecutivo: 'Account manager',
  negocio: 'Group',
  fechaOperacion: 'Operation date',
  fechaCotizacion: 'Quotation date',
  vigencia: 'Valid until',
  pasajeros: 'Passengers',
  zona: 'Areas',
  dia: 'Day',
  am: 'Morning',
  pm: 'Afternoon',
  servicio: 'Service',
  valor: 'Amount',
  valorPorPax: 'Price per passenger',
  pax: 'Passengers',
  total: 'Total',
  recargo: 'Payment method surcharge',
  totalConRecargo: 'Total with surcharge',
  incluidos: 'Included services',
  noIncluidos: 'Not included',
  notasImportantes: 'Important notes',
  areaReceptivo: 'Inbound tourism',
  areaEventos: 'Corporate events',
  sinServicios: 'No services',
}

export function textos(idioma: IdiomaDocumento): TextosCotizacion {
  return idioma === 'en' ? en : es
}
