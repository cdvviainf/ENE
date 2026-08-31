-- Unifica Cliente.pais (texto libre) con el catálogo Pais introducido en la
-- extensión de Etapa 4, igual que ya se hizo para las Direcciones. Sin datos
-- reales cargados todavía (Extremo Norte recién empieza a cargar el 4-sep) —
-- se acepta sin backfill, mismo criterio que la migración anterior.
ALTER TABLE "cliente" DROP COLUMN "pais",
ADD COLUMN     "paisId" INTEGER NOT NULL;

CREATE INDEX "cliente_paisId_idx" ON "cliente"("paisId");

ALTER TABLE "cliente" ADD CONSTRAINT "cliente_paisId_fkey" FOREIGN KEY ("paisId") REFERENCES "pais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
