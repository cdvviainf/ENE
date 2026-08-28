import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { idsPorTexto } from '../src/shared/busqueda.js'

// ============================================================================
// shared/busqueda.ts — RN-MAN-06 / RN-PRV-02: búsqueda insensible a mayúsculas
// y acentos vía la extensión `unaccent` de Postgres. Requiere el Postgres del
// docker-compose arriba (misma base que el resto de tests de integración).
// ============================================================================

try {
  process.loadEnvFile()
} catch {
  // .env ya cargado o inexistente.
}

const prisma = new PrismaClient()

let zonaId: number

beforeAll(async () => {
  const zona = await prisma.zona.create({
    data: { codigo: 'QA-BUSQ', nombre: 'San Pédro Añejo', nombreEn: 'Saint Pedro', creadoPor: 'test' },
  })
  zonaId = zona.id
})

afterAll(async () => {
  if (zonaId) await prisma.zona.delete({ where: { id: zonaId } }).catch(() => {})
  await prisma.$disconnect()
})

describe('idsPorTexto — RN-MAN-06: insensible a mayúsculas y acentos', () => {
  it('encuentra el registro buscando sin tildes', async () => {
    const ids = await idsPorTexto('zona', ['codigo', 'nombre', 'nombreEn'], 'pedro')
    expect(ids).toContain(zonaId)
  })

  it('encuentra el registro buscando con tildes distintas a las guardadas', () => {
    return idsPorTexto('zona', ['codigo', 'nombre', 'nombreEn'], 'añéjo').then((ids) => {
      expect(ids).toContain(zonaId)
    })
  })

  it('encuentra el registro sin importar mayúsculas/minúsculas', async () => {
    const ids = await idsPorTexto('zona', ['codigo', 'nombre', 'nombreEn'], 'SAN PEDRO')
    expect(ids).toContain(zonaId)
  })

  it('busca por coincidencia parcial en cualquiera de los campos declarados', async () => {
    const ids = await idsPorTexto('zona', ['codigo', 'nombre', 'nombreEn'], 'QA-BUSQ')
    expect(ids).toContain(zonaId)
  })

  it('no encuentra nada si el texto no matchea ningún campo declarado', async () => {
    const ids = await idsPorTexto('zona', ['codigo', 'nombre', 'nombreEn'], 'texto-inexistente-xyz')
    expect(ids).not.toContain(zonaId)
  })
})
