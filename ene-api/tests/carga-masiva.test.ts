import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import ExcelJS from 'exceljs'
import { cargarMaestros } from '../src/modules/config/carga-masiva/carga-masiva.service.js'
import { REGISTRO_MAESTROS } from '../src/modules/config/carga-masiva/registro.js'
import type { ErrorFila, HojaSpec } from '../src/shared/carga-masiva/tipos.js'

// ============================================================================
// Carga Masiva — orquestador `cargarMaestros` (Docs/mantenedores.md §10,
// extensión 17-sep-2026). RN-CAR-03 (dry-run detecta lo mismo que el
// commit, sin escribir), RN-CAR-04 (carga parcial, no atómica), RN-CAR-05
// ("Validar" es opcional), más las reglas de cada maestro heredadas del alta
// manual (RN-CLI-01, RN-COR-01, RN-PRV-01/03, RN-GEO-02, RN-PAG-02) tal como
// las ejercita el motor de carga. El parseo/generación de Excel puros se
// prueban aparte en `carga-masiva.motor.test.ts`.
// ============================================================================

try {
  process.loadEnvFile()
} catch {
  // .env ya cargado o inexistente.
}

const prisma = new PrismaClient()
let chileCodigo: string
let comunaCodigo: string
let comunaRef: { codigo: string; nombre: string; provinciaCodigo: string }

beforeAll(async () => {
  chileCodigo = (await prisma.pais.findUniqueOrThrow({ where: { codigo: 'CHL' } })).codigo
  const comuna = await prisma.comuna.findFirstOrThrow({ include: { provincia: true } })
  comunaCodigo = comuna.codigo
  comunaRef = { codigo: comuna.codigo, nombre: comuna.nombre, provinciaCodigo: comuna.provincia.codigo }
})

afterAll(async () => {
  const clientes = await prisma.cliente.findMany({ where: { OR: [{ codigo: { startsWith: 'QACM' } }, { razonSocial: { startsWith: 'QACM' } }] } })
  const clienteIds = clientes.map((c) => c.id)
  await prisma.clienteEjecutivo.deleteMany({ where: { clienteId: { in: clienteIds } } }).catch(() => {})
  await prisma.clienteDireccion.deleteMany({ where: { clienteId: { in: clienteIds } } }).catch(() => {})
  await prisma.cliente.deleteMany({ where: { id: { in: clienteIds } } }).catch(() => {})

  const proveedores = await prisma.proveedor.findMany({ where: { OR: [{ codigo: { startsWith: 'QACM' } }, { razonSocial: { startsWith: 'QACM' } }] } })
  // Alias/cuentas/contactos/direcciones/zonas/tiposServicio del proveedor cascadean por FK.
  await prisma.proveedor.deleteMany({ where: { id: { in: proveedores.map((p) => p.id) } } }).catch(() => {})

  await prisma.servicio.deleteMany({ where: { OR: [{ codigo: { startsWith: 'QACM' } }, { nombre: { startsWith: 'QACM' } }] } }).catch(() => {})
  await prisma.condicionPago.deleteMany({ where: { codigo: { startsWith: 'QACM' } } }).catch(() => {}) // cascadea CondicionPagoCuota
  await prisma.zona.deleteMany({ where: { codigo: { startsWith: 'QACM' } } }).catch(() => {})
  await prisma.$disconnect()
})

/** Construye el libro completo (todas las hojas de REGISTRO_MAESTROS, para no
 * disparar HOJA_FALTANTE) con datos solo en las hojas que cada test necesita. */
async function libro(datos: Record<string, Array<Record<string, unknown>>>, hojas: HojaSpec[] = REGISTRO_MAESTROS): Promise<Buffer> {
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

function buscar(errores: ErrorFila[], hoja: string, codigo: string) {
  return errores.filter((e) => e.hoja === hoja && e.codigo === codigo)
}

describe('RN-CAR-03: "Validar" (dry-run) detecta los mismos errores que el commit, sin escribir en la base', () => {
  it('dry-run no persiste ninguna fila; el commit del mismo archivo crea solo la válida', async () => {
    const buf = await libro({
      Zonas: [
        { codigo: 'QACM-Z1', nombre: 'Zona QACM Uno' },
        { codigo: 'QACM-Z2' }, // falta "Nombre", requerido
      ],
    })

    const validado = await cargarMaestros(buf, { dryRun: true })
    expect(validado.resumen.Zonas).toMatchObject({ filas: 2, creados: 0 })
    expect(buscar(validado.errores, 'Zonas', 'FALTA_REQUERIDO')).toHaveLength(1)
    expect(await prisma.zona.findUnique({ where: { codigo: 'QACM-Z1' } })).toBeNull()

    const confirmado = await cargarMaestros(buf, { dryRun: false, creadoPor: 'test' })
    expect(confirmado.resumen.Zonas).toMatchObject({ filas: 2, creados: 1 })
    expect(buscar(confirmado.errores, 'Zonas', 'FALTA_REQUERIDO')).toHaveLength(1)
    expect(await prisma.zona.findUnique({ where: { codigo: 'QACM-Z1' } })).not.toBeNull()
  })

  it('CODIGO_DUPLICADO: rechaza reutilizar el código de un maestro ya sembrado', async () => {
    const buf = await libro({ Zonas: [{ codigo: 'ARI', nombre: 'Reintento QACM' }] })
    const resultado = await cargarMaestros(buf, { dryRun: false, creadoPor: 'test' })
    expect(buscar(resultado.errores, 'Zonas', 'CODIGO_DUPLICADO')).toHaveLength(1)
    expect(resultado.resumen.Zonas.creados).toBe(0)
  })
})

describe('RN-CAR-04: la carga es parcial (no atómica) — RN-CAR-05: "Validar" no es prerrequisito de confirmar', () => {
  it('RN-CLI-01: un Cliente EMPRESA sin RUT queda reportado sin bloquear las demás filas del archivo, confirmando directo sin dry-run previo', async () => {
    const buf = await libro({
      Clientes: [
        { codigo: 'QACM-CL-A', tipo: 'EMPRESA', razonSocial: 'QACM Empresa A', rut: '20.111.222-2', paisId: chileCodigo },
        { codigo: 'QACM-CL-B', tipo: 'EMPRESA', razonSocial: 'QACM Empresa B', paisId: chileCodigo }, // sin rut
      ],
    })

    const resultado = await cargarMaestros(buf, { dryRun: false, creadoPor: 'test' })
    expect(resultado.resumen.Clientes).toMatchObject({ filas: 2, creados: 1 })
    expect(buscar(resultado.errores, 'Clientes', 'RUT_REQUERIDO')).toHaveLength(1)
    expect(await prisma.cliente.findUnique({ where: { codigo: 'QACM-CL-A' } })).not.toBeNull()
    expect(await prisma.cliente.findUnique({ where: { codigo: 'QACM-CL-B' } })).toBeNull()
  })
})

describe('RN-COR-01 vía Carga Masiva: autogeneración de código', () => {
  it('dos clientes sin código en el mismo archivo reciben códigos autogenerados distintos', async () => {
    const buf = await libro({
      Clientes: [
        { tipo: 'AGENCIA', razonSocial: 'QACM Autogen Uno', paisId: chileCodigo },
        { tipo: 'AGENCIA', razonSocial: 'QACM Autogen Dos', paisId: chileCodigo },
      ],
    })
    const resultado = await cargarMaestros(buf, { dryRun: false, creadoPor: 'test' })
    expect(resultado.resumen.Clientes.creados).toBe(2)

    const creados = await prisma.cliente.findMany({ where: { razonSocial: { startsWith: 'QACM Autogen' } }, orderBy: { id: 'asc' } })
    expect(creados).toHaveLength(2)
    expect(creados[0]!.codigo).not.toBe(creados[1]!.codigo)
    expect(creados[0]!.codigo).toMatch(/^CL\d+$/)
  })
})

describe('FK contra una fila anterior del mismo archivo + RN-GEO-02 (comuna obligatoria si Chile)', () => {
  it('ClientesDirecciones referencia un cliente de la misma hoja: dry-run resuelve virtual, commit resuelve real; la fila sin comuna queda bloqueada', async () => {
    const buf = await libro({
      Clientes: [{ codigo: 'QACM-CL-DIR', tipo: 'AGENCIA', razonSocial: 'QACM Cliente Direcciones', paisId: chileCodigo }],
      Comunas: [comunaRef],
      ClientesDirecciones: [
        { clienteId: 'QACM-CL-DIR', etiqueta: 'Oficina', paisId: chileCodigo, direccion: 'Calle Uno 100' }, // sin comuna
        { clienteId: 'QACM-CL-DIR', etiqueta: 'Bodega', paisId: chileCodigo, comunaId: comunaCodigo, direccion: 'Calle Dos 200' },
      ],
    })

    const validado = await cargarMaestros(buf, { dryRun: true })
    expect(buscar(validado.errores, 'ClientesDirecciones', 'FK_NO_RESUELTA')).toHaveLength(0)
    expect(buscar(validado.errores, 'ClientesDirecciones', 'VALIDACION_INVALIDA')).toHaveLength(1)
    expect(validado.resumen.ClientesDirecciones).toMatchObject({ filas: 2, creados: 0 })

    const confirmado = await cargarMaestros(buf, { dryRun: false, creadoPor: 'test' })
    expect(confirmado.resumen.Clientes.creados).toBe(1)
    expect(confirmado.resumen.ClientesDirecciones).toMatchObject({ filas: 2, creados: 1 })
    expect(buscar(confirmado.errores, 'ClientesDirecciones', 'VALIDACION_INVALIDA')).toHaveLength(1)

    const cliente = await prisma.cliente.findUniqueOrThrow({ where: { codigo: 'QACM-CL-DIR' } })
    const direcciones = await prisma.clienteDireccion.findMany({ where: { clienteId: cliente.id } })
    expect(direcciones).toHaveLength(1)
    expect(direcciones[0]!.etiqueta).toBe('Bodega')
  })
})

describe('ClientesEjecutivos: subfilas anidadas por código de cliente', () => {
  it('crea el cliente junto con los ejecutivos declarados en su hoja hija', async () => {
    const buf = await libro({
      Clientes: [{ codigo: 'QACM-CL-EJE', tipo: 'AGENCIA', razonSocial: 'QACM Cliente Ejecutivos', paisId: chileCodigo }],
      ClientesEjecutivos: [
        { clienteCodigo: 'QACM-CL-EJE', nombre: 'Ejecutivo QACM Uno' },
        { clienteCodigo: 'QACM-CL-EJE', nombre: 'Ejecutivo QACM Dos' },
      ],
    })
    const resultado = await cargarMaestros(buf, { dryRun: false, creadoPor: 'test' })
    expect(resultado.resumen.ClientesEjecutivos).toMatchObject({ filas: 2, creados: 2 })

    const cliente = await prisma.cliente.findUniqueOrThrow({ where: { codigo: 'QACM-CL-EJE' } })
    const ejecutivos = await prisma.clienteEjecutivo.findMany({ where: { clienteId: cliente.id } })
    expect(ejecutivos.map((e) => e.nombre).sort()).toEqual(['Ejecutivo QACM Dos', 'Ejecutivo QACM Uno'])
  })
})

describe('RN-PRV-01/RN-PRV-03 vía Carga Masiva: RUT y alias colisionando dentro del mismo archivo', () => {
  it('rechaza un RUT chileno inválido', async () => {
    const buf = await libro({
      Proveedores: [{ codigo: 'QACM-PR-INV', razonSocial: 'QACM Prov RUT Inválido', rut: '11111111-9', tiposServicio: 'ALOJAMIENTO' }],
    })
    const resultado = await cargarMaestros(buf, { dryRun: false, creadoPor: 'test' })
    expect(buscar(resultado.errores, 'Proveedores', 'RUT_INVALIDO')).toHaveLength(1)
    expect(await prisma.proveedor.findUnique({ where: { codigo: 'QACM-PR-INV' } })).toBeNull()
  })

  it('un RUT repetido entre dos filas del mismo archivo: la primera se crea, la segunda queda RUT_DUPLICADO', async () => {
    const buf = await libro({
      Proveedores: [
        { codigo: 'QACM-PR-A', razonSocial: 'QACM Prov A', rut: '20.111.333-4', tiposServicio: 'ALOJAMIENTO' },
        { codigo: 'QACM-PR-B', razonSocial: 'QACM Prov B', rut: '20.111.333-4', tiposServicio: 'ALOJAMIENTO' },
      ],
    })
    const resultado = await cargarMaestros(buf, { dryRun: false, creadoPor: 'test' })
    expect(resultado.resumen.Proveedores.creados).toBe(1)
    expect(buscar(resultado.errores, 'Proveedores', 'RUT_DUPLICADO')).toHaveLength(1)
    expect(await prisma.proveedor.findUnique({ where: { codigo: 'QACM-PR-A' } })).not.toBeNull()
    expect(await prisma.proveedor.findUnique({ where: { codigo: 'QACM-PR-B' } })).toBeNull()
  })

  it('RN-PRV-01: el RUT genérico puede repetirse entre proveedores distintos del mismo archivo', async () => {
    const buf = await libro({
      Proveedores: [
        { codigo: 'QACM-PR-C', razonSocial: 'QACM Prov C', rut: '55.555.555-5', tiposServicio: 'ALOJAMIENTO' },
        { codigo: 'QACM-PR-D', razonSocial: 'QACM Prov D', rut: '55.555.555-5', tiposServicio: 'ALOJAMIENTO' },
      ],
    })
    const resultado = await cargarMaestros(buf, { dryRun: false, creadoPor: 'test' })
    expect(resultado.resumen.Proveedores.creados).toBe(2)
  })

  it('un alias repetido entre dos proveedores del mismo archivo bloquea la fila completa del segundo (no solo el alias)', async () => {
    const buf = await libro({
      Proveedores: [
        { codigo: 'QACM-PR-E', razonSocial: 'QACM Prov E', rut: '20.111.444-6', tiposServicio: 'ALOJAMIENTO' },
        { codigo: 'QACM-PR-F', razonSocial: 'QACM Prov F', rut: '20.111.555-8', tiposServicio: 'ALOJAMIENTO' },
      ],
      ProveedoresAlias: [
        { proveedorCodigo: 'QACM-PR-E', alias: 'QACM Alias Compartido' },
        { proveedorCodigo: 'QACM-PR-F', alias: 'QACM Alias Compartido' },
      ],
    })
    const resultado = await cargarMaestros(buf, { dryRun: false, creadoPor: 'test' })
    expect(resultado.resumen.Proveedores.creados).toBe(1)
    expect(resultado.resumen.ProveedoresAlias.creados).toBe(1)
    expect(buscar(resultado.errores, 'Proveedores', 'ALIAS_DUPLICADO')).toHaveLength(1)
    expect(await prisma.proveedor.findUnique({ where: { codigo: 'QACM-PR-E' } })).not.toBeNull()
    expect(await prisma.proveedor.findUnique({ where: { codigo: 'QACM-PR-F' } })).toBeNull()
  })
})

describe('Servicios: FK externo contra maestros ya sembrados + RN-DIN-01 (decimal como string)', () => {
  it('crea el servicio referenciando Zona y TipoServicio por código, con el margen decimal intacto', async () => {
    const buf = await libro({
      Servicios: [
        {
          nombre: 'QACM Servicio Uno',
          tipoServicioId: 'ALOJAMIENTO',
          zonaId: 'ARI',
          modeloTarifa: 'ACOMODACION',
          margenSugerido: '0.4500',
        },
      ],
    })
    const resultado = await cargarMaestros(buf, { dryRun: false, creadoPor: 'test' })
    expect(resultado.resumen.Servicios.creados).toBe(1)

    const [zona, tipoServicio] = await Promise.all([
      prisma.zona.findUniqueOrThrow({ where: { codigo: 'ARI' } }),
      prisma.tipoServicio.findUniqueOrThrow({ where: { codigo: 'ALOJAMIENTO' } }),
    ])
    const servicio = await prisma.servicio.findFirstOrThrow({ where: { nombre: 'QACM Servicio Uno' } })
    expect(servicio.zonaId).toBe(zona.id)
    expect(servicio.tipoServicioId).toBe(tipoServicio.id)
    expect(servicio.margenSugerido.toString()).toBe('0.45')
  })
})

describe('RN-PAG-02 vía Carga Masiva: las cuotas de una Condición de Pago deben sumar 100%', () => {
  it('crea la condición cuando las cuotas suman exactamente 100%', async () => {
    const buf = await libro({
      CondicionesPago: [{ codigo: 'QACM-CP-1', nombre: 'QACM Condición Uno' }],
      CondicionesPagoCuotas: [
        { condicionPagoCodigo: 'QACM-CP-1', porcentaje: '50', plazoDias: '30' },
        { condicionPagoCodigo: 'QACM-CP-1', porcentaje: '50', plazoDias: '60' },
      ],
    })
    const resultado = await cargarMaestros(buf, { dryRun: false, creadoPor: 'test' })
    expect(resultado.resumen.CondicionesPago.creados).toBe(1)
    expect(resultado.resumen.CondicionesPagoCuotas.creados).toBe(2)
  })

  it('rechaza la condición completa cuando las cuotas no suman 100%', async () => {
    const buf = await libro({
      CondicionesPago: [{ codigo: 'QACM-CP-2', nombre: 'QACM Condición Dos' }],
      CondicionesPagoCuotas: [{ condicionPagoCodigo: 'QACM-CP-2', porcentaje: '50', plazoDias: '30' }],
    })
    const resultado = await cargarMaestros(buf, { dryRun: false, creadoPor: 'test' })
    expect(resultado.resumen.CondicionesPago.creados).toBe(0)
    expect(buscar(resultado.errores, 'CondicionesPago', 'VALIDACION_INVALIDA').length).toBeGreaterThan(0)
    expect(await prisma.condicionPago.findUnique({ where: { codigo: 'QACM-CP-2' } })).toBeNull()
  })
})
