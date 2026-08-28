-- AlterTable
ALTER TABLE "grupo" ADD COLUMN     "actualizadoEn" TIMESTAMP(3),
ADD COLUMN     "actualizadoPor" TEXT;

-- AlterTable
ALTER TABLE "tipo_servicio" ADD COLUMN     "actualizadoEn" TIMESTAMP(3),
ADD COLUMN     "actualizadoPor" TEXT;

-- AlterTable
ALTER TABLE "zona" ADD COLUMN     "actualizadoEn" TIMESTAMP(3),
ADD COLUMN     "actualizadoPor" TEXT;
