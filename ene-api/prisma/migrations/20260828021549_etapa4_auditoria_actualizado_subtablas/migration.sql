-- AlterTable
ALTER TABLE "cliente_ejecutivo" ADD COLUMN     "actualizadoEn" TIMESTAMP(3),
ADD COLUMN     "actualizadoPor" TEXT;

-- AlterTable
ALTER TABLE "pasajero" ADD COLUMN     "actualizadoEn" TIMESTAMP(3),
ADD COLUMN     "actualizadoPor" TEXT;

-- AlterTable
ALTER TABLE "proveedor_contacto" ADD COLUMN     "actualizadoEn" TIMESTAMP(3),
ADD COLUMN     "actualizadoPor" TEXT;

-- AlterTable
ALTER TABLE "proveedor_cuenta" ADD COLUMN     "actualizadoEn" TIMESTAMP(3),
ADD COLUMN     "actualizadoPor" TEXT;
