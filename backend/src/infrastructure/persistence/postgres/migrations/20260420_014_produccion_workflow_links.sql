ALTER TABLE produccion
  ADD COLUMN IF NOT EXISTS workflow_tipo TEXT NOT NULL DEFAULT 'regular';

ALTER TABLE produccion
  DROP CONSTRAINT IF EXISTS produccion_workflow_tipo_check;

ALTER TABLE produccion
  ADD CONSTRAINT produccion_workflow_tipo_check
  CHECK (workflow_tipo IN ('regular', 'mono_hilo'));

ALTER TABLE produccion
  ADD COLUMN IF NOT EXISTS mono_hilo_detalle JSONB;

ALTER TABLE produccion_trabajadores
  ADD COLUMN IF NOT EXISTS produccion_id TEXT;

ALTER TABLE produccion_trabajadores
  ADD COLUMN IF NOT EXISTS produccion_detalle_id TEXT;

CREATE INDEX IF NOT EXISTS idx_produccion_workshop_workflow
  ON produccion(workshop_id, workflow_tipo);

CREATE INDEX IF NOT EXISTS idx_produccion_trabajadores_produccion
  ON produccion_trabajadores(workshop_id, produccion_id);
