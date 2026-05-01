ALTER TABLE gastos
  ADD COLUMN IF NOT EXISTS origen TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS origen_modulo TEXT NOT NULL DEFAULT 'gastos',
  ADD COLUMN IF NOT EXISTS referencia_id TEXT,
  ADD COLUMN IF NOT EXISTS creado_por_id TEXT,
  ADD COLUMN IF NOT EXISTS creado_por_nombre TEXT,
  ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'activo',
  ADD COLUMN IF NOT EXISTS anulado_por_id TEXT,
  ADD COLUMN IF NOT EXISTS anulado_por_nombre TEXT,
  ADD COLUMN IF NOT EXISTS anulado_fecha TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS motivo_anulacion TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'gastos_origen_check'
  ) THEN
    ALTER TABLE gastos
      ADD CONSTRAINT gastos_origen_check CHECK (origen IN ('manual', 'sistema'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'gastos_origen_modulo_check'
  ) THEN
    ALTER TABLE gastos
      ADD CONSTRAINT gastos_origen_modulo_check CHECK (origen_modulo IN ('gastos', 'bloques', 'pagos'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'gastos_estado_check'
  ) THEN
    ALTER TABLE gastos
      ADD CONSTRAINT gastos_estado_check CHECK (estado IN ('activo', 'anulado'));
  END IF;
END $$;
