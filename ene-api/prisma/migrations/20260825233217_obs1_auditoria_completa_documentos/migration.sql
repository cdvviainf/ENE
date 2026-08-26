-- AlterTable
ALTER TABLE "documento_tributario" ADD COLUMN     "actualizadoEn" TIMESTAMP(3),
ADD COLUMN     "actualizadoPor" TEXT,
ADD COLUMN     "eliminadoEn" TIMESTAMP(3),
ADD COLUMN     "eliminadoPor" TEXT;

-- AlterTable
ALTER TABLE "factura_proveedor" ADD COLUMN     "actualizadoEn" TIMESTAMP(3),
ADD COLUMN     "actualizadoPor" TEXT,
ADD COLUMN     "eliminadoEn" TIMESTAMP(3),
ADD COLUMN     "eliminadoPor" TEXT;

-- AlterTable
ALTER TABLE "movimiento_cuenta" ADD COLUMN     "actualizadoEn" TIMESTAMP(3),
ADD COLUMN     "actualizadoPor" TEXT,
ADD COLUMN     "eliminadoEn" TIMESTAMP(3),
ADD COLUMN     "eliminadoPor" TEXT;

-- AlterTable
ALTER TABLE "pago_proveedor" ADD COLUMN     "actualizadoEn" TIMESTAMP(3),
ADD COLUMN     "actualizadoPor" TEXT,
ADD COLUMN     "eliminadoEn" TIMESTAMP(3),
ADD COLUMN     "eliminadoPor" TEXT;

