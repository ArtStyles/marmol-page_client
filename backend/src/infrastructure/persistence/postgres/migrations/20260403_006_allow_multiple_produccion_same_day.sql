-- Permite registrar multiples producciones para la misma fecha/origen/tipo/dimension.
-- Reemplaza el indice unico por uno no unico para conservar rendimiento en consultas.

DROP INDEX IF EXISTS idx_produccion_unique_daily_combo;

CREATE INDEX IF NOT EXISTS idx_produccion_daily_combo
  ON produccion (workshop_id, fecha, origen_id, tipo, dimension);
