ALTER TABLE produccion
ADD COLUMN IF NOT EXISTS cantidad_devastar INTEGER NOT NULL DEFAULT 0;

ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_estado_check;
ALTER TABLE productos
ADD CONSTRAINT productos_estado_check
CHECK (estado IN ('Picado', 'Escuadrado', 'Devastado', 'Resinado', 'Pulido'));

ALTER TABLE produccion_trabajadores
DROP CONSTRAINT IF EXISTS produccion_trabajadores_accion_check;

ALTER TABLE produccion_trabajadores
ADD CONSTRAINT produccion_trabajadores_accion_check
CHECK (accion IN ('picar', 'escuadrar', 'devastar', 'resinar', 'pulir'));

UPDATE configuracion
SET tarifas_globales = jsonb_set(
  COALESCE(tarifas_globales, '{}'::jsonb),
  '{devastar}',
  to_jsonb(250),
  true
)
WHERE NOT (COALESCE(tarifas_globales, '{}'::jsonb) ? 'devastar');
