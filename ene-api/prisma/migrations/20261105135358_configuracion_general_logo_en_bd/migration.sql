-- Configuración general (nov-2026, RN-EMP-01): el logo de la empresa pasa del
-- filesystem (ADJUNTOS_PATH/empresa/) a la BD, en una tabla aparte con el
-- binario (mismo patrón que FAS EmpresaLogo).
--
-- Destructiva a propósito y sin backfill: los bytes que estaban en disco no son
-- accesibles desde SQL. Riesgo aceptado por el usuario (QA-CFG-001, 5-nov-2026):
-- está garantizado que ningún ambiente desplegado tiene un logo cargado (en
-- desarrollo tampoco había). Si en algún ambiente existiera, basta volver a
-- subirlo desde Configuración general > Logo; el archivo antiguo queda huérfano
-- en ADJUNTOS_PATH/empresa/ y puede borrarse a mano.

-- AlterTable
ALTER TABLE "empresa" DROP COLUMN "logoMimeType",
DROP COLUMN "logoStorageKey";

-- CreateTable
CREATE TABLE "empresa_logo" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "mime" TEXT NOT NULL,
    "datos" BYTEA NOT NULL,
    "subidoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subidoPor" TEXT NOT NULL,

    CONSTRAINT "empresa_logo_pkey" PRIMARY KEY ("id")
);

-- Un solo logo por empresa (relación 1:1).
CREATE UNIQUE INDEX "empresa_logo_empresaId_key" ON "empresa_logo"("empresaId");

-- AddForeignKey
ALTER TABLE "empresa_logo" ADD CONSTRAINT "empresa_logo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
