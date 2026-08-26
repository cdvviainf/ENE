// Adaptadores concretos del mecanismo de versionado (RN-VER-01). Las etapas 7,
// 8 y 9 importan estos objetos; no reimplementan el versionado.
export { cotizacionVersionable, type DatosCotizacionVersion } from './cotizacion.js'
export { ordenTrabajoVersionable, type DatosOTVersion } from './ordenTrabajo.js'
export { ordenCompraVersionable, type DatosOCVersion } from './ordenCompra.js'
