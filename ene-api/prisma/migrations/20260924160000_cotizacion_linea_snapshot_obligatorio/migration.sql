-- RN-COS-06 [BLOQUEA]: toda línea ESTANDAR debe conservar su base tarifaria
-- congelada (tarifarioSnapshot). Una línea sin snapshot no puede recalcularse
-- por pasajeros (RN-COS-07) sin re-leer el maestro, lo que la regla prohíbe.
--
-- Este CHECK hace el snapshot obligatorio a nivel de base para las líneas
-- ESTANDAR (las OTRO no lo llevan: su costo es digitado, RN-COS-05).
--
-- Sin backfill: el módulo de cotizaciones se estrena en la Etapa 7 y todas sus
-- migraciones viajan juntas en este release, por lo que NO existe ninguna línea
-- de cotización preexistente en ningún ambiente (precondición acreditada,
-- QA-IMP-009). El constraint aplica sobre cero filas.
ALTER TABLE "cotizacion_linea"
  ADD CONSTRAINT "cotizacion_linea_snapshot_estandar_check"
  CHECK ("tipoLinea"::text = 'OTRO' OR "tarifarioSnapshot" IS NOT NULL);
