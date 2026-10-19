-- Etapa 8 · Orden de Trabajo — persistencia de la aprobación del cliente para un
-- cambio de ALCANCE (RN-VER-10 / QA-VER-001, diferido a esta etapa). El adaptador
-- de versionado ya exigía el booleano; ahora queda guardado y es verificable:
-- quién no (es el usuario del sistema en creadoPor), cuándo (aprobacionEn) y con
-- qué respaldo (aprobacionReferencia). No destructiva: ADD COLUMN con default.

ALTER TABLE "orden_trabajo_version"
  ADD COLUMN "aprobadoPorCliente" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "aprobacionReferencia" TEXT,
  ADD COLUMN "aprobacionEn" TIMESTAMP(3);
