ALTER TABLE bloques DROP CONSTRAINT IF EXISTS bloques_estado_check;
ALTER TABLE bloques
  ADD CONSTRAINT bloques_estado_check
  CHECK (estado IN ('activo', 'agotado', 'vendido'));
