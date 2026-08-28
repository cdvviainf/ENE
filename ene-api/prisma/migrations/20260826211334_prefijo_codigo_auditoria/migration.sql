/*
  Warnings:

  - Added the required column `creadoPor` to the `prefijo_codigo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "prefijo_codigo" ADD COLUMN     "actualizadoEn" TIMESTAMP(3),
ADD COLUMN     "actualizadoPor" TEXT,
ADD COLUMN     "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "creadoPor" TEXT;

-- Backfill: las 9 filas sembradas en Etapa 1 no tenían auditoría (RN-PER-03
-- se sumó recién en esta ronda de QA — hallazgo QA-USR-006).
UPDATE "prefijo_codigo" SET "creadoPor" = 'seed' WHERE "creadoPor" IS NULL;

ALTER TABLE "prefijo_codigo" ALTER COLUMN "creadoPor" SET NOT NULL;
