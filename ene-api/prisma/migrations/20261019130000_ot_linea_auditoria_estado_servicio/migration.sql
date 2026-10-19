-- Etapa 8 · Orden de Trabajo — auditoría del cambio de estado operativo de una
-- línea (RN-PER-03 / QA-IMP-019). `cambiarEstadoServicio` persiste el usuario de
-- la sesión; `actualizadoEn` lo maneja Prisma con @updatedAt. No destructiva.

ALTER TABLE "orden_trabajo_linea"
  ADD COLUMN "actualizadoEn" TIMESTAMP(3),
  ADD COLUMN "actualizadoPor" TEXT;
