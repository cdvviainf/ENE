-- DropForeignKey
ALTER TABLE "cotizacion" DROP CONSTRAINT "cotizacion_ordenTrabajoId_fkey";

-- DropForeignKey
ALTER TABLE "cotizacion" DROP CONSTRAINT "cotizacion_versionVigenteId_fkey";

-- DropForeignKey
ALTER TABLE "cotizacion_linea" DROP CONSTRAINT "cotizacion_linea_cotizacionVersionId_fkey";

-- DropForeignKey
ALTER TABLE "cotizacion_version" DROP CONSTRAINT "cotizacion_version_cotizacionId_fkey";

-- DropForeignKey
ALTER TABLE "orden_compra" DROP CONSTRAINT "orden_compra_versionVigenteId_fkey";

-- DropForeignKey
ALTER TABLE "orden_compra_linea" DROP CONSTRAINT "orden_compra_linea_ordenCompraVersionId_fkey";

-- DropForeignKey
ALTER TABLE "orden_compra_version" DROP CONSTRAINT "orden_compra_version_ordenCompraId_fkey";

-- DropForeignKey
ALTER TABLE "orden_trabajo" DROP CONSTRAINT "orden_trabajo_versionVigenteId_fkey";

-- DropForeignKey
ALTER TABLE "orden_trabajo_linea" DROP CONSTRAINT "orden_trabajo_linea_ordenTrabajoVersionId_fkey";

-- DropForeignKey
ALTER TABLE "orden_trabajo_version" DROP CONSTRAINT "orden_trabajo_version_ordenTrabajoId_fkey";

-- DropIndex
DROP INDEX "cotizacion_ordenTrabajoId_key";

-- AlterTable
ALTER TABLE "adjunto" ADD COLUMN     "eliminadoPor" TEXT;

-- AlterTable
ALTER TABLE "cliente" ADD COLUMN     "eliminadoPor" TEXT;

-- AlterTable
ALTER TABLE "cliente_ejecutivo" ADD COLUMN     "eliminadoPor" TEXT;

-- AlterTable
ALTER TABLE "cotizacion" DROP COLUMN "ordenTrabajoId",
ADD COLUMN     "eliminadoPor" TEXT;

-- AlterTable
ALTER TABLE "grupo" ADD COLUMN     "eliminadoPor" TEXT;

-- AlterTable
ALTER TABLE "orden_compra" ADD COLUMN     "eliminadoPor" TEXT;

-- AlterTable
ALTER TABLE "orden_compra_linea" ADD COLUMN     "moneda" "Moneda" NOT NULL;

-- AlterTable
ALTER TABLE "orden_trabajo" ADD COLUMN     "cotizacionId" INTEGER NOT NULL,
ADD COLUMN     "eliminadoPor" TEXT;

-- AlterTable
ALTER TABLE "pasajero" ADD COLUMN     "eliminadoPor" TEXT;

-- AlterTable
ALTER TABLE "perfil" ADD COLUMN     "eliminadoPor" TEXT;

-- AlterTable
ALTER TABLE "proveedor" ADD COLUMN     "eliminadoPor" TEXT;

-- AlterTable
ALTER TABLE "servicio" ADD COLUMN     "eliminadoPor" TEXT;

-- AlterTable
ALTER TABLE "tarifario" ADD COLUMN     "eliminadoPor" TEXT;

-- AlterTable
ALTER TABLE "tipo_servicio" ADD COLUMN     "eliminadoPor" TEXT;

-- AlterTable
ALTER TABLE "usuario" ADD COLUMN     "eliminadoPor" TEXT;

-- AlterTable
ALTER TABLE "zona" ADD COLUMN     "eliminadoPor" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "cotizacion_versionVigenteId_id_key" ON "cotizacion"("versionVigenteId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "cotizacion_version_id_cotizacionId_key" ON "cotizacion_version"("id", "cotizacionId");

-- CreateIndex
CREATE UNIQUE INDEX "orden_compra_versionVigenteId_id_key" ON "orden_compra"("versionVigenteId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "orden_compra_version_id_ordenCompraId_key" ON "orden_compra_version"("id", "ordenCompraId");

-- CreateIndex
CREATE UNIQUE INDEX "orden_trabajo_cotizacionId_key" ON "orden_trabajo"("cotizacionId");

-- CreateIndex
CREATE UNIQUE INDEX "orden_trabajo_versionVigenteId_id_key" ON "orden_trabajo"("versionVigenteId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "orden_trabajo_version_id_ordenTrabajoId_key" ON "orden_trabajo_version"("id", "ordenTrabajoId");

-- AddForeignKey
ALTER TABLE "cotizacion" ADD CONSTRAINT "cotizacion_versionVigenteId_id_fkey" FOREIGN KEY ("versionVigenteId", "id") REFERENCES "cotizacion_version"("id", "cotizacionId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cotizacion_version" ADD CONSTRAINT "cotizacion_version_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "cotizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_linea" ADD CONSTRAINT "cotizacion_linea_cotizacionVersionId_fkey" FOREIGN KEY ("cotizacionVersionId") REFERENCES "cotizacion_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_trabajo" ADD CONSTRAINT "orden_trabajo_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "cotizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_trabajo" ADD CONSTRAINT "orden_trabajo_versionVigenteId_id_fkey" FOREIGN KEY ("versionVigenteId", "id") REFERENCES "orden_trabajo_version"("id", "ordenTrabajoId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "orden_trabajo_version" ADD CONSTRAINT "orden_trabajo_version_ordenTrabajoId_fkey" FOREIGN KEY ("ordenTrabajoId") REFERENCES "orden_trabajo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_trabajo_linea" ADD CONSTRAINT "orden_trabajo_linea_ordenTrabajoVersionId_fkey" FOREIGN KEY ("ordenTrabajoVersionId") REFERENCES "orden_trabajo_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_compra" ADD CONSTRAINT "orden_compra_versionVigenteId_id_fkey" FOREIGN KEY ("versionVigenteId", "id") REFERENCES "orden_compra_version"("id", "ordenCompraId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "orden_compra_version" ADD CONSTRAINT "orden_compra_version_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES "orden_compra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_compra_linea" ADD CONSTRAINT "orden_compra_linea_ordenCompraVersionId_fkey" FOREIGN KEY ("ordenCompraVersionId") REFERENCES "orden_compra_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

