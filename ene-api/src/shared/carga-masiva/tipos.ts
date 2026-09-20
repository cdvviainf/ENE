// ─── Motor de Carga Masiva de Maestros — núcleo portable ─────────────────────
//
// Portado de FAS (`fas-api/src/lib/carga-maestros/`). Una sola especificación
// declarativa (`HojaSpec[]`) alimenta las dos direcciones del motor:
//   1. Generación del Excel base vacío (`generar-template.ts`).
//   2. Parseo + validación estructural del Excel lleno (`parsear.ts`).
//
// Este archivo NO depende de Prisma, Fastify ni de ningún modelo concreto:
// solo describe la forma de los datos. El binding a los `service.crear*()` de
// cada módulo vive en la capa de proyecto
// (`modules/config/carga-masiva/registro.ts`).
//
// RN-DIN-01: las columnas `decimal` viajan como `string` en todo el motor —
// nunca se convierten a `number` de JS. Es responsabilidad del orquestador
// del proyecto pasarlas intactas al `service.crear*` correspondiente.

export type TipoColumna =
  | 'texto' // string simple
  | 'textoLargo' // string largo (direcciones, descripciones extensas)
  | 'entero' // Int (cantidades sin naturaleza monetaria: RN-DIN-01)
  | 'decimal' // Decimal — se transporta como string, NUNCA number
  | 'booleanSiNo' // "SI"/"NO" -> boolean (NUNCA z.coerce.boolean)
  | 'enum' // valor de una lista cerrada (`enumValores`)
  | 'fk' // código que referencia otra hoja o un maestro ya existente (`fk`)
  | 'fkMulti' // varios códigos de FK, separados por coma -> string[] (N:N)
  | 'listaControl' // lista separada por coma -> string[] libre

export interface ColumnaSpec {
  /** Texto EXACTO del encabezado en la hoja (contrato con el archivo del cliente). */
  encabezado: string
  /** Campo del modelo destino. Omitir para columnas de referencia sin mapeo. */
  campo?: string
  tipo: TipoColumna
  /** Celda obligatoria (se pinta en el template y se valida al cargar). */
  requerido?: boolean
  /** Valores válidos para `enum` (también alimenta el dropdown). */
  enumValores?: string[]
  /** Referencia a otra hoja (FK interna) o a un maestro ya existente en BD. Aplica a `fk` y `fkMulti`. */
  fk?: {
    /** Nombre de la hoja de la que sale el código (FK interna). */
    hoja?: string
    /**
     * `true` = el maestro YA DEBE EXISTIR en BD, no se crea en este archivo
     * (ej. Comuna, Región).
     */
    externo?: boolean
    /**
     * Clave de modelo contra la que el cargador resuelve el código -> id
     * (ej. 'comuna', 'zona'). En FKs internas se puede derivar del `modelo`
     * de la hoja referenciada; en externas es obligatoria.
     */
    modelo?: string
  }
  /**
   * Columna de código propio del registro: si viene vacía, el motor la
   * autogenera vía el correlativo del maestro (`shared/correlativos.ts`).
   * Marca la columna como opcional en el template. Solo aplica a maestros
   * con correlativo real (Cliente/Proveedor/Servicio) — el resto exige
   * código manual.
   */
  autogenerar?: boolean
  /** Texto de ayuda (comentario de celda en el encabezado). */
  ayuda?: string
}

export interface HojaSpec {
  /** Nombre de la pestaña. El motor lo usa para saber qué maestro es. */
  hoja: string
  /**
   * Clave de modelo para el binding del cargador (ej. 'cliente', 'proveedor').
   * Omitir en hojas de solo-referencia.
   */
  modelo?: string
  /** Título humano de la hoja para la sección de instrucciones. */
  titulo: string
  descripcion: string
  /** Hojas de las que depende (para orden topológico de carga). */
  dependeDe: string[]
  /**
   * `false` = el código NO es único por hoja sino por un padre. Desactiva la
   * detección de código duplicado dentro de la hoja. Default: true.
   */
  codigoUnicoGlobal?: boolean
  /**
   * `true` = hoja de SOLO REFERENCIA: el generador la llena con datos de la BD
   * (maestros ya existentes) para que el usuario copie los códigos en las
   * hojas de datos; el cargador la IGNORA (no crea registros desde ella).
   */
  soloReferencia?: boolean
  columnas: ColumnaSpec[]
}

/** Un error concreto, ubicable en el archivo. */
export interface ErrorFila {
  hoja: string
  /** Fila 1-based tal como la ve el usuario en Excel (la 1 es el encabezado). */
  fila: number
  columna?: string
  codigo: string // slug estable: FALTA_REQUERIDO, FK_NO_RESUELTA, ENUM_INVALIDO...
  mensaje: string
}

/** Fila ya parseada y coaccionada a tipos JS (antes de resolver FKs a ids). */
export interface FilaParseada {
  /** Fila 1-based en Excel. */
  fila: number
  /** Valores por `campo` (o por encabezado si no hay campo). */
  valores: Record<string, unknown>
}

export interface ResultadoHoja {
  hoja: string
  filas: FilaParseada[]
  errores: ErrorFila[]
}

export interface ResultadoParseo {
  hojas: Record<string, ResultadoHoja>
  errores: ErrorFila[] // errores globales (hoja faltante, encabezado cambiado)
}
