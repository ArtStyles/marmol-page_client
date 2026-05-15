ALTER TABLE mono_hilo_masas
  ADD COLUMN IF NOT EXISTS remanentes JSONB NOT NULL DEFAULT '[]'::jsonb;
