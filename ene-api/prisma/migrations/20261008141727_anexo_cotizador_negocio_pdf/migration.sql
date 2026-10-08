-- Anexo cotizador + maestros + PDF (oct-2026).
-- Renombre Grupo→Negocio, múltiples zonas, vigencia/comentarios/forma de pago
-- en la versión, observación por línea, recargo (RN-COS-08), TipoDocumento
-- mantenedor (reemplaza enum), Empresa singleton. Migración destructiva
-- aceptada: sin datos reales cargados (misma precondición que Etapa 7).
-- Generada con 'prisma migrate diff' (motor Prisma), no a mano.

-- CreateEnum
CREATE TYPE "FormaCalculoImpuesto" AS ENUM ('NINGUNO', 'IVA', 'RETENCION');

-- DropForeignKey
ALTER TABLE "grupo" DROP CONSTRAINT "grupo_clienteId_fkey";

-- DropForeignKey
ALTER TABLE "pasajero" DROP CONSTRAINT "pasajero_grupoId_fkey";

-- DropForeignKey
ALTER TABLE "cotizacion" DROP CONSTRAINT "cotizacion_grupoId_fkey";

-- DropForeignKey
ALTER TABLE "cotizacion" DROP CONSTRAINT "cotizacion_zonaId_fkey";

-- DropForeignKey
ALTER TABLE "orden_trabajo" DROP CONSTRAINT "orden_trabajo_grupoId_fkey";

-- DropForeignKey
ALTER TABLE "orden_trabajo" DROP CONSTRAINT "orden_trabajo_zonaId_fkey";

-- DropIndex
DROP INDEX "pasajero_grupoId_idx";

-- AlterTable
ALTER TABLE "pasajero" DROP COLUMN "grupoId",
ADD COLUMN     "negocioId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "forma_pago" ADD COLUMN     "porcentajeAdicional" DECIMAL(7,4) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "proveedor" DROP COLUMN "tipoDocumento",
ADD COLUMN     "tipoDocumentoId" INTEGER;

-- AlterTable
ALTER TABLE "cotizacion" DROP COLUMN "grupoId",
DROP COLUMN "zonaId",
ADD COLUMN     "negocioId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "cotizacion_version" ADD COLUMN     "fechaVigencia" TIMESTAMP(3),
ADD COLUMN     "formaPagoId" INTEGER,
ADD COLUMN     "incluidos" TEXT,
ADD COLUMN     "incluidosEn" TEXT,
ADD COLUMN     "noIncluidos" TEXT,
ADD COLUMN     "noIncluidosEn" TEXT,
ADD COLUMN     "notasImportantes" TEXT,
ADD COLUMN     "notasImportantesEn" TEXT,
ADD COLUMN     "recargoPct" DECIMAL(7,4) NOT NULL DEFAULT 0,
ADD COLUMN     "recargoTotal" DECIMAL(18,4) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "cotizacion_linea" ADD COLUMN     "observacion" TEXT,
ADD COLUMN     "observacionEn" TEXT;

-- AlterTable
ALTER TABLE "orden_trabajo" DROP COLUMN "grupoId",
DROP COLUMN "zonaId",
ADD COLUMN     "negocioId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "grupo";

-- DropEnum
DROP TYPE "TipoDocProveedor";

-- CreateTable
CREATE TABLE "negocio" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "clienteId" INTEGER,
    "nacionalidad" TEXT,
    "paisOrigen" TEXT,
    "idioma" TEXT,
    "cantidadPax" INTEGER NOT NULL DEFAULT 1,
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" TEXT NOT NULL,
    "actualizadoEn" TIMESTAMP(3),
    "actualizadoPor" TEXT,
    "eliminadoEn" TIMESTAMP(3),
    "eliminadoPor" TEXT,

    CONSTRAINT "negocio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipo_documento" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "formaCalculo" "FormaCalculoImpuesto" NOT NULL DEFAULT 'NINGUNO',
    "porcentaje" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" TEXT NOT NULL,
    "actualizadoEn" TIMESTAMP(3),
    "actualizadoPor" TEXT,
    "eliminadoEn" TIMESTAMP(3),
    "eliminadoPor" TEXT,

    CONSTRAINT "tipo_documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empresa" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "rut" TEXT,
    "direccion" TEXT,
    "email" TEXT,
    "web" TEXT,
    "telefono" TEXT,
    "logoStorageKey" TEXT,
    "logoMimeType" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" TEXT NOT NULL,
    "actualizadoEn" TIMESTAMP(3),
    "actualizadoPor" TEXT,

    CONSTRAINT "empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotizacion_zona" (
    "cotizacionId" INTEGER NOT NULL,
    "zonaId" INTEGER NOT NULL,

    CONSTRAINT "cotizacion_zona_pkey" PRIMARY KEY ("cotizacionId","zonaId")
);

-- CreateTable
CREATE TABLE "orden_trabajo_zona" (
    "ordenTrabajoId" INTEGER NOT NULL,
    "zonaId" INTEGER NOT NULL,

    CONSTRAINT "orden_trabajo_zona_pkey" PRIMARY KEY ("ordenTrabajoId","zonaId")
);

-- CreateIndex
CREATE UNIQUE INDEX "negocio_codigo_key" ON "negocio"("codigo");

-- CreateIndex
CREATE INDEX "negocio_apellido_idx" ON "negocio"("apellido");

-- CreateIndex
CREATE INDEX "negocio_clienteId_idx" ON "negocio"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "tipo_documento_codigo_key" ON "tipo_documento"("codigo");

-- CreateIndex
CREATE INDEX "cotizacion_zona_zonaId_idx" ON "cotizacion_zona"("zonaId");

-- CreateIndex
CREATE INDEX "orden_trabajo_zona_zonaId_idx" ON "orden_trabajo_zona"("zonaId");

-- CreateIndex
CREATE INDEX "pasajero_negocioId_idx" ON "pasajero"("negocioId");

-- AddForeignKey
ALTER TABLE "negocio" ADD CONSTRAINT "negocio_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pasajero" ADD CONSTRAINT "pasajero_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proveedor" ADD CONSTRAINT "proveedor_tipoDocumentoId_fkey" FOREIGN KEY ("tipoDocumentoId") REFERENCES "tipo_documento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion" ADD CONSTRAINT "cotizacion_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "negocio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_version" ADD CONSTRAINT "cotizacion_version_formaPagoId_fkey" FOREIGN KEY ("formaPagoId") REFERENCES "forma_pago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_zona" ADD CONSTRAINT "cotizacion_zona_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_zona" ADD CONSTRAINT "cotizacion_zona_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "zona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_trabajo" ADD CONSTRAINT "orden_trabajo_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "negocio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_trabajo_zona" ADD CONSTRAINT "orden_trabajo_zona_ordenTrabajoId_fkey" FOREIGN KEY ("ordenTrabajoId") REFERENCES "orden_trabajo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_trabajo_zona" ADD CONSTRAINT "orden_trabajo_zona_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "zona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

