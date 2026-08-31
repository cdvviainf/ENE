// Portado de FAS (fas-api/prisma/seed-geografia-chile.ts), adaptado a una
// función reutilizable por el seed principal (ENE usa un solo script de seed,
// no uno separado por dominio). Carga Región → Provincia → Comuna (16
// regiones, 56 provincias, 346 comunas, fuente SUBDERE — ver
// regiones-chile-data.ts). El país Chile se siembra aparte, junto al resto de
// países, en seed.ts.
//
// Idempotente: upsert por `codigo` (entre no eliminados). Nunca elimina ni
// reasigna nada — los huérfanos (códigos en BD que no están en el dataset
// oficial) solo se reportan por consola.

import type { PrismaClient } from '@prisma/client'
import { REGIONES_CHILE } from './regiones-chile-data.js'

async function upsertRegion(prisma: PrismaClient, sistema: string, codigo: string, nombre: string) {
  const existente = await prisma.region.findFirst({ where: { codigo, eliminadoEn: null } })
  if (existente) {
    return prisma.region.update({ where: { id: existente.id }, data: { nombre, actualizadoPor: sistema } })
  }
  return prisma.region.create({ data: { codigo, nombre, creadoPor: sistema } })
}

async function upsertProvincia(
  prisma: PrismaClient,
  sistema: string,
  codigo: string,
  nombre: string,
  regionId: number,
) {
  const existente = await prisma.provincia.findFirst({ where: { codigo, eliminadoEn: null } })
  if (existente) {
    return prisma.provincia.update({
      where: { id: existente.id },
      data: { nombre, regionId, actualizadoPor: sistema },
    })
  }
  return prisma.provincia.create({ data: { codigo, nombre, regionId, creadoPor: sistema } })
}

async function upsertComuna(
  prisma: PrismaClient,
  sistema: string,
  codigo: string,
  nombre: string,
  provinciaId: number,
) {
  const existente = await prisma.comuna.findFirst({ where: { codigo, eliminadoEn: null } })
  if (existente) {
    return prisma.comuna.update({
      where: { id: existente.id },
      data: { nombre, provinciaId, actualizadoPor: sistema },
    })
  }
  return prisma.comuna.create({ data: { codigo, nombre, provinciaId, creadoPor: sistema } })
}

export async function sembrarGeografiaChile(prisma: PrismaClient, sistema: string) {
  let regiones = 0
  let provincias = 0
  let comunas = 0

  for (const r of REGIONES_CHILE) {
    const region = await upsertRegion(prisma, sistema, r.codigo, r.descripcion)
    regiones++

    for (const p of r.provincias) {
      const provincia = await upsertProvincia(prisma, sistema, p.codigo, p.descripcion, region.id)
      provincias++

      // Comunas de una misma provincia no dependen entre sí: se cargan en paralelo.
      await Promise.all(p.comunas.map((c) => upsertComuna(prisma, sistema, c.codigo, c.descripcion, provincia.id)))
      comunas += p.comunas.length
    }
  }

  console.log(`Geografía de Chile cargada: ${regiones} regiones, ${provincias} provincias, ${comunas} comunas.`)

  // Códigos oficiales usados por este seed, para detectar registros previos
  // que no correspondan a la división oficial — se reportan pero nunca se
  // modifican ni eliminan automáticamente.
  const codigosOficiales = {
    regiones: new Set(REGIONES_CHILE.map((r) => r.codigo)),
    provincias: new Set(REGIONES_CHILE.flatMap((r) => r.provincias.map((p) => p.codigo))),
    comunas: new Set(REGIONES_CHILE.flatMap((r) => r.provincias.flatMap((p) => p.comunas.map((c) => c.codigo)))),
  }

  const [todasRegiones, todasProvincias, todasComunas] = await Promise.all([
    prisma.region.findMany({ where: { eliminadoEn: null } }),
    prisma.provincia.findMany({ where: { eliminadoEn: null } }),
    prisma.comuna.findMany({ where: { eliminadoEn: null } }),
  ])

  const huerfanas = {
    regiones: todasRegiones.filter((r) => !codigosOficiales.regiones.has(r.codigo)),
    provincias: todasProvincias.filter((p) => !codigosOficiales.provincias.has(p.codigo)),
    comunas: todasComunas.filter((c) => !codigosOficiales.comunas.has(c.codigo)),
  }

  const totalHuerfanas = huerfanas.regiones.length + huerfanas.provincias.length + huerfanas.comunas.length
  if (totalHuerfanas > 0) {
    console.log(`Atención: ${totalHuerfanas} registro(s) de geografía no coinciden con ningún código oficial.`)
  }
}
