ALTER TABLE configuracion
  ADD COLUMN IF NOT EXISTS costos_analisis_estado JSONB NOT NULL DEFAULT '{"crudo":0,"escuadrado":0,"pulido":0}'::jsonb;

ALTER TABLE configuracion
  ADD COLUMN IF NOT EXISTS costo_resina_litro NUMERIC(10,2) NOT NULL DEFAULT 0;
