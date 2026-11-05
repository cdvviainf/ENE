-- DropForeignKey
ALTER TABLE "orden_trabajo" DROP CONSTRAINT "orden_trabajo_cotizacionId_fkey";

-- AlterTable
ALTER TABLE "orden_trabajo" ALTER COLUMN "cotizacionId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "orden_trabajo" ADD CONSTRAINT "orden_trabajo_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "cotizacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
