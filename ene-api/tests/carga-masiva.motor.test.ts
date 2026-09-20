import { describe, it, expect } from 'vitest'
import ExcelJS from 'exceljs'
import { parsearLibro, validarReferenciasInternas, construirCodigosPorHoja } from '../src/shared/carga-masiva/parsear.js'
import { generarTemplate } from '../src/shared/carga-masiva/generar-template.js'
import { generarReporteErrores } from '../src/shared/carga-masiva/reporte-errores.js'
import type { ErrorFila, HojaSpec } from '../src/shared/carga-masiva/tipos.js'
import { REGISTRO_MAESTROS, ordenTopologico } from '../src/modules/config/carga-masiva/registro.js'

// ============================================================================
// Motor de Carga Masiva — núcleo portable `shared/carga-masiva/*` (Docs/
// mantenedores.md §10, extensión 17-sep-2026, RN-CAR-03/04/05). Pruebas puras
// del parseo/generación de Excel: no tocan la BD. La orquestación contra la
// BD real (`cargarMaestros`) se cubre en `carga-masiva.test.ts`.
// ============================================================================

/** Construye un libro Excel en memoria a partir de hojas + filas indexadas por `campo`. */
async function libro(hojas: HojaSpec[], datos: Record<string, Array<Record<string, unknown>>> = {}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  for (const hoja of hojas) {
    const ws = wb.addWorksheet(hoja.hoja)
    hoja.columnas.forEach((col, i) => {
      ws.getCell(1, i + 1).value = col.encabezado
    })
    ;(datos[hoja.hoja] ?? []).forEach((fila, r) => {
      hoja.columnas.forEach((col, i) => {
        if (!col.campo) return
        const v = fila[col.campo]
        if (v !== undefined) ws.getCell(r + 2, i + 1).value = v as ExcelJS.CellValue
      })
    })
  }
  return Buffer.from(await wb.xlsx.writeBuffer())
}

const HOJA_ZONA: HojaSpec = {
  hoja: 'Zonas',
  modelo: 'zona',
  titulo: 'Zonas',
  descripcion: 'x',
  dependeDe: [],
  columnas: [
    { encabezado: 'Código', campo: 'codigo', tipo: 'texto', requerido: true },
    { encabezado: 'Nombre', campo: 'nombre', tipo: 'texto', requerido: true },
    { encabezado: 'Nombre (inglés)', campo: 'nombreEn', tipo: 'texto' },
  ],
}

function buscar(errores: ErrorFila[], codigo: string) {
  return errores.filter((e) => e.codigo === codigo)
}

describe('parsearLibro: coacción de tipos', () => {
  it('coacciona texto y descarta filas totalmente vacías', async () => {
    const buf = await libro([HOJA_ZONA], { Zonas: [{ codigo: 'Z1', nombre: 'Zona Uno' }, {}, { codigo: 'Z2', nombre: 'Zona Dos' }] })
    const parseo = await parsearLibro(buf, [HOJA_ZONA])
    expect(parseo.hojas.Zonas.filas).toHaveLength(2)
    expect(parseo.hojas.Zonas.filas[0]?.valores).toMatchObject({ codigo: 'Z1', nombre: 'Zona Uno' })
  })

  it('una fila en blanco en medio de la hoja no trunca las filas posteriores (regresión: ws.actualRowCount cuenta filas con datos, no el último índice — hay que usar ws.rowCount)', async () => {
    const buf = await libro([HOJA_ZONA], { Zonas: [{ codigo: 'Z1', nombre: 'Zona Uno' }, {}, { codigo: 'Z2', nombre: 'Zona Dos' }] })
    const parseo = await parsearLibro(buf, [HOJA_ZONA])
    expect(parseo.hojas.Zonas.filas.map((f) => f.valores.codigo)).toEqual(['Z1', 'Z2'])
  })

  it('FALTA_REQUERIDO cuando una celda obligatoria viene vacía', async () => {
    const buf = await libro([HOJA_ZONA], { Zonas: [{ codigo: 'Z1' }] })
    const parseo = await parsearLibro(buf, [HOJA_ZONA])
    expect(buscar(parseo.hojas.Zonas.errores, 'FALTA_REQUERIDO')).toHaveLength(1)
  })

  it('ENCABEZADO_FALTANTE cuando falta una columna obligatoria completa', async () => {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Zonas')
    ws.getCell('A1').value = 'Código' // falta "Nombre", que es requerida
    ws.getCell('A2').value = 'Z1'
    const buf = Buffer.from(await wb.xlsx.writeBuffer())
    const parseo = await parsearLibro(buf, [HOJA_ZONA])
    expect(buscar(parseo.errores, 'ENCABEZADO_FALTANTE')).toHaveLength(1)
  })

  it('HOJA_FALTANTE cuando el archivo no trae la pestaña esperada', async () => {
    const buf = await libro([])
    const parseo = await parsearLibro(buf, [HOJA_ZONA])
    expect(buscar(parseo.errores, 'HOJA_FALTANTE')).toHaveLength(1)
  })

  it('tolera reordenar las columnas del encabezado', async () => {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Zonas')
    // Orden invertido respecto a HOJA_ZONA.columnas.
    ws.getCell('A1').value = 'Nombre'
    ws.getCell('B1').value = 'Código'
    ws.getCell('A2').value = 'Zona Uno'
    ws.getCell('B2').value = 'Z1'
    const buf = Buffer.from(await wb.xlsx.writeBuffer())
    const parseo = await parsearLibro(buf, [HOJA_ZONA])
    expect(parseo.hojas.Zonas.errores).toHaveLength(0)
    expect(parseo.hojas.Zonas.filas[0]?.valores).toMatchObject({ codigo: 'Z1', nombre: 'Zona Uno' })
  })

  it('RN-DIN-01: una columna decimal se devuelve como string, nunca number', async () => {
    const hoja: HojaSpec = {
      ...HOJA_ZONA,
      hoja: 'Decimales',
      columnas: [
        { encabezado: 'Código', campo: 'codigo', tipo: 'texto', requerido: true },
        { encabezado: 'Valor', campo: 'valor', tipo: 'decimal', requerido: true },
      ],
    }
    const buf = await libro([hoja], { Decimales: [{ codigo: 'D1', valor: '33,33' }, { codigo: 'D2', valor: 'abc' }] })
    const parseo = await parsearLibro(buf, [hoja])
    const fila1 = parseo.hojas.Decimales.filas.find((f) => f.valores.codigo === 'D1')
    expect(fila1?.valores.valor).toBe('33.33')
    expect(typeof fila1?.valores.valor).toBe('string')
    expect(buscar(parseo.hojas.Decimales.errores, 'TIPO_INVALIDO')).toHaveLength(1)
  })

  it('entero rechaza valores no enteros', async () => {
    const hoja: HojaSpec = {
      ...HOJA_ZONA,
      hoja: 'Enteros',
      columnas: [{ encabezado: 'Cantidad', campo: 'cantidad', tipo: 'entero', requerido: true }],
    }
    const buf = await libro([hoja], { Enteros: [{ cantidad: '3.5' }] })
    const parseo = await parsearLibro(buf, [hoja])
    expect(buscar(parseo.hojas.Enteros.errores, 'TIPO_INVALIDO')).toHaveLength(1)
  })

  it('booleanSiNo acepta variantes de SI/NO y rechaza el resto', async () => {
    const hoja: HojaSpec = {
      ...HOJA_ZONA,
      hoja: 'Booleanos',
      columnas: [{ encabezado: 'Activo', campo: 'activo', tipo: 'booleanSiNo' }],
    }
    const buf = await libro([hoja], { Booleanos: [{ activo: 'si' }, { activo: 'NO' }, { activo: 'tal vez' }] })
    const parseo = await parsearLibro(buf, [hoja])
    expect(parseo.hojas.Booleanos.filas[0]?.valores.activo).toBe(true)
    expect(parseo.hojas.Booleanos.filas[1]?.valores.activo).toBe(false)
    expect(buscar(parseo.hojas.Booleanos.errores, 'BOOLEAN_INVALIDO')).toHaveLength(1)
  })

  it('enum rechaza valores fuera de la lista permitida', async () => {
    const hoja: HojaSpec = {
      ...HOJA_ZONA,
      hoja: 'Enums',
      columnas: [{ encabezado: 'Tipo', campo: 'tipo', tipo: 'enum', enumValores: ['A', 'B'] }],
    }
    const buf = await libro([hoja], { Enums: [{ tipo: 'C' }] })
    const parseo = await parsearLibro(buf, [hoja])
    expect(buscar(parseo.hojas.Enums.errores, 'ENUM_INVALIDO')).toHaveLength(1)
  })

  it('fkMulti/listaControl separa por coma o punto y coma, sin espacios sobrantes', async () => {
    const hoja: HojaSpec = {
      ...HOJA_ZONA,
      hoja: 'Multi',
      columnas: [{ encabezado: 'Códigos', campo: 'codigos', tipo: 'fkMulti' }],
    }
    const buf = await libro([hoja], { Multi: [{ codigos: ' A , B ; C' }] })
    const parseo = await parsearLibro(buf, [hoja])
    expect(parseo.hojas.Multi.filas[0]?.valores.codigos).toEqual(['A', 'B', 'C'])
  })
})

describe('validarReferenciasInternas', () => {
  const HOJA_PADRE: HojaSpec = {
    hoja: 'Padres',
    titulo: 'Padres',
    descripcion: 'x',
    dependeDe: [],
    columnas: [{ encabezado: 'Código', campo: 'codigo', tipo: 'texto', requerido: true }],
  }
  const HOJA_HIJA: HojaSpec = {
    hoja: 'Hijas',
    titulo: 'Hijas',
    descripcion: 'x',
    dependeDe: ['Padres'],
    codigoUnicoGlobal: false,
    columnas: [{ encabezado: 'Padre (código)', campo: 'padreCodigo', tipo: 'fk', requerido: true, fk: { hoja: 'Padres' } }],
  }

  it('CODIGO_DUPLICADO cuando el código se repite dentro de una hoja con codigoUnicoGlobal', async () => {
    const buf = await libro([HOJA_PADRE], { Padres: [{ codigo: 'P1' }, { codigo: 'P1' }] })
    const parseo = await parsearLibro(buf, [HOJA_PADRE])
    const errores = validarReferenciasInternas(parseo, [HOJA_PADRE])
    expect(buscar(errores, 'CODIGO_DUPLICADO')).toHaveLength(1)
  })

  it('no marca duplicado cuando codigoUnicoGlobal es false (código único por padre, no por hoja)', async () => {
    const buf = await libro([HOJA_PADRE, HOJA_HIJA], {
      Padres: [{ codigo: 'P1' }],
      Hijas: [{ padreCodigo: 'P1' }, { padreCodigo: 'P1' }],
    })
    const parseo = await parsearLibro(buf, [HOJA_PADRE, HOJA_HIJA])
    const errores = validarReferenciasInternas(parseo, [HOJA_PADRE, HOJA_HIJA])
    expect(buscar(errores, 'CODIGO_DUPLICADO')).toHaveLength(0)
  })

  it('FK_NO_RESUELTA cuando una fk interna referencia un código inexistente en la hoja de origen', async () => {
    const buf = await libro([HOJA_PADRE, HOJA_HIJA], { Padres: [{ codigo: 'P1' }], Hijas: [{ padreCodigo: 'NO_EXISTE' }] })
    const parseo = await parsearLibro(buf, [HOJA_PADRE, HOJA_HIJA])
    const errores = validarReferenciasInternas(parseo, [HOJA_PADRE, HOJA_HIJA])
    expect(buscar(errores, 'FK_NO_RESUELTA')).toHaveLength(1)
  })

  it('resuelve sin error cuando el código de la fk interna sí existe en el archivo', async () => {
    const buf = await libro([HOJA_PADRE, HOJA_HIJA], { Padres: [{ codigo: 'P1' }], Hijas: [{ padreCodigo: 'P1' }] })
    const parseo = await parsearLibro(buf, [HOJA_PADRE, HOJA_HIJA])
    const errores = validarReferenciasInternas(parseo, [HOJA_PADRE, HOJA_HIJA])
    expect(errores).toHaveLength(0)
  })

  it('una fk marcada `externo` no se valida acá (se resuelve contra la BD al commit)', async () => {
    const hojaHijaExterna: HojaSpec = {
      ...HOJA_HIJA,
      columnas: [{ encabezado: 'Padre (código)', campo: 'padreCodigo', tipo: 'fk', requerido: true, fk: { hoja: 'Padres', externo: true, modelo: 'padre' } }],
    }
    const buf = await libro([HOJA_PADRE, hojaHijaExterna], { Padres: [{ codigo: 'P1' }], Hijas: [{ padreCodigo: 'NO_EXISTE_TODAVIA' }] })
    const parseo = await parsearLibro(buf, [HOJA_PADRE, hojaHijaExterna])
    const errores = validarReferenciasInternas(parseo, [HOJA_PADRE, hojaHijaExterna])
    expect(buscar(errores, 'FK_NO_RESUELTA')).toHaveLength(0)
  })

  it('construirCodigosPorHoja indexa los códigos declarados en el archivo, aunque no se le pase explícito a validarReferenciasInternas', async () => {
    const buf = await libro([HOJA_PADRE], { Padres: [{ codigo: 'P1' }, { codigo: 'P2' }] })
    const parseo = await parsearLibro(buf, [HOJA_PADRE])
    const codigos = construirCodigosPorHoja(parseo, [HOJA_PADRE])
    expect([...codigos.Padres]).toEqual(['P1', 'P2'])
  })
})

describe('generarTemplate', () => {
  it('produce Instrucciones, ListasFijas (oculta) y una hoja por maestro', async () => {
    const buffer = await generarTemplate([HOJA_ZONA], { listasEnum: {} })
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buffer)
    expect(wb.getWorksheet('Instrucciones')).toBeDefined()
    const listas = wb.getWorksheet('ListasFijas')
    expect(listas).toBeDefined()
    expect(listas!.state).toBe('veryHidden')
    const ws = wb.getWorksheet('Zonas')
    expect(ws).toBeDefined()
    expect(ws!.getCell('A1').value).toBe('Código')
    expect(ws!.getCell('B1').value).toBe('Nombre')
  })

  it('precarga datos en hojas de solo-referencia y no les aplica validaciones', async () => {
    const hojaReferencia: HojaSpec = {
      hoja: 'Referencia',
      titulo: 'Referencia',
      descripcion: 'x',
      dependeDe: [],
      soloReferencia: true,
      columnas: [
        { encabezado: 'Código', campo: 'codigo', tipo: 'texto' },
        { encabezado: 'Nombre', campo: 'nombre', tipo: 'texto' },
      ],
    }
    const buffer = await generarTemplate([hojaReferencia], {
      listasEnum: {},
      datosPorHoja: { Referencia: [{ codigo: 'R1', nombre: 'Ref Uno' }] },
    })
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buffer)
    const ws = wb.getWorksheet('Referencia')!
    expect(ws.getCell('A2').value).toBe('R1')
    expect(ws.getCell('B2').value).toBe('Ref Uno')
  })

  it('el registro real (REGISTRO_MAESTROS) genera un template sin lanzar', async () => {
    const buffer = await generarTemplate(REGISTRO_MAESTROS, {
      listasEnum: { TipoCliente: ['AGENCIA', 'EMPRESA'] },
      datosPorHoja: { Regiones: [], Provincias: [], Comunas: [] },
    })
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buffer)
    for (const hoja of REGISTRO_MAESTROS) expect(wb.getWorksheet(hoja.hoja)).toBeDefined()
  })
})

describe('generarReporteErrores', () => {
  it('arma Resumen (conteo por hoja) y Errores (detalle) a partir de la lista de errores', async () => {
    const errores: ErrorFila[] = [
      { hoja: 'Zonas', fila: 2, columna: 'Nombre', codigo: 'FALTA_REQUERIDO', mensaje: 'x' },
      { hoja: 'Zonas', fila: 3, columna: 'Nombre', codigo: 'FALTA_REQUERIDO', mensaje: 'y' },
      { hoja: 'Clientes', fila: 2, codigo: 'RUT_INVALIDO', mensaje: 'z' },
    ]
    const buffer = await generarReporteErrores(errores)
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buffer)
    const resumen = wb.getWorksheet('Resumen')!
    expect(resumen.getCell('A2').value).toBe('Zonas')
    expect(resumen.getCell('B2').value).toBe(2)
    expect(resumen.getCell('A4').value).toBe('TOTAL')
    expect(resumen.getCell('B4').value).toBe(3)

    const detalle = wb.getWorksheet('Errores')!
    expect(detalle.actualRowCount).toBe(4) // encabezado + 3 errores
  })
})

describe('ordenTopologico', () => {
  it('respeta las dependencias declaradas: un padre siempre aparece antes que su hija', () => {
    const orden = ordenTopologico(REGISTRO_MAESTROS).map((h) => h.hoja)
    expect(orden.indexOf('Paises')).toBeLessThan(orden.indexOf('Clientes'))
    expect(orden.indexOf('Clientes')).toBeLessThan(orden.indexOf('ClientesDirecciones'))
    expect(orden.indexOf('CondicionesPago')).toBeLessThan(orden.indexOf('CondicionesPagoCuotas'))
    expect(orden.indexOf('TiposServicio')).toBeLessThan(orden.indexOf('Proveedores'))
  })

  it('lanza al detectar una dependencia circular', () => {
    const a: HojaSpec = { hoja: 'A', titulo: 'A', descripcion: 'x', dependeDe: ['B'], columnas: [] }
    const b: HojaSpec = { hoja: 'B', titulo: 'B', descripcion: 'x', dependeDe: ['A'], columnas: [] }
    expect(() => ordenTopologico([a, b])).toThrow(/circular/i)
  })
})
