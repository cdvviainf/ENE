/* eslint-disable @typescript-eslint/no-explicit-any -- el motor genérico maneja payloads heterogéneos por diseño */
import type { ZodError, ZodTypeAny } from 'zod'
import type { ColumnaSpec, ErrorFila, FilaParseada, HojaSpec, ResultadoParseo } from '../../../shared/carga-masiva/tipos.js'
import { parsearLibro, validarReferenciasInternas } from '../../../shared/carga-masiva/parsear.js'
import { peekSiguienteCodigo, type EntidadCorrelativoMaestro } from '../../../shared/correlativos.js'
import { validarRutChileno, formatearRut } from '../../../shared/rut-validator.js'
import { validarComunaRequerida } from '../../../shared/direcciones.js'
import { REGISTRO_MAESTROS, ordenTopologico } from './registro.js'

import * as zonasRepo from '../zonas/zonas.repository.js'
import * as zonasService from '../zonas/zonas.service.js'
import { zonaCreateSchema } from '../zonas/zonas.schema.js'
import * as tiposServicioRepo from '../tipos-servicio/tipos-servicio.repository.js'
import * as tiposServicioService from '../tipos-servicio/tipos-servicio.service.js'
import { tipoServicioCreateSchema } from '../tipos-servicio/tipos-servicio.schema.js'
import * as formasPagoRepo from '../formas-pago/formas-pago.repository.js'
import * as formasPagoService from '../formas-pago/formas-pago.service.js'
import { formaPagoCreateSchema } from '../formas-pago/formas-pago.schema.js'
import * as condicionesPagoRepo from '../condiciones-pago/condiciones-pago.repository.js'
import * as condicionesPagoService from '../condiciones-pago/condiciones-pago.service.js'
import { condicionPagoCreateSchema, condicionPagoCuotaInputSchema } from '../condiciones-pago/condiciones-pago.schema.js'
import * as paisesRepo from '../paises/paises.repository.js'
import * as paisesService from '../paises/paises.service.js'
import { paisCreateSchema } from '../paises/paises.schema.js'
import * as comunasRepo from '../comunas/comunas.repository.js'

import * as clientesRepo from '../../clientes/clientes.repository.js'
import * as clientesService from '../../clientes/clientes.service.js'
import { clienteCreateSchema, ejecutivoInputSchema, direccionInputSchema as direccionClienteSchema } from '../../clientes/clientes.schema.js'
import * as proveedoresRepo from '../../proveedores/proveedores.repository.js'
import * as proveedoresService from '../../proveedores/proveedores.service.js'
import {
  proveedorCreateSchema,
  aliasInputSchema,
  cuentaInputSchema,
  contactoInputSchema,
  direccionInputSchema as direccionProveedorSchema,
} from '../../proveedores/proveedores.schema.js'
import * as serviciosRepo from '../../servicios/servicios.repository.js'
import * as serviciosService from '../../servicios/servicios.service.js'
import { servicioCreateSchema } from '../../servicios/servicios.schema.js'

// Hojas que no producen un registro propio: sus filas se agrupan por el
// código de su padre y se anidan en el payload del padre (ejecutivos, alias,
// cuentas, contactos, cuotas) o se procesan aparte (direcciones — RN-GEO-*).
const HOJAS_AGRUPADAS = new Set([
  'ClientesEjecutivos',
  'ProveedoresAlias',
  'ProveedoresCuentas',
  'ProveedoresContactos',
  'CondicionesPagoCuotas',
])
const HOJAS_DIRECCIONES = new Set(['ClientesDirecciones', 'ProveedoresDirecciones'])

const SCHEMA_POR_MODELO: Record<string, ZodTypeAny> = {
  zona: zonaCreateSchema,
  tipoServicio: tipoServicioCreateSchema,
  formaPago: formaPagoCreateSchema,
  condicionPago: condicionPagoCreateSchema,
  pais: paisCreateSchema,
  cliente: clienteCreateSchema,
  proveedor: proveedorCreateSchema,
  servicio: servicioCreateSchema,
}

const ENTIDAD_CORRELATIVO_POR_MODELO: Partial<Record<string, EntidadCorrelativoMaestro>> = {
  cliente: 'CLIENTE',
  proveedor: 'PROVEEDOR',
  servicio: 'SERVICIO',
}

const MODELO_POR_HOJA = new Map(REGISTRO_MAESTROS.filter((h) => h.modelo).map((h) => [h.hoja, h.modelo as string]))
const HOJA_POR_MODELO: Record<string, string> = {}
for (const h of REGISTRO_MAESTROS) if (h.modelo) HOJA_POR_MODELO[h.modelo] = h.hoja

// Id de relleno para una FK que en dry-run resuelve contra una fila de una
// hoja anterior de este mismo archivo (todavía no existe de verdad en BD: se
// crearía recién al confirmar, en el orden que ya garantiza
// `ordenTopologico`). Nunca se usa para escribir — dry-run no llama a
// `crearRegistro`/`crearDireccion`. Positivo (los schemas Zod exigen
// `int().positive()`) y fuera de rango real de un serial de Postgres, para
// no colisionar con un id existente ni fallar la validación de forma.
const CODIGO_VIRTUAL_SENTINEL = 999_999_999

// RN-PRV-01: el RUT genérico de proveedores extranjeros sin RUT real puede
// repetirse entre proveedores — no cuenta como colisión, ni contra la BD ni
// entre filas del mismo archivo. Mismo valor que `proveedores.repository.ts`
// (no exportado desde ahí).
const RUT_GENERICO_PROVEEDOR = '55555555-5'

/** Acumula RUT/alias de Proveedor ya "aceptados" en este mismo archivo, para
 * detectar colisiones entre filas antes de escribir nada (no solo contra la
 * BD, que en dry-run nunca cambia). */
interface AcumuladorProveedor {
  ruts: Set<string>
  alias: Set<string>
}

export interface OpcionesCarga {
  /** true = solo validar (no escribe en BD). */
  dryRun?: boolean
  /** Usuario que ejecuta la carga (auditoría `creadoPor`). */
  creadoPor?: string
}

export interface ResultadoCarga {
  dryRun: boolean
  resumen: Record<string, { filas: number; creados: number }>
  errores: ErrorFila[]
}

/**
 * Resuelve un código a su id contra la BD. En dry-run (`codigosArchivo`
 * presente) una FK que no resuelve contra la BD todavía puede resolver
 * contra el código de una fila de una hoja anterior de este mismo archivo —
 * devuelve `CODIGO_VIRTUAL_SENTINEL` en ese caso (nunca se persiste).
 */
async function resolverCodigoAId(
  modelo: string,
  codigo: string,
  codigosArchivo?: Record<string, Set<string>>,
): Promise<number | null> {
  const real = await resolverCodigoAIdEnBD(modelo, codigo)
  if (real != null) return real
  if (codigosArchivo) {
    const hoja = HOJA_POR_MODELO[modelo]
    if (hoja && codigosArchivo[hoja]?.has(codigo)) return CODIGO_VIRTUAL_SENTINEL
  }
  return null
}

async function resolverCodigoAIdEnBD(modelo: string, codigo: string): Promise<number | null> {
  switch (modelo) {
    case 'zona':
      return (await zonasRepo.findZonaByCodigo(codigo))?.id ?? null
    case 'tipoServicio':
      return (await tiposServicioRepo.findTipoServicioByCodigo(codigo))?.id ?? null
    case 'formaPago':
      return (await formasPagoRepo.findFormaPagoByCodigo(codigo))?.id ?? null
    case 'condicionPago':
      return (await condicionesPagoRepo.findCondicionPagoByCodigo(codigo))?.id ?? null
    case 'pais':
      return (await paisesRepo.findPaisByCodigo(codigo))?.id ?? null
    case 'comuna':
      return (await comunasRepo.findComunaByCodigo(codigo))?.id ?? null
    case 'cliente':
      return (await clientesRepo.findClienteByCodigo(codigo))?.id ?? null
    case 'proveedor':
      return (await proveedoresRepo.findProveedorByCodigo(codigo))?.id ?? null
    case 'servicio':
      return (await serviciosRepo.findServicioByCodigo(codigo))?.id ?? null
    default:
      return null
  }
}

function modeloDestinoFk(col: ColumnaSpec): string | undefined {
  return col.fk?.modelo ?? (col.fk?.hoja ? MODELO_POR_HOJA.get(col.fk.hoja) : undefined)
}

function zodIssuesAErrores(hoja: string, fila: number, error: ZodError): ErrorFila[] {
  return error.issues.map((issue) => ({
    hoja,
    fila,
    columna: issue.path.length ? issue.path.join('.') : undefined,
    codigo: 'VALIDACION_INVALIDA',
    mensaje: issue.message,
  }))
}

// QA-CM-001 (ronda QA 1): un error de parseo en una columna OPCIONAL (ej. un
// enum inválido) hacía que `coaccionar` descartara el valor (`undefined`) sin
// bloquear la fila —solo lo bloqueaba si la columna era `requerido`—, así que
// Zod terminaba aplicando su default y la fila se creaba igual, aunque ya
// estuviera reportada como inválida. Este índice `hoja::fila` marca CUALQUIER
// fila con al menos un error de parseo (de cualquier columna) para que el
// orquestador la salte por completo antes de construir su input, sin
// importar si el campo roto era obligatorio.
function indiceFilasConErrorDeParseo(parseo: ResultadoParseo): Set<string> {
  const indice = new Set<string>()
  for (const [hoja, resultado] of Object.entries(parseo.hojas)) {
    for (const err of resultado.errores) indice.add(`${hoja}::${err.fila}`)
  }
  return indice
}

function filaConErrorDeParseo(indice: Set<string>, hoja: string, fila: number): boolean {
  return indice.has(`${hoja}::${fila}`)
}

/** Descarta, de una lista de filas de una hoja hija, las que ya tienen un
 * error de parseo — para que una subfila rota (ej. un ejecutivo con email
 * inválido) no tumbe a sus hermanas válidas del mismo padre. */
function subfilasSinErrorDeParseo(indice: Set<string>, hoja: string, filas: FilaParseada[]): FilaParseada[] {
  return filas.filter((f) => !filaConErrorDeParseo(indice, hoja, f.fila))
}

/** Agrupa las filas de una hoja hija por el código de su padre, en orden de aparición. */
function agruparPorCodigoPadre(filas: FilaParseada[], campoCodigoPadre: string): Map<string, FilaParseada[]> {
  const mapa = new Map<string, FilaParseada[]>()
  for (const fila of filas) {
    const codigo = fila.valores[campoCodigoPadre]
    if (typeof codigo !== 'string') continue // FALTA_REQUERIDO ya reportado por el parser
    const lista = mapa.get(codigo) ?? []
    lista.push(fila)
    mapa.set(codigo, lista)
  }
  return mapa
}

/** Suma `n` al contador de creados de una hoja del resumen (no-op si la hoja no está registrada). */
function sumarCreados(resumen: Record<string, { filas: number; creados: number }>, hoja: string, n = 1) {
  const entrada = resumen[hoja]
  if (entrada) entrada.creados += n
}

// QA-CM-003 (ronda QA 2): filtrar solo los errores de PARSER (ver
// `subfilasSinErrorDeParseo`) no bastaba — una subfila que supera el parser
// pero falla su propio Zod (ej. un email con formato inválido) se anidaba sin
// validar en el payload del padre; recién el schema del padre la rechazaba
// completo, tumbando también al padre válido y a sus demás subfilas
// hermanas, y atribuyendo el error a la fila del padre en vez de a la fila
// real de la subfila. Cada subfila se valida acá, individualmente, contra su
// propio schema — solo las que pasan se anexan al padre; las que no, quedan
// reportadas con su hoja/fila original y se excluyen sin afectar al resto.
function subfilasValidadas(
  mapa: Map<string, FilaParseada[]>,
  codigoPadre: string | undefined,
  clave: string,
  hojaHija: string,
  schema: ZodTypeAny,
  errores: ErrorFila[],
): any[] {
  const filas = codigoPadre ? (mapa.get(codigoPadre) ?? []) : []
  const validas: any[] = []
  for (const f of filas) {
    const { [clave]: _omitido, ...resto } = f.valores
    const parseado = schema.safeParse(resto)
    if (!parseado.success) {
      errores.push(...zodIssuesAErrores(hojaHija, f.fila, parseado.error))
      continue
    }
    validas.push(parseado.data)
  }
  return validas
}

interface MapasAgrupacion {
  ejecutivosPorCliente: Map<string, FilaParseada[]>
  aliasPorProveedor: Map<string, FilaParseada[]>
  cuentasPorProveedor: Map<string, FilaParseada[]>
  contactosPorProveedor: Map<string, FilaParseada[]>
  cuotasPorCondicionPago: Map<string, FilaParseada[]>
}

/**
 * Construye el input crudo de una fila de una hoja "primaria" (no agrupada,
 * no de direcciones): resuelve FK/FK-múltiple a ids, autogenera el código si
 * corresponde, y anida las subfilas de hojas hijas. Devuelve `null` si la
 * fila tiene un error que impide crearla (ya registrado en `errores`).
 */
async function construirInputBase(
  hoja: HojaSpec,
  fila: FilaParseada,
  errores: ErrorFila[],
  mapas: MapasAgrupacion,
  codigosArchivo?: Record<string, Set<string>>,
): Promise<Record<string, any> | null> {
  const input: Record<string, any> = {}
  let bloqueada = false
  let colCodigo: ColumnaSpec | undefined

  for (const col of hoja.columnas) {
    if (!col.campo) continue
    if (col.campo === 'codigo') {
      colCodigo = col
      continue // se procesa al final (posible autogeneración)
    }
    const val = fila.valores[col.campo]

    if (col.tipo === 'fk') {
      if (val == null) {
        if (col.requerido) bloqueada = true
        continue
      }
      const modelo = modeloDestinoFk(col)
      const id = modelo ? await resolverCodigoAId(modelo, String(val), codigosArchivo) : null
      if (id == null) {
        errores.push({ hoja: hoja.hoja, fila: fila.fila, columna: col.encabezado, codigo: 'FK_NO_RESUELTA', mensaje: `No existe "${val}" en ${modelo ?? col.fk?.hoja}.` })
        bloqueada = true
        continue
      }
      input[col.campo] = id
      continue
    }

    if (col.tipo === 'fkMulti') {
      const codigos = Array.isArray(val) ? (val as string[]) : []
      if (codigos.length === 0) {
        if (col.requerido) bloqueada = true
        continue
      }
      const modelo = modeloDestinoFk(col)
      const ids: number[] = []
      for (const codigo of codigos) {
        const id = modelo ? await resolverCodigoAId(modelo, codigo, codigosArchivo) : null
        if (id == null) {
          errores.push({ hoja: hoja.hoja, fila: fila.fila, columna: col.encabezado, codigo: 'FK_NO_RESUELTA', mensaje: `No existe "${codigo}" en ${modelo ?? col.fk?.hoja}.` })
          bloqueada = true
          continue
        }
        ids.push(id)
      }
      input[col.campo] = ids
      continue
    }

    if (val == null) {
      if (col.requerido) bloqueada = true
      continue
    }
    // texto/textoLargo/entero/decimal/booleanSiNo/enum ya vienen coaccionados
    // por el parser (RN-DIN-01: decimal es string, nunca number).
    input[col.campo] = val
  }

  // Código propio: usar el del archivo o autogenerar vía correlativo.
  if (colCodigo) {
    const codArchivo = fila.valores['codigo']
    if (codArchivo != null) {
      input.codigo = String(codArchivo)
    } else if (colCodigo.autogenerar && hoja.modelo) {
      const entidad = ENTIDAD_CORRELATIVO_POR_MODELO[hoja.modelo]
      const generado = entidad ? await peekSiguienteCodigo(entidad) : null
      if (!generado) {
        errores.push({ hoja: hoja.hoja, fila: fila.fila, columna: 'Código', codigo: 'SIN_CORRELATIVO', mensaje: `No se pudo generar un código automático. Completa el código manualmente.` })
        bloqueada = true
      } else {
        input.codigo = generado
      }
    } else if (colCodigo.requerido) {
      bloqueada = true
    }
  }

  if (bloqueada) return null

  // Subfilas de hojas hijas, ancladas por el código ORIGINAL del archivo (no
  // el autogenerado): si el padre necesita hijas, debe traer código explícito.
  const codigoOriginal = fila.valores['codigo'] != null ? String(fila.valores['codigo']) : undefined
  if (hoja.modelo === 'cliente') {
    input.ejecutivos = subfilasValidadas(mapas.ejecutivosPorCliente, codigoOriginal, 'clienteCodigo', 'ClientesEjecutivos', ejecutivoInputSchema, errores)
  }
  if (hoja.modelo === 'proveedor') {
    input.alias = subfilasValidadas(mapas.aliasPorProveedor, codigoOriginal, 'proveedorCodigo', 'ProveedoresAlias', aliasInputSchema, errores)
    input.cuentas = subfilasValidadas(mapas.cuentasPorProveedor, codigoOriginal, 'proveedorCodigo', 'ProveedoresCuentas', cuentaInputSchema, errores)
    input.contactos = subfilasValidadas(mapas.contactosPorProveedor, codigoOriginal, 'proveedorCodigo', 'ProveedoresContactos', contactoInputSchema, errores)
  }
  if (hoja.modelo === 'condicionPago') {
    input.cuotas = subfilasValidadas(mapas.cuotasPorCondicionPago, codigoOriginal, 'condicionPagoCodigo', 'CondicionesPagoCuotas', condicionPagoCuotaInputSchema, errores)
  }

  return input
}

/** Despacha la creación al service correcto según el modelo de la hoja. */
async function crearRegistro(modelo: string, input: any, creadoPor: string): Promise<void> {
  switch (modelo) {
    case 'zona':
      await zonasService.crearZona(input, creadoPor)
      break
    case 'tipoServicio':
      await tiposServicioService.crearTipoServicio(input, creadoPor)
      break
    case 'formaPago':
      await formasPagoService.crearFormaPago(input, creadoPor)
      break
    case 'condicionPago':
      await condicionesPagoService.crearCondicionPago(input, creadoPor)
      break
    case 'pais':
      await paisesService.crearPais(input, creadoPor)
      break
    case 'cliente':
      await clientesService.crearCliente(input, creadoPor)
      break
    case 'proveedor':
      await proveedoresService.crearProveedor(input, creadoPor)
      break
    case 'servicio':
      await serviciosService.crearServicio(input, creadoPor)
      break
    default:
      throw new Error(`Modelo sin binding de creación en Carga Masiva: ${modelo}`)
  }
}

/**
 * Validaciones que en el alta manual viven dentro del `service.crear*` (no en
 * el Zod schema) porque requieren consultar la BD o cruzar dos campos del
 * mismo payload. Se ejecutan igual en dry-run y en commit, ANTES de escribir,
 * para que "Validar" detecte lo mismo que fallaría al confirmar. Devuelve
 * `false` (y ya registró el error) si la fila no se puede crear.
 */
async function validacionesExtra(
  hoja: HojaSpec,
  data: any,
  fila: FilaParseada,
  errores: ErrorFila[],
  acumuladorProveedor: AcumuladorProveedor,
): Promise<boolean> {
  if (!hoja.modelo) return true

  // Código propio ya existente en la base (todo maestro con código).
  if (typeof data.codigo === 'string' && (await resolverCodigoAIdEnBD(hoja.modelo, data.codigo)) != null) {
    errores.push({ hoja: hoja.hoja, fila: fila.fila, columna: 'Código', codigo: 'CODIGO_DUPLICADO', mensaje: `Ya existe "${data.codigo}" en ${hoja.hoja}.` })
    return false
  }

  if (hoja.modelo === 'cliente') {
    // RN-CLI-01 [BLOQUEA]: rut obligatorio si tipo=EMPRESA.
    if (data.tipo === 'EMPRESA' && !data.rut) {
      errores.push({ hoja: hoja.hoja, fila: fila.fila, columna: 'RUT', codigo: 'RUT_REQUERIDO', mensaje: 'El RUT es obligatorio para clientes de tipo Empresa (RN-CLI-01).' })
      return false
    }
    if (data.rut && !validarRutChileno(data.rut)) {
      errores.push({ hoja: hoja.hoja, fila: fila.fila, columna: 'RUT', codigo: 'RUT_INVALIDO', mensaje: `"${data.rut}" no es un RUT chileno válido.` })
      return false
    }
  }

  if (hoja.modelo === 'proveedor') {
    if (!validarRutChileno(data.rut)) {
      errores.push({ hoja: hoja.hoja, fila: fila.fila, columna: 'RUT', codigo: 'RUT_INVALIDO', mensaje: `"${data.rut}" no es un RUT chileno válido.` })
      return false
    }
    const rutNormalizado = formatearRut(data.rut)
    const rutEsGenerico = rutNormalizado === RUT_GENERICO_PROVEEDOR
    if (!rutEsGenerico) {
      // Colisión dentro del mismo archivo: dos filas nuevas con el mismo RUT
      // no se detectan contra la BD (dry-run no escribe nada todavía).
      if (acumuladorProveedor.ruts.has(rutNormalizado)) {
        errores.push({ hoja: hoja.hoja, fila: fila.fila, columna: 'RUT', codigo: 'RUT_DUPLICADO', mensaje: `El RUT "${data.rut}" está repetido en otra fila de este mismo archivo (RN-PRV-01).` })
        return false
      }
      // RN-PRV-01: unicidad de RUT contra la BD (el genérico se excluye en el repo).
      if (await proveedoresRepo.findProveedorByRut(rutNormalizado)) {
        errores.push({ hoja: hoja.hoja, fila: fila.fila, columna: 'RUT', codigo: 'RUT_DUPLICADO', mensaje: `Ya existe un proveedor con el RUT "${data.rut}" (RN-PRV-01).` })
        return false
      }
    }
    // RN-PRV-03: alias único, insensible a mayúsculas — dentro de la misma
    // fila, contra otras filas de este archivo, y contra cualquier proveedor ya en BD.
    const vistosEnFila = new Set<string>()
    for (const a of (data.alias ?? []) as { alias: string }[]) {
      const clave = a.alias.toLowerCase()
      if (vistosEnFila.has(clave)) {
        errores.push({ hoja: hoja.hoja, fila: fila.fila, columna: 'Alias', codigo: 'ALIAS_DUPLICADO', mensaje: `El alias "${a.alias}" está repetido en la misma fila (RN-PRV-03).` })
        return false
      }
      vistosEnFila.add(clave)
      if (acumuladorProveedor.alias.has(clave)) {
        errores.push({ hoja: hoja.hoja, fila: fila.fila, columna: 'Alias', codigo: 'ALIAS_DUPLICADO', mensaje: `El alias "${a.alias}" está repetido en otra fila de este mismo archivo (RN-PRV-03).` })
        return false
      }
      if (await proveedoresRepo.findAliasDuplicado(a.alias)) {
        errores.push({ hoja: hoja.hoja, fila: fila.fila, columna: 'Alias', codigo: 'ALIAS_DUPLICADO', mensaje: `El alias "${a.alias}" ya está en uso por otro proveedor (RN-PRV-03).` })
        return false
      }
    }

    // La fila pasó todas las validaciones: queda "aceptada" para detectar
    // colisiones contra las filas siguientes de este mismo archivo.
    if (!rutEsGenerico) acumuladorProveedor.ruts.add(rutNormalizado)
    for (const clave of vistosEnFila) acumuladorProveedor.alias.add(clave)
  }

  return true
}

/** Procesa las hojas de Direcciones (RN-GEO-02/03): no se anidan en el alta,
 * requieren resolver el código del padre (ya existente o creado en este mismo
 * archivo) y llamar `crearDireccion` por separado. */
async function procesarDirecciones(
  hoja: HojaSpec,
  filas: FilaParseada[],
  errores: ErrorFila[],
  resumen: Record<string, { filas: number; creados: number }>,
  creadoPor: string,
  dryRun: boolean,
  codigosArchivo: Record<string, Set<string>> | undefined,
  indiceErrores: Set<string>,
) {
  const esCliente = hoja.hoja === 'ClientesDirecciones'
  const campoPadre = esCliente ? 'clienteId' : 'proveedorId'
  const modeloPadre = esCliente ? 'cliente' : 'proveedor'
  const columnaPadre = esCliente ? 'Cliente (código)' : 'Proveedor (código)'
  const schema = esCliente ? direccionClienteSchema : direccionProveedorSchema

  for (const fila of filas) {
    // QA-CM-001: ya quedó reportada por el parser (ej. un booleano inválido
    // en "Es Dirección por Defecto") — no crearla igual con el default de Zod.
    if (filaConErrorDeParseo(indiceErrores, hoja.hoja, fila.fila)) continue

    const codigoPadre = fila.valores[campoPadre]
    if (typeof codigoPadre !== 'string') continue // FALTA_REQUERIDO ya reportado

    const parentId = await resolverCodigoAId(modeloPadre, codigoPadre, codigosArchivo)
    if (parentId == null) {
      errores.push({ hoja: hoja.hoja, fila: fila.fila, columna: columnaPadre, codigo: 'FK_NO_RESUELTA', mensaje: `No existe "${codigoPadre}" en ${esCliente ? 'Clientes' : 'Proveedores'}.` })
      continue
    }

    const paisCodigo = fila.valores['paisId']
    if (typeof paisCodigo !== 'string') continue // FALTA_REQUERIDO ya reportado
    const paisId = await resolverCodigoAId('pais', paisCodigo, codigosArchivo)
    if (paisId == null) {
      errores.push({ hoja: hoja.hoja, fila: fila.fila, columna: 'País (código)', codigo: 'FK_NO_RESUELTA', mensaje: `No existe "${paisCodigo}" en Países.` })
      continue
    }

    let comunaId: number | undefined
    const comunaCodigo = fila.valores['comunaId']
    if (typeof comunaCodigo === 'string') {
      const id = await resolverCodigoAId('comuna', comunaCodigo, codigosArchivo)
      if (id == null) {
        errores.push({ hoja: hoja.hoja, fila: fila.fila, columna: 'Comuna (código)', codigo: 'FK_NO_RESUELTA', mensaje: `No existe "${comunaCodigo}" en Comunas.` })
        continue
      }
      comunaId = id
    }

    const candidato = {
      etiqueta: fila.valores['etiqueta'],
      descripcion: fila.valores['descripcion'],
      paisId,
      comunaId,
      direccion: fila.valores['direccion'],
      esPorDefecto: fila.valores['esPorDefecto'],
    }
    const parseado = schema.safeParse(candidato)
    if (!parseado.success) {
      errores.push(...zodIssuesAErrores(hoja.hoja, fila.fila, parseado.error))
      continue
    }

    // RN-GEO-02: comuna obligatoria si el país es Chile. Función de solo
    // lectura (consulta Pais.esPaisNacional) — se puede correr en dry-run.
    // Con un país "virtual" (creado en este mismo archivo, aún no
    // existente en BD) la consulta no encuentra fila y no bloquea: un país
    // nuevo nunca puede ser Chile (RN-GEO-01, `esPaisNacional` no es
    // editable vía API), así que no hay falso negativo posible acá.
    try {
      await validarComunaRequerida(paisId, comunaId)
    } catch (err: any) {
      errores.push({ hoja: hoja.hoja, fila: fila.fila, columna: 'Comuna (código)', codigo: 'VALIDACION_INVALIDA', mensaje: err?.message ?? String(err) })
      continue
    }

    if (dryRun) continue

    try {
      if (esCliente) await clientesService.crearDireccion(parentId, parseado.data as any, creadoPor)
      else await proveedoresService.crearDireccion(parentId, parseado.data as any, creadoPor)
      sumarCreados(resumen, hoja.hoja)
    } catch (err: any) {
      errores.push({ hoja: hoja.hoja, fila: fila.fila, codigo: 'ERROR_CREACION', mensaje: err?.message ?? String(err) })
    }
  }
}

export async function cargarMaestros(
  rutaOBuffer: string | Buffer,
  opciones: OpcionesCarga = {},
  registro: HojaSpec[] = REGISTRO_MAESTROS,
): Promise<ResultadoCarga> {
  const { dryRun = false, creadoPor = 'system' } = opciones

  const parseo = await parsearLibro(rutaOBuffer, registro)
  const errores: ErrorFila[] = [
    ...parseo.errores,
    ...Object.values(parseo.hojas).flatMap((h) => h.errores),
    ...validarReferenciasInternas(parseo, registro),
  ]

  const resumen: Record<string, { filas: number; creados: number }> = {}
  for (const h of registro) {
    if (h.soloReferencia) continue
    resumen[h.hoja] = { filas: parseo.hojas[h.hoja]?.filas.length ?? 0, creados: 0 }
  }

  // El mismo recorrido corre en dry-run y en commit — solo el paso final de
  // escritura (`crearRegistro`/`crearDireccion`) se salta si `dryRun`. Así
  // "Validar" detecta lo mismo que fallaría al confirmar (Zod, RN-CLI-01,
  // RN-GEO-02, RUT/alias duplicados, código ya existente), no solo la forma
  // estructural del archivo.
  const indiceErrores = indiceFilasConErrorDeParseo(parseo)

  // QA-CM-002 (ronda QA 1): a diferencia de `codigosArchivo` de más arriba
  // (pre-chequeo estructural de `validarReferenciasInternas`, construido de
  // una sola vez desde el parseo crudo), el sentinel virtual de FK en
  // dry-run debe resolver solo contra filas padre que YA superaron su propia
  // validación completa — si no, "Validar" acepta como válida la FK de una
  // fila que va a ser rechazada al confirmar (ej. un Servicio que referencia
  // una Zona sin nombre). Se llena incrementalmente, fila por fila, en el
  // mismo recorrido topológico de abajo: como una hoja padre se procesa
  // completa antes que su hija, al resolver la FK del hijo el acumulador ya
  // refleja exactamente qué filas del padre sobrevivieron.
  const codigosAceptados: Record<string, Set<string>> = {}
  // En dry-run, una FK "externo" resuelve además contra el código de una fila
  // aceptada de una hoja anterior de este mismo archivo (ver
  // `resolverCodigoAId`); en commit no hace falta — ya está de verdad en la
  // BD porque `ordenTopologico` procesa esa hoja antes.
  const codigosParaFk = dryRun ? codigosAceptados : undefined

  const acumuladorProveedor: AcumuladorProveedor = { ruts: new Set(), alias: new Set() }

  const mapas: MapasAgrupacion = {
    ejecutivosPorCliente: agruparPorCodigoPadre(subfilasSinErrorDeParseo(indiceErrores, 'ClientesEjecutivos', parseo.hojas['ClientesEjecutivos']?.filas ?? []), 'clienteCodigo'),
    aliasPorProveedor: agruparPorCodigoPadre(subfilasSinErrorDeParseo(indiceErrores, 'ProveedoresAlias', parseo.hojas['ProveedoresAlias']?.filas ?? []), 'proveedorCodigo'),
    cuentasPorProveedor: agruparPorCodigoPadre(subfilasSinErrorDeParseo(indiceErrores, 'ProveedoresCuentas', parseo.hojas['ProveedoresCuentas']?.filas ?? []), 'proveedorCodigo'),
    contactosPorProveedor: agruparPorCodigoPadre(subfilasSinErrorDeParseo(indiceErrores, 'ProveedoresContactos', parseo.hojas['ProveedoresContactos']?.filas ?? []), 'proveedorCodigo'),
    cuotasPorCondicionPago: agruparPorCodigoPadre(subfilasSinErrorDeParseo(indiceErrores, 'CondicionesPagoCuotas', parseo.hojas['CondicionesPagoCuotas']?.filas ?? []), 'condicionPagoCodigo'),
  }

  for (const hoja of ordenTopologico(registro)) {
    if (hoja.soloReferencia) continue
    if (HOJAS_AGRUPADAS.has(hoja.hoja)) continue // se cargan junto a su padre

    if (HOJAS_DIRECCIONES.has(hoja.hoja)) {
      await procesarDirecciones(hoja, parseo.hojas[hoja.hoja]?.filas ?? [], errores, resumen, creadoPor, dryRun, codigosParaFk, indiceErrores)
      continue
    }

    if (!hoja.modelo) continue
    const schema = SCHEMA_POR_MODELO[hoja.modelo]
    if (!schema) throw new Error(`Modelo sin schema de validación en Carga Masiva: ${hoja.modelo}`)

    for (const fila of parseo.hojas[hoja.hoja]?.filas ?? []) {
      // QA-CM-001: ya quedó reportada por el parser — no construirla ni
      // crearla, sin importar si el campo roto era obligatorio o no.
      if (filaConErrorDeParseo(indiceErrores, hoja.hoja, fila.fila)) continue

      const construido = await construirInputBase(hoja, fila, errores, mapas, codigosParaFk)
      if (!construido) continue

      const parseado = schema.safeParse(construido)
      if (!parseado.success) {
        errores.push(...zodIssuesAErrores(hoja.hoja, fila.fila, parseado.error))
        continue
      }
      const data = parseado.data as any

      const ok = await validacionesExtra(hoja, data, fila, errores, acumuladorProveedor)
      if (!ok) continue

      // QA-CM-002: recién acá la fila quedó aceptada — recién acá su código
      // puede servir de FK virtual para una hoja hija en dry-run.
      if (typeof data.codigo === 'string') {
        ;(codigosAceptados[hoja.hoja] ??= new Set()).add(data.codigo)
      }

      if (dryRun) continue

      try {
        await crearRegistro(hoja.modelo, data, creadoPor)
        sumarCreados(resumen, hoja.hoja)

        // Reflejar en el resumen de las hojas hijas las subfilas que sí se cargaron.
        if (hoja.modelo === 'cliente' && data.ejecutivos?.length) {
          sumarCreados(resumen, 'ClientesEjecutivos', data.ejecutivos.length)
        }
        if (hoja.modelo === 'proveedor') {
          if (data.alias?.length) sumarCreados(resumen, 'ProveedoresAlias', data.alias.length)
          if (data.cuentas?.length) sumarCreados(resumen, 'ProveedoresCuentas', data.cuentas.length)
          if (data.contactos?.length) sumarCreados(resumen, 'ProveedoresContactos', data.contactos.length)
        }
        if (hoja.modelo === 'condicionPago' && data.cuotas?.length) {
          sumarCreados(resumen, 'CondicionesPagoCuotas', data.cuotas.length)
        }
      } catch (err: any) {
        errores.push({ hoja: hoja.hoja, fila: fila.fila, codigo: 'ERROR_CREACION', mensaje: err?.message ?? String(err) })
      }
    }
  }

  return { dryRun, resumen, errores }
}
