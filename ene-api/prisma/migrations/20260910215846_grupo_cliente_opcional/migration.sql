-- DropForeignKey
ALTER TABLE "grupo" DROP CONSTRAINT "grupo_clienteId_fkey";

-- AlterTable
ALTER TABLE "grupo" ALTER COLUMN "clienteId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "grupo" ADD CONSTRAINT "grupo_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
