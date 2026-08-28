/*
  Warnings:

  - You are about to drop the column `zonaId` on the `proveedor` table. All the data in the column will be lost.
  - Made the column `pais` on table `cliente` required. This step will fail if there are existing NULL values in that column.
  - Made the column `rut` on table `proveedor` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tipoServicioId` on table `proveedor` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `creadoPor` to the `proveedor_alias` table without a default value. This is not possible if the table is not empty.
  - Added the required column `creadoPor` to the `proveedor_contacto` table without a default value. This is not possible if the table is not empty.
  - Added the required column `creadoPor` to the `proveedor_cuenta` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "proveedor" DROP CONSTRAINT "proveedor_tipoServicioId_fkey";

-- DropForeignKey
ALTER TABLE "proveedor" DROP CONSTRAINT "proveedor_zonaId_fkey";

-- AlterTable
ALTER TABLE "cliente" ALTER COLUMN "pais" SET NOT NULL;

-- AlterTable
ALTER TABLE "proveedor" DROP COLUMN "zonaId",
ALTER COLUMN "rut" SET NOT NULL,
ALTER COLUMN "tipoServicioId" SET NOT NULL;

-- AlterTable
ALTER TABLE "proveedor_alias" ADD COLUMN     "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "creadoPor" TEXT NOT NULL,
ADD COLUMN     "eliminadoEn" TIMESTAMP(3),
ADD COLUMN     "eliminadoPor" TEXT;

-- AlterTable
ALTER TABLE "proveedor_contacto" ADD COLUMN     "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "creadoPor" TEXT NOT NULL,
ADD COLUMN     "eliminadoEn" TIMESTAMP(3),
ADD COLUMN     "eliminadoPor" TEXT;

-- AlterTable
ALTER TABLE "proveedor_cuenta" ADD COLUMN     "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "creadoPor" TEXT NOT NULL,
ADD COLUMN     "eliminadoEn" TIMESTAMP(3),
ADD COLUMN     "eliminadoPor" TEXT;

-- CreateTable
CREATE TABLE "proveedor_zona" (
    "proveedorId" INTEGER NOT NULL,
    "zonaId" INTEGER NOT NULL,

    CONSTRAINT "proveedor_zona_pkey" PRIMARY KEY ("proveedorId","zonaId")
);

-- AddForeignKey
ALTER TABLE "proveedor" ADD CONSTRAINT "proveedor_tipoServicioId_fkey" FOREIGN KEY ("tipoServicioId") REFERENCES "tipo_servicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proveedor_zona" ADD CONSTRAINT "proveedor_zona_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proveedor_zona" ADD CONSTRAINT "proveedor_zona_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "zona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RN-MAN-06 / RN-PRV-02: búsqueda insensible a acentos en los 6 maestros.
-- No es dependencia npm, es extensión nativa de Postgres (CLAUDE.md §13.1).
CREATE EXTENSION IF NOT EXISTS unaccent;

-- RN-PRV-01: rut obligatorio y único, EXCEPTO el RUT genérico
-- '55.555.555-5' que usan los proveedores extranjeros sin RUT chileno real
-- (definición del cliente, 27-ago-2026) — ese valor se puede repetir entre
-- proveedores distintos. Prisma no expresa índices únicos parciales en el
-- schema; se declara acá y se documenta en CLAUDE.md §7.
CREATE UNIQUE INDEX "proveedor_rut_key_no_generico" ON "proveedor"("rut") WHERE "rut" <> '55.555.555-5';
