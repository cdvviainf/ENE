-- AlterTable
ALTER TABLE "cliente_direccion" ADD COLUMN     "descripcion" TEXT;

-- AlterTable
ALTER TABLE "cliente_ejecutivo" ADD COLUMN     "descripcion" TEXT,
ADD COLUMN     "esRepresentanteLegal" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "proveedor_contacto" ADD COLUMN     "descripcion" TEXT,
ADD COLUMN     "esEjecutivo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "esRepresentanteLegal" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "proveedor_direccion" ADD COLUMN     "descripcion" TEXT;

-- CreateTable
CREATE TABLE "proveedor_tipo_servicio" (
    "proveedorId" INTEGER NOT NULL,
    "tipoServicioId" INTEGER NOT NULL,

    CONSTRAINT "proveedor_tipo_servicio_pkey" PRIMARY KEY ("proveedorId","tipoServicioId")
);

-- AddForeignKey
ALTER TABLE "proveedor_tipo_servicio" ADD CONSTRAINT "proveedor_tipo_servicio_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proveedor_tipo_servicio" ADD CONSTRAINT "proveedor_tipo_servicio_tipoServicioId_fkey" FOREIGN KEY ("tipoServicioId") REFERENCES "tipo_servicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RN-PRV-08: backfill antes de eliminar la columna vieja — no hay proveedores
-- reales todavía (confirmado 31-ago-2026), pero la migración queda segura de
-- todos modos para cualquier ambiente que sí tenga datos.
INSERT INTO "proveedor_tipo_servicio" ("proveedorId", "tipoServicioId")
SELECT "id", "tipoServicioId" FROM "proveedor" WHERE "tipoServicioId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "proveedor" DROP CONSTRAINT "proveedor_tipoServicioId_fkey";

-- AlterTable
ALTER TABLE "proveedor" DROP COLUMN "tipoServicioId";

-- RN-CLI-05 / RN-PRV-06 [BLOQUEA]: como máximo un contacto por dueño con
-- esRepresentanteLegal=true — mismo patrón que direccion_default_unico_parcial.
CREATE UNIQUE INDEX "cliente_ejecutivo_representante_legal_unico" ON "cliente_ejecutivo" ("clienteId") WHERE "esRepresentanteLegal" = true AND "eliminadoEn" IS NULL;
CREATE UNIQUE INDEX "proveedor_contacto_representante_legal_unico" ON "proveedor_contacto" ("proveedorId") WHERE "esRepresentanteLegal" = true AND "eliminadoEn" IS NULL;
