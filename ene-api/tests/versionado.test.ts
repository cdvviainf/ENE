import { describe, it, expect } from 'vitest'
import type { Prisma } from '@prisma/client'
import {
  crearSiguienteVersion,
  exigirVersionEditable,
  type Cabecera,
  type Version,
  type Versionable,
} from '../src/shared/versionado/index.js'

// ============================================================================
// Versionado — mecanismo transversal (RN-VER-*). Se prueba la lógica pura del
// orquestador con un Versionable en memoria y una transacción fake: el advisory
// lock (tx.$executeRaw) es un no-op acá; su serialización real (RN-VER-04) se
// prueba con DB en la etapa que tenga los repos concretos.
// ============================================================================

type Datos = { etiqueta?: string }

/// Transacción fake: solo necesita responder al pg_advisory_xact_lock.
const tx = { $executeRaw: async () => 0 } as unknown as Prisma.TransactionClient

class VersionableFake implements Versionable<Cabecera, Version, Datos> {
  readonly lockNamespace = 999999
  readonly entidad = 'Prueba'

  private seq = 0
  readonly cabeceras = new Map<number, Cabecera>([[1, { id: 1, versionVigenteId: null }]])
  readonly versiones: Array<Version & { cabeceraId: number }> = []
  readonly copias: Array<{ desde: number; hacia: number }> = []

  async cargarCabecera(_tx: Prisma.TransactionClient, id: number): Promise<Cabecera | null> {
    return this.cabeceras.get(id) ?? null
  }

  async ultimaVersion(_tx: Prisma.TransactionClient, cabeceraId: number): Promise<number> {
    return this.versiones
      .filter((v) => v.cabeceraId === cabeceraId)
      .reduce((max, v) => Math.max(max, v.version), 0)
  }

  async crearVersion(
    _tx: Prisma.TransactionClient,
    cabeceraId: number,
    numero: number,
    _datos: Datos,
    _usuario: string,
  ): Promise<Version> {
    const v = { id: ++this.seq, version: numero, cabeceraId }
    this.versiones.push(v)
    return v
  }

  async copiarLineas(_tx: Prisma.TransactionClient, desde: number, hacia: number): Promise<void> {
    this.copias.push({ desde, hacia })
  }

  async fijarVigente(_tx: Prisma.TransactionClient, cabeceraId: number, versionId: number): Promise<void> {
    const c = this.cabeceras.get(cabeceraId)
    if (c) c.versionVigenteId = versionId
  }
}

describe('versionado — creación de la primera versión', () => {
  it('numera la v1, no copia líneas y la fija como vigente', async () => {
    const e = new VersionableFake()
    const v1 = await crearSiguienteVersion(tx, e, { cabeceraId: 1, datos: {}, usuario: 'u' })

    expect(v1.version).toBe(1)
    expect(e.copias).toEqual([])
    expect(e.cabeceras.get(1)?.versionVigenteId).toBe(v1.id)
  })

  it('RN-VER-07: toma el advisory lock con el namespace de la entidad y el id de la cabecera', async () => {
    const e = new VersionableFake()
    const locks: unknown[][] = []
    // tx que registra los argumentos de cada pg_advisory_xact_lock.
    const recTx = {
      $executeRaw: async (...args: unknown[]) => {
        locks.push(args)
        return 0
      },
    } as unknown as Prisma.TransactionClient

    await crearSiguienteVersion(recTx, e, { cabeceraId: 1, datos: {}, usuario: 'u' })

    expect(locks).toHaveLength(1)
    // args[0] es el template; [1] namespace, [2] clave (ver tomarLock).
    const [, namespace, clave] = locks[0]
    expect(namespace).toBe(e.lockNamespace)
    expect(clave).toBe(1)
  })
})

describe('versionado — RN-VER-06: motivo obligatorio desde la v2', () => {
  it('rechaza crear la v2 sin motivo', async () => {
    const e = new VersionableFake()
    await crearSiguienteVersion(tx, e, { cabeceraId: 1, datos: {}, usuario: 'u' })

    await expect(
      crearSiguienteVersion(tx, e, { cabeceraId: 1, datos: {}, usuario: 'u' }),
    ).rejects.toThrow(/motivo/i)
  })

  it('rechaza un motivo compuesto solo de espacios', async () => {
    const e = new VersionableFake()
    await crearSiguienteVersion(tx, e, { cabeceraId: 1, datos: {}, usuario: 'u' })

    await expect(
      crearSiguienteVersion(tx, e, { cabeceraId: 1, datos: {}, usuario: 'u', motivo: '   ' }),
    ).rejects.toThrow(/motivo/i)
  })
})

describe('versionado — v2 con motivo copia desde la vigente', () => {
  it('numera la v2, copia las líneas de la v1 y mueve la vigente', async () => {
    const e = new VersionableFake()
    const v1 = await crearSiguienteVersion(tx, e, { cabeceraId: 1, datos: {}, usuario: 'u' })
    const v2 = await crearSiguienteVersion(tx, e, {
      cabeceraId: 1,
      datos: {},
      usuario: 'u',
      motivo: 'ajuste de alcance',
    })

    expect(v2.version).toBe(2)
    expect(e.copias).toEqual([{ desde: v1.id, hacia: v2.id }])
    expect(e.cabeceras.get(1)?.versionVigenteId).toBe(v2.id)
  })

  it('con copiarLineas=false la v2 nace vacía', async () => {
    const e = new VersionableFake()
    await crearSiguienteVersion(tx, e, { cabeceraId: 1, datos: {}, usuario: 'u' })
    await crearSiguienteVersion(tx, e, {
      cabeceraId: 1,
      datos: {},
      usuario: 'u',
      motivo: 'sin copia',
      copiarLineas: false,
    })

    expect(e.copias).toEqual([])
  })
})

describe('versionado — cabecera inexistente', () => {
  it('rechaza crear una versión sobre una cabecera que no existe', async () => {
    const e = new VersionableFake()
    await expect(
      crearSiguienteVersion(tx, e, { cabeceraId: 99, datos: {}, usuario: 'u' }),
    ).rejects.toThrow()
  })
})

// Precedencia RN-VER-02 vs RN-VER-08 (decisión de negocio, ago 2026): gobierna
// RN-VER-08 — la vigente es editable mientras no exista una posterior; solo las
// históricas son inmutables. Ver Docs/reglas-negocio.md, nota bajo RN-VER-02.
describe('versionado — RN-VER-08: solo las versiones históricas son inmutables', () => {
  it('permite editar la vigente y rechaza editar una histórica', async () => {
    const e = new VersionableFake()
    const v1 = await crearSiguienteVersion(tx, e, { cabeceraId: 1, datos: {}, usuario: 'u' })
    const v2 = await crearSiguienteVersion(tx, e, {
      cabeceraId: 1,
      datos: {},
      usuario: 'u',
      motivo: 'segunda',
    })

    // La vigente (v2) es editable.
    await expect(exigirVersionEditable(tx, e, 1, v2.id)).resolves.toBeUndefined()
    // La v1 quedó histórica: no se puede editar.
    await expect(exigirVersionEditable(tx, e, 1, v1.id)).rejects.toThrow(/hist[oó]rica/i)
  })
})
