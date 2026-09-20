import type { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../../../lib/prisma.js'
import { validacion, noAutorizado } from '../../../shared/errors.js'
import { generarTemplate } from '../../../shared/carga-masiva/generar-template.js'
import { generarReporteErrores } from '../../../shared/carga-masiva/reporte-errores.js'
import { cargarMaestros } from './carga-masiva.service.js'
import {
  REGISTRO_MAESTROS,
  ENUM_TIPO_CLIENTE,
  ENUM_MONEDA,
  ENUM_TIPO_DOC_PROVEEDOR,
  ENUM_MODELO_TARIFA,
} from './registro.js'

function usuarioSesion(req: FastifyRequest): string {
  return req.eneUsuarioId != null ? String(req.eneUsuarioId) : 'system'
}

const LISTAS_ENUM = {
  TipoCliente: ENUM_TIPO_CLIENTE,
  Moneda: ENUM_MONEDA,
  TipoDocProveedor: ENUM_TIPO_DOC_PROVEEDOR,
  ModeloTarifa: ENUM_MODELO_TARIFA,
}

// Geografía chilena fija por seed (RN-GEO-01): se prellenan las hojas de solo
// referencia con el estado actual de la base, para que el dropdown y la
// validación estructural interna (`validarReferenciasInternas`) tengan la
// lista completa de códigos válidos sin necesidad de tocar la BD en dry-run.
async function datosGeografiaReferencia() {
  const [regiones, provincias, comunas] = await Promise.all([
    prisma.region.findMany({ where: { eliminadoEn: null }, orderBy: { codigo: 'asc' } }),
    prisma.provincia.findMany({
      where: { eliminadoEn: null },
      orderBy: { codigo: 'asc' },
      include: { region: { select: { codigo: true } } },
    }),
    prisma.comuna.findMany({
      where: { eliminadoEn: null },
      orderBy: { codigo: 'asc' },
      include: { provincia: { select: { codigo: true } } },
    }),
  ])

  return {
    Regiones: regiones.map((r) => ({ codigo: r.codigo, nombre: r.nombre })),
    Provincias: provincias.map((p) => ({ codigo: p.codigo, nombre: p.nombre, regionCodigo: p.region.codigo })),
    Comunas: comunas.map((c) => ({ codigo: c.codigo, nombre: c.nombre, provinciaCodigo: c.provincia.codigo })),
  }
}

// GET /carga-masiva/template → descarga el Excel base vacío.
export async function descargarTemplate(_req: FastifyRequest, reply: FastifyReply) {
  const buffer = await generarTemplate(REGISTRO_MAESTROS, {
    listasEnum: LISTAS_ENUM,
    datosPorHoja: await datosGeografiaReferencia(),
  })
  return reply
    .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    .header('Content-Disposition', 'attachment; filename="Carga_Masiva_Maestros_ENE_base.xlsx"')
    .send(Buffer.from(buffer))
}

// POST /carga-masiva[?commit=true] (multipart) → valida (dry-run) o carga.
export async function procesar(req: FastifyRequest, reply: FastifyReply) {
  const archivo = await req.file()
  if (!archivo) throw validacion('No se recibió ningún archivo')
  const datos = await archivo.toBuffer()

  const commit = (req.query as { commit?: string }).commit === 'true'
  // La ruta solo exige LECTURA (para poder validar); confirmar la carga
  // exige TOTAL — se revisa acá porque depende del modo, no de la ruta.
  if (commit && req.eneAccesos?.get('CARGA_MASIVA') !== 'TOTAL') {
    throw noAutorizado('Requiere nivel TOTAL en Carga Masiva para confirmar la carga')
  }
  const resultado = await cargarMaestros(datos, { dryRun: !commit, creadoPor: usuarioSesion(req) })
  return reply.send({ data: resultado })
}

// POST /carga-masiva/reporte (multipart) → devuelve el Excel de errores de una
// validación (dry-run) del archivo subido, para descargar.
export async function descargarReporte(req: FastifyRequest, reply: FastifyReply) {
  const archivo = await req.file()
  if (!archivo) throw validacion('No se recibió ningún archivo')
  const datos = await archivo.toBuffer()

  const resultado = await cargarMaestros(datos, { dryRun: true })
  const reporte = await generarReporteErrores(resultado.errores)
  return reply
    .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    .header('Content-Disposition', 'attachment; filename="Reporte_Errores_Carga_Masiva.xlsx"')
    .send(Buffer.from(reporte))
}
