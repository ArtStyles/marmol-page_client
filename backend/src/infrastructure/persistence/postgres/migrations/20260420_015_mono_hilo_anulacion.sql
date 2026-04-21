ALTER TABLE mono_hilo_masas
  ADD COLUMN IF NOT EXISTS produccion_id TEXT;

ALTER TABLE mono_hilo_masas
  ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'activa';

ALTER TABLE mono_hilo_masas
  ADD COLUMN IF NOT EXISTS anulacion_motivo TEXT;

ALTER TABLE mono_hilo_masas
  ADD COLUMN IF NOT EXISTS anulado_por_id TEXT;

ALTER TABLE mono_hilo_masas
  ADD COLUMN IF NOT EXISTS anulado_por_nombre TEXT;

ALTER TABLE mono_hilo_masas
  ADD COLUMN IF NOT EXISTS anulado_fecha TIMESTAMPTZ;

ALTER TABLE mono_hilo_masas
  DROP CONSTRAINT IF EXISTS mono_hilo_masas_estado_check;

ALTER TABLE mono_hilo_masas
  ADD CONSTRAINT mono_hilo_masas_estado_check
  CHECK (estado IN ('activa', 'anulada'));

CREATE INDEX IF NOT EXISTS idx_mono_hilo_masas_workshop_produccion
  ON mono_hilo_masas(workshop_id, produccion_id);

ALTER TABLE produccion
  ADD COLUMN IF NOT EXISTS estado_registro TEXT NOT NULL DEFAULT 'activo';

ALTER TABLE produccion
  ADD COLUMN IF NOT EXISTS anulacion_motivo TEXT;

ALTER TABLE produccion
  ADD COLUMN IF NOT EXISTS anulado_por_id TEXT;

ALTER TABLE produccion
  ADD COLUMN IF NOT EXISTS anulado_por_nombre TEXT;

ALTER TABLE produccion
  ADD COLUMN IF NOT EXISTS anulado_fecha TIMESTAMPTZ;

ALTER TABLE produccion
  DROP CONSTRAINT IF EXISTS produccion_estado_registro_check;

ALTER TABLE produccion
  ADD CONSTRAINT produccion_estado_registro_check
  CHECK (estado_registro IN ('activo', 'anulado'));

CREATE INDEX IF NOT EXISTS idx_produccion_workshop_estado_registro
  ON produccion(workshop_id, estado_registro);
