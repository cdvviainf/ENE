-- CreateEnum
CREATE TYPE "TipoDocProveedor" AS ENUM ('FACTURA_AFECTA', 'FACTURA_EXENTA', 'BOLETA_HONORARIOS');

-- AlterTable
ALTER TABLE "proveedor" ADD COLUMN     "tipoDocumento" "TipoDocProveedor" NOT NULL DEFAULT 'FACTURA_AFECTA',
ADD COLUMN     "urlPago" TEXT;
