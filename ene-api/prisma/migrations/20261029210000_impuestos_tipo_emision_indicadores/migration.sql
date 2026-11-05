-- Impuestos (oct-2026): el proveedor emite FACTURA/BOLETA_HONORARIOS/NADA, el
-- servicio es afecto o exento, y las tasas (IVA/retención) viven en Indicadores
-- (singleton global). Reemplaza el mantenedor TipoDocumento + FormaCalculoImpuesto.

-- Enum nuevo del documento del proveedor.
CREATE TYPE "TipoEmisionProveedor" AS ENUM ('FACTURA', 'BOLETA_HONORARIOS', 'NADA');

-- Servicio: afectación a IVA (default afecto).
ALTER TABLE "servicio" ADD COLUMN "afectoIva" BOOLEAN NOT NULL DEFAULT true;

-- Proveedor: tipo de emisión (default FACTURA); se rellena desde el documento
-- anterior ANTES de soltar la FK/columna y de borrar la tabla.
ALTER TABLE "proveedor" ADD COLUMN "tipoEmision" "TipoEmisionProveedor" NOT NULL DEFAULT 'FACTURA';

-- Mapeo por documento anterior (QA-R1-002): RETENCION → boleta de honorarios;
-- IVA (factura afecta) y FACTURA_EXENTA → factura; cualquier otro documento sin
-- impuesto ("A nada", códigos creados a mano con formaCalculo NINGUNO) → NADA.
-- La afectación afecto/exento pasa a ser del servicio (servicio.afectoIva).
UPDATE "proveedor" p
SET "tipoEmision" = CASE
  WHEN td."formaCalculo" = 'RETENCION' THEN 'BOLETA_HONORARIOS'::"TipoEmisionProveedor"
  WHEN td."formaCalculo" = 'IVA' THEN 'FACTURA'::"TipoEmisionProveedor"
  WHEN td."codigo" = 'FACTURA_EXENTA' THEN 'FACTURA'::"TipoEmisionProveedor"
  ELSE 'NADA'::"TipoEmisionProveedor"
END
FROM "tipo_documento" td
WHERE p."tipoDocumentoId" = td."id";

UPDATE "proveedor" SET "tipoEmision" = 'NADA' WHERE "tipoDocumentoId" IS NULL;

-- Soltar la FK y la columna del proveedor.
ALTER TABLE "proveedor" DROP CONSTRAINT IF EXISTS "proveedor_tipoDocumentoId_fkey";
ALTER TABLE "proveedor" DROP COLUMN "tipoDocumentoId";

-- Retirar el mantenedor TipoDocumento y su enum.
DROP TABLE "tipo_documento";
DROP TYPE "FormaCalculoImpuesto";

-- Indicadores globales (singleton). Se siembra la fila id=1 con las tasas por
-- defecto (editables desde el mantenedor).
CREATE TABLE "indicadores" (
    "id" SERIAL NOT NULL,
    "tasaIva" DECIMAL(7,4) NOT NULL DEFAULT 0.19,
    "tasaRetencion" DECIMAL(7,4) NOT NULL DEFAULT 0.1475,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" TEXT NOT NULL,
    "actualizadoEn" TIMESTAMP(3),
    "actualizadoPor" TEXT,
    CONSTRAINT "indicadores_pkey" PRIMARY KEY ("id")
);

INSERT INTO "indicadores" ("tasaIva", "tasaRetencion", "creadoPor")
VALUES (0.19, 0.1475, 'system');
