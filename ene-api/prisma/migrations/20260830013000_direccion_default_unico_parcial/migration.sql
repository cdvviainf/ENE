-- RN-GEO-03 [BLOQUEA]: un Cliente o Proveedor tiene como máximo una dirección
-- marcada esPorDefecto=true. El service desmarca-y-crea dentro de una
-- transacción, pero si el dueño no tiene ninguna dirección default todavía el
-- UPDATE de "desmarcar" no bloquea ninguna fila: dos altas concurrentes con
-- esPorDefecto=true podían confirmarse ambas. Índice único parcial (excluye
-- eliminados, soft delete) como garantía real en la base — mismo patrón que
-- proveedor_alias_unico_parcial.
CREATE UNIQUE INDEX "cliente_direccion_default_unico" ON "cliente_direccion" ("clienteId") WHERE "esPorDefecto" = true AND "eliminadoEn" IS NULL;
CREATE UNIQUE INDEX "proveedor_direccion_default_unico" ON "proveedor_direccion" ("proveedorId") WHERE "esPorDefecto" = true AND "eliminadoEn" IS NULL;
