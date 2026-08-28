-- RN-PRV-03 [BLOQUEA]: un mismo alias no puede repetirse entre proveedores
-- distintos. El prechequeo en la capa de servicio no cierra condiciones de
-- carrera ni duplicados dentro del mismo payload de alta — la garantía real
-- tiene que vivir en la base. Índice único parcial (excluye eliminados,
-- soft delete) sobre la forma en minúsculas (insensible a mayúsculas).
CREATE UNIQUE INDEX "proveedor_alias_lower_key" ON "proveedor_alias" (lower("alias")) WHERE "eliminadoEn" IS NULL;
