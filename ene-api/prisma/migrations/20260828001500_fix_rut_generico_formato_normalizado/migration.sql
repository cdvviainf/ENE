-- El servicio de Proveedor normaliza todo RUT con formatearRut() antes de
-- guardar (sin puntos, con guión): "55.555.555-5" nunca llega a persistirse
-- tal cual, siempre como "55555555-5". El índice único parcial creado en
-- 20260828000038 excluía la forma CON puntos y quedaba inconsistente con lo
-- que realmente se guarda. Se corrige acá (no se edita la migración ya
-- aplicada, RN de convenciones del proyecto).
DROP INDEX "proveedor_rut_key_no_generico";

CREATE UNIQUE INDEX "proveedor_rut_key_no_generico" ON "proveedor"("rut") WHERE "rut" <> '55555555-5';
