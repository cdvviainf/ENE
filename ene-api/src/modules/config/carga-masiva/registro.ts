import type { HojaSpec } from '../../../shared/carga-masiva/tipos.js'

// ─── Registro de maestros para Carga Masiva (ENE) ────────────────────────────
//
// Única fuente de verdad de la Carga Masiva: describe cada hoja, sus columnas,
// tipos, obligatoriedad, FKs y qué códigos se autogeneran. Alimenta el
// generador del template y el cargador (`carga-masiva.service.ts`).
//
// Alcance (decisión de usuario, 2026-09-17, amplía RN-CAR-02): réplica
// completa del motor de FAS para los maestros de negocio de ENE. Quedan
// FUERA: Grupo/Pasajero (RN-CAR-01: "los grupos no se precargan, nacen de la
// operación") y Tarifario/TarifarioValor (su CRUD de Etapa 5 todavía no
// existe en `ene-api`; se agrega en una iteración posterior).
//
// Convención de autogeneración: solo Cliente, Proveedor y Servicio tienen
// correlativo real (`shared/correlativos.ts`) — su columna "Código" es
// OPCIONAL, y si viene vacía el cargador la autogenera. Zona, TipoServicio,
// FormaPago, CondicionPago y Pais usan código MANUAL (Docs/mantenedores.md
// §1/§2, RN-PAG-01, RN-GEO-01): su columna "Código" es obligatoria.
//
// Convención de `externo: true`: se usa en toda FK que puede resolver contra
// un registro que YA EXISTE en la base (sembrado o cargado en una corrida
// anterior), no solo contra uno creado en esta misma hoja del mismo archivo.
// Esto evita falsos "código no encontrado" en la validación estructural
// cuando el cliente referencia un código que ya existía de antes (ej. una de
// las 6 zonas sembradas) sin retipearlo en la hoja Zonas de este archivo. La
// contrapartida (igual que en FAS) es que esas FK no se validan en dry-run
// contra la base — solo al commit.

export const ENUM_TIPO_CLIENTE = ['AGENCIA', 'EMPRESA']
export const ENUM_MONEDA = ['CLP', 'USD']
export const ENUM_TIPO_DOC_PROVEEDOR = ['FACTURA_AFECTA', 'FACTURA_EXENTA', 'BOLETA_HONORARIOS']
export const ENUM_MODELO_TARIFA = ['TRAMO_PAX', 'ACOMODACION', 'UNITARIO_PAX']

// Columnas comunes reutilizadas.
const COL_NOMBRE = { encabezado: 'Nombre', campo: 'nombre', tipo: 'texto' as const, requerido: true }
const COL_EMAIL = { encabezado: 'Email', campo: 'email', tipo: 'texto' as const, ayuda: 'Formato de correo válido si viene.' }
const COL_TELEFONO = { encabezado: 'Teléfono', campo: 'telefono', tipo: 'texto' as const }
const COL_CARGO = { encabezado: 'Cargo', campo: 'cargo', tipo: 'texto' as const }
const COL_DESCRIPCION_LIBRE = { encabezado: 'Descripción', campo: 'descripcion', tipo: 'textoLargo' as const }
const COL_ES_REP_LEGAL = {
  encabezado: 'Es Representante Legal (SI/NO)',
  campo: 'esRepresentanteLegal',
  tipo: 'booleanSiNo' as const,
  ayuda: 'Como máximo uno por dueño — si marcas más de uno en el archivo, solo el último procesado queda marcado.',
}

export const REGISTRO_MAESTROS: HojaSpec[] = [
  // ─── Catálogos base (código manual) ─────────────────────────────────────
  {
    hoja: 'Zonas',
    modelo: 'zona',
    titulo: 'Zonas',
    descripcion: 'Territorios de operación. Ya vienen sembradas 6 zonas — usa esta hoja solo para agregar zonas nuevas.',
    dependeDe: [],
    columnas: [
      { encabezado: 'Código', campo: 'codigo', tipo: 'texto', requerido: true, ayuda: 'Manual, sin espacios. Ej. SPA.' },
      COL_NOMBRE,
      { encabezado: 'Nombre (inglés)', campo: 'nombreEn', tipo: 'texto' },
    ],
  },
  {
    hoja: 'TiposServicio',
    modelo: 'tipoServicio',
    titulo: 'Tipos de Servicio',
    descripcion: 'Clasificación de servicios y su modelo de tarifa por defecto. Ya vienen sembrados 6 tipos — usa esta hoja solo para agregar nuevos.',
    dependeDe: [],
    columnas: [
      { encabezado: 'Código', campo: 'codigo', tipo: 'texto', requerido: true, ayuda: 'Manual, sin espacios. Ej. ALOJAMIENTO.' },
      COL_NOMBRE,
      { encabezado: 'Modelo de Tarifa por Defecto', campo: 'modeloTarifaDefault', tipo: 'enum', requerido: true, enumValores: ENUM_MODELO_TARIFA },
      { encabezado: 'Ventana de Aviso (días)', campo: 'ventanaAvisoDias', tipo: 'entero', requerido: true, ayuda: 'Entre 1 y 365. Alimenta el radar de operaciones.' },
    ],
  },
  {
    hoja: 'FormasPago',
    modelo: 'formaPago',
    titulo: 'Formas de Pago',
    descripcion: 'Catálogo único compartido entre Clientes y Proveedores (RN-PAG-01).',
    dependeDe: [],
    columnas: [
      { encabezado: 'Código', campo: 'codigo', tipo: 'texto', requerido: true, ayuda: 'Manual, sin espacios.' },
      COL_NOMBRE,
    ],
  },
  {
    hoja: 'CondicionesPago',
    modelo: 'condicionPago',
    titulo: 'Condiciones de Pago',
    descripcion: 'Catálogo único compartido entre Clientes y Proveedores (RN-PAG-01). El cronograma de cuotas se completa en la hoja "CondicionesPagoCuotas".',
    dependeDe: [],
    columnas: [
      { encabezado: 'Código', campo: 'codigo', tipo: 'texto', requerido: true, ayuda: 'Manual, sin espacios.' },
      COL_NOMBRE,
    ],
  },
  {
    hoja: 'CondicionesPagoCuotas',
    titulo: 'Cuotas de Condición de Pago',
    descripcion: 'Cronograma de cuotas de cada Condición de Pago. Las cuotas de una misma condición deben sumar exactamente 100% (RN-PAG-02). El orden de las filas define el número de cuota.',
    dependeDe: ['CondicionesPago'],
    codigoUnicoGlobal: false, // no tiene columna "codigo" propia
    columnas: [
      { encabezado: 'Condición de Pago (código)', campo: 'condicionPagoCodigo', tipo: 'fk', requerido: true, fk: { hoja: 'CondicionesPago' } },
      { encabezado: 'Porcentaje', campo: 'porcentaje', tipo: 'decimal', requerido: true, ayuda: 'Máximo 2 decimales. La suma de las cuotas de una misma condición debe dar 100.' },
      { encabezado: 'Plazo (días)', campo: 'plazoDias', tipo: 'entero', requerido: true },
    ],
  },
  {
    hoja: 'Paises',
    modelo: 'pais',
    titulo: 'Países',
    descripcion: 'Catálogo abierto (RN-GEO-01). Ya vienen sembrados 18 países — usa esta hoja solo para agregar países nuevos.',
    dependeDe: [],
    columnas: [
      { encabezado: 'Código', campo: 'codigo', tipo: 'texto', requerido: true, ayuda: 'Manual, sin espacios. Ej. CHL.' },
      COL_NOMBRE,
    ],
  },

  // ─── Geografía chilena — SOLO REFERENCIA (fija por seed, RN-GEO-01) ──────
  {
    hoja: 'Regiones',
    titulo: 'Regiones (solo referencia)',
    descripcion: 'Geografía chilena fija por seed. No se carga desde este archivo — copia el código para usarlo en Comunas si lo necesitas.',
    dependeDe: [],
    soloReferencia: true,
    columnas: [
      { encabezado: 'Código', campo: 'codigo', tipo: 'texto' },
      COL_NOMBRE,
    ],
  },
  {
    hoja: 'Provincias',
    titulo: 'Provincias (solo referencia)',
    descripcion: 'Geografía chilena fija por seed. No se carga desde este archivo.',
    dependeDe: ['Regiones'],
    soloReferencia: true,
    columnas: [
      { encabezado: 'Código', campo: 'codigo', tipo: 'texto' },
      COL_NOMBRE,
      { encabezado: 'Región (código)', campo: 'regionCodigo', tipo: 'texto' },
    ],
  },
  {
    hoja: 'Comunas',
    titulo: 'Comunas (solo referencia)',
    descripcion: 'Geografía chilena fija por seed. No se carga desde este archivo — usa el código en las hojas de Direcciones cuando el país sea Chile (RN-GEO-02).',
    dependeDe: ['Provincias'],
    soloReferencia: true,
    columnas: [
      { encabezado: 'Código', campo: 'codigo', tipo: 'texto' },
      COL_NOMBRE,
      { encabezado: 'Provincia (código)', campo: 'provinciaCodigo', tipo: 'texto' },
    ],
  },

  // ─── Clientes ─────────────────────────────────────────────────────────────
  {
    hoja: 'Clientes',
    modelo: 'cliente',
    titulo: 'Clientes',
    descripcion: 'Agencias de viaje (receptivo, USD) y empresas (eventos, CLP). Los ejecutivos se agregan en la hoja "ClientesEjecutivos".',
    dependeDe: ['Paises', 'FormasPago', 'CondicionesPago'],
    columnas: [
      { encabezado: 'Código', campo: 'codigo', tipo: 'texto', autogenerar: true, ayuda: 'Vacío = se autogenera (CLxxxx).' },
      { encabezado: 'Tipo', campo: 'tipo', tipo: 'enum', requerido: true, enumValores: ENUM_TIPO_CLIENTE },
      { encabezado: 'Razón Social', campo: 'razonSocial', tipo: 'texto', requerido: true },
      { encabezado: 'RUT', campo: 'rut', tipo: 'texto', ayuda: 'Obligatorio si Tipo = EMPRESA (RN-CLI-01).' },
      { encabezado: 'Nombre Comercial', campo: 'nombreComercial', tipo: 'texto' },
      { encabezado: 'País (código)', campo: 'paisId', tipo: 'fk', requerido: true, fk: { hoja: 'Paises', externo: true, modelo: 'pais' } },
      { encabezado: 'Moneda Habitual', campo: 'monedaHabitual', tipo: 'enum', enumValores: ENUM_MONEDA, ayuda: 'Vacío = USD si Agencia, CLP si Empresa.' },
      { encabezado: 'Forma de Pago (código)', campo: 'formaPagoId', tipo: 'fk', fk: { hoja: 'FormasPago', externo: true, modelo: 'formaPago' } },
      { encabezado: 'Condición de Pago (código)', campo: 'condicionPagoId', tipo: 'fk', fk: { hoja: 'CondicionesPago', externo: true, modelo: 'condicionPago' } },
      COL_EMAIL,
      COL_TELEFONO,
    ],
  },
  {
    hoja: 'ClientesEjecutivos',
    titulo: 'Ejecutivos de Cliente',
    descripcion: 'Ejecutivos de contacto del cliente. Solo se pueden agregar al crear el cliente EN ESTE MISMO ARCHIVO — para sumar un ejecutivo a un cliente ya existente, usa la ficha de Clientes.',
    dependeDe: ['Clientes'],
    codigoUnicoGlobal: false,
    columnas: [
      { encabezado: 'Cliente (código)', campo: 'clienteCodigo', tipo: 'fk', requerido: true, fk: { hoja: 'Clientes' } },
      { encabezado: 'Nombre', campo: 'nombre', tipo: 'texto', requerido: true },
      COL_EMAIL,
      COL_TELEFONO,
      COL_CARGO,
      COL_DESCRIPCION_LIBRE,
      COL_ES_REP_LEGAL,
    ],
  },
  {
    hoja: 'ClientesDirecciones',
    titulo: 'Direcciones de Cliente',
    descripcion: 'Direcciones del cliente. Puede referenciar un cliente creado en este archivo o uno ya existente.',
    dependeDe: ['Clientes', 'Paises'],
    codigoUnicoGlobal: false,
    columnas: [
      { encabezado: 'Cliente (código)', campo: 'clienteId', tipo: 'fk', requerido: true, fk: { hoja: 'Clientes', externo: true, modelo: 'cliente' } },
      { encabezado: 'Etiqueta', campo: 'etiqueta', tipo: 'texto', requerido: true },
      COL_DESCRIPCION_LIBRE,
      { encabezado: 'País (código)', campo: 'paisId', tipo: 'fk', requerido: true, fk: { hoja: 'Paises', externo: true, modelo: 'pais' } },
      { encabezado: 'Comuna (código)', campo: 'comunaId', tipo: 'fk', fk: { hoja: 'Comunas', modelo: 'comuna' }, ayuda: 'Obligatoria si el país es Chile (RN-GEO-02).' },
      { encabezado: 'Dirección', campo: 'direccion', tipo: 'textoLargo', requerido: true },
      { encabezado: 'Es Dirección por Defecto (SI/NO)', campo: 'esPorDefecto', tipo: 'booleanSiNo', ayuda: 'Como máximo una por cliente (RN-GEO-03).' },
    ],
  },

  // ─── Proveedores ────────────────────────────────────────────────────────
  {
    hoja: 'Proveedores',
    modelo: 'proveedor',
    titulo: 'Proveedores',
    descripcion: 'Alias, cuentas bancarias y contactos se agregan en sus propias hojas.',
    dependeDe: ['TiposServicio', 'Zonas', 'FormasPago', 'CondicionesPago'],
    columnas: [
      { encabezado: 'Código', campo: 'codigo', tipo: 'texto', autogenerar: true, ayuda: 'Vacío = se autogenera (PRxxxx).' },
      { encabezado: 'Razón Social', campo: 'razonSocial', tipo: 'texto', requerido: true },
      { encabezado: 'RUT', campo: 'rut', tipo: 'texto', requerido: true, ayuda: 'Extranjero sin RUT real: usar 55.555.555-5 (RN-PRV-01).' },
      { encabezado: 'Nombre Comercial', campo: 'nombreComercial', tipo: 'texto' },
      { encabezado: 'Tipo de Documento', campo: 'tipoDocumento', tipo: 'enum', enumValores: ENUM_TIPO_DOC_PROVEEDOR, ayuda: 'Vacío = FACTURA_AFECTA.' },
      { encabezado: 'Link de Pago', campo: 'urlPago', tipo: 'texto', ayuda: 'URL válida si viene.' },
      {
        encabezado: 'Tipos de Servicio (códigos separados por coma)',
        campo: 'tiposServicio',
        tipo: 'fkMulti',
        requerido: true,
        fk: { hoja: 'TiposServicio', externo: true, modelo: 'tipoServicio' },
        ayuda: 'Al menos uno (RN-PRV-08). Ej. ALOJAMIENTO,TRANSPORTE.',
      },
      {
        encabezado: 'Zonas (códigos separados por coma)',
        campo: 'zonas',
        tipo: 'fkMulti',
        fk: { hoja: 'Zonas', externo: true, modelo: 'zona' },
        ayuda: 'Opcional (RN-PRV-05). Ej. ARI,SPA.',
      },
      { encabezado: 'Forma de Pago (código)', campo: 'formaPagoId', tipo: 'fk', fk: { hoja: 'FormasPago', externo: true, modelo: 'formaPago' } },
      { encabezado: 'Condición de Pago (código)', campo: 'condicionPagoId', tipo: 'fk', fk: { hoja: 'CondicionesPago', externo: true, modelo: 'condicionPago' } },
      { encabezado: 'Política de Cancelación', campo: 'politicaCancelacion', tipo: 'textoLargo' },
      COL_EMAIL,
      COL_TELEFONO,
    ],
  },
  {
    hoja: 'ProveedoresAlias',
    titulo: 'Alias de Proveedor',
    descripcion: 'Nombre interno o glosa bancaria del proveedor. Un mismo alias no puede repetirse entre proveedores distintos (RN-PRV-03). Solo para proveedores creados en este archivo.',
    dependeDe: ['Proveedores'],
    codigoUnicoGlobal: false,
    columnas: [
      { encabezado: 'Proveedor (código)', campo: 'proveedorCodigo', tipo: 'fk', requerido: true, fk: { hoja: 'Proveedores' } },
      { encabezado: 'Alias', campo: 'alias', tipo: 'texto', requerido: true },
    ],
  },
  {
    hoja: 'ProveedoresCuentas',
    titulo: 'Cuentas Bancarias de Proveedor',
    descripcion: 'Puede tener varias cuentas; ninguna es "principal" en fase 1. Solo para proveedores creados en este archivo.',
    dependeDe: ['Proveedores'],
    codigoUnicoGlobal: false,
    columnas: [
      { encabezado: 'Proveedor (código)', campo: 'proveedorCodigo', tipo: 'fk', requerido: true, fk: { hoja: 'Proveedores' } },
      { encabezado: 'Banco', campo: 'banco', tipo: 'texto', requerido: true },
      { encabezado: 'Tipo de Cuenta', campo: 'tipoCuenta', tipo: 'texto' },
      { encabezado: 'Número de Cuenta', campo: 'numeroCuenta', tipo: 'texto', requerido: true },
      { encabezado: 'Titular', campo: 'titular', tipo: 'texto' },
      { encabezado: 'RUT Titular', campo: 'rutTitular', tipo: 'texto' },
    ],
  },
  {
    hoja: 'ProveedoresContactos',
    titulo: 'Contactos de Proveedor',
    descripcion: 'Solo para proveedores creados en este archivo.',
    dependeDe: ['Proveedores'],
    codigoUnicoGlobal: false,
    columnas: [
      { encabezado: 'Proveedor (código)', campo: 'proveedorCodigo', tipo: 'fk', requerido: true, fk: { hoja: 'Proveedores' } },
      { encabezado: 'Nombre', campo: 'nombre', tipo: 'texto', requerido: true },
      COL_EMAIL,
      COL_TELEFONO,
      COL_CARGO,
      COL_DESCRIPCION_LIBRE,
      COL_ES_REP_LEGAL,
      { encabezado: 'Es Ejecutivo (SI/NO)', campo: 'esEjecutivo', tipo: 'booleanSiNo', ayuda: 'No exclusivo (RN-PRV-07): puede haber varios.' },
    ],
  },
  {
    hoja: 'ProveedoresDirecciones',
    titulo: 'Direcciones de Proveedor',
    descripcion: 'Direcciones del proveedor. Puede referenciar un proveedor creado en este archivo o uno ya existente.',
    dependeDe: ['Proveedores', 'Paises'],
    codigoUnicoGlobal: false,
    columnas: [
      { encabezado: 'Proveedor (código)', campo: 'proveedorId', tipo: 'fk', requerido: true, fk: { hoja: 'Proveedores', externo: true, modelo: 'proveedor' } },
      { encabezado: 'Etiqueta', campo: 'etiqueta', tipo: 'texto', requerido: true },
      COL_DESCRIPCION_LIBRE,
      { encabezado: 'País (código)', campo: 'paisId', tipo: 'fk', requerido: true, fk: { hoja: 'Paises', externo: true, modelo: 'pais' } },
      { encabezado: 'Comuna (código)', campo: 'comunaId', tipo: 'fk', fk: { hoja: 'Comunas', modelo: 'comuna' }, ayuda: 'Obligatoria si el país es Chile (RN-GEO-02).' },
      { encabezado: 'Dirección', campo: 'direccion', tipo: 'textoLargo', requerido: true },
      { encabezado: 'Es Dirección por Defecto (SI/NO)', campo: 'esPorDefecto', tipo: 'booleanSiNo', ayuda: 'Como máximo una por proveedor (RN-GEO-03).' },
    ],
  },

  // ─── Servicios ──────────────────────────────────────────────────────────
  {
    hoja: 'Servicios',
    modelo: 'servicio',
    titulo: 'Servicios',
    descripcion: 'Catálogo de costos (el precio de venta se calcula al cotizar). El modelo de tarifa debe calzar con el de los tarifarios que se carguen después.',
    dependeDe: ['Zonas', 'TiposServicio'],
    columnas: [
      { encabezado: 'Código', campo: 'codigo', tipo: 'texto', autogenerar: true, ayuda: 'Vacío = se autogenera (SVxxxx).' },
      COL_NOMBRE,
      { encabezado: 'Nombre (inglés)', campo: 'nombreEn', tipo: 'texto', ayuda: 'Recomendado: el listado advierte si falta (RN-MAN-08).' },
      { encabezado: 'Descripción', campo: 'descripcion', tipo: 'textoLargo' },
      { encabezado: 'Descripción (inglés)', campo: 'descripcionEn', tipo: 'textoLargo' },
      { encabezado: 'Zona (código)', campo: 'zonaId', tipo: 'fk', fk: { hoja: 'Zonas', externo: true, modelo: 'zona' } },
      { encabezado: 'Tipo de Servicio (código)', campo: 'tipoServicioId', tipo: 'fk', requerido: true, fk: { hoja: 'TiposServicio', externo: true, modelo: 'tipoServicio' } },
      { encabezado: 'Modelo de Tarifa', campo: 'modeloTarifa', tipo: 'enum', requerido: true, enumValores: ENUM_MODELO_TARIFA, ayuda: 'Se recomienda calzar con el Modelo de Tarifa por Defecto del Tipo de Servicio.' },
      { encabezado: 'Margen Sugerido', campo: 'margenSugerido', tipo: 'decimal', ayuda: 'Ej. 0.5000 = 50%. Vacío = 0.' },
      { encabezado: 'Duración (días)', campo: 'duracionDias', tipo: 'entero' },
    ],
  },
]

/** Orden topológico de carga (respeta `dependeDe`). */
export function ordenTopologico(hojas: HojaSpec[] = REGISTRO_MAESTROS): HojaSpec[] {
  const porNombre = new Map(hojas.map((h) => [h.hoja, h]))
  const visitado = new Set<string>()
  const orden: HojaSpec[] = []
  const visitar = (h: HojaSpec, cadena: string[]) => {
    if (visitado.has(h.hoja)) return
    if (cadena.includes(h.hoja)) throw new Error(`Dependencia circular: ${[...cadena, h.hoja].join(' -> ')}`)
    for (const dep of h.dependeDe) {
      const d = porNombre.get(dep)
      if (d) visitar(d, [...cadena, h.hoja])
    }
    visitado.add(h.hoja)
    orden.push(h)
  }
  for (const h of hojas) visitar(h, [])
  return orden
}
