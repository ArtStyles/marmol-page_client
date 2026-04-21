-- Persist actor metadata on records consumed by the operational audit timeline.

ALTER TABLE mono_hilo_masas
  ADD COLUMN IF NOT EXISTS creado_por_id TEXT,
  ADD COLUMN IF NOT EXISTS creado_por_nombre TEXT;

ALTER TABLE produccion
  ADD COLUMN IF NOT EXISTS creado_por_id TEXT,
  ADD COLUMN IF NOT EXISTS creado_por_nombre TEXT;

ALTER TABLE ventas
  ADD COLUMN IF NOT EXISTS creado_por_id TEXT,
  ADD COLUMN IF NOT EXISTS creado_por_nombre TEXT;

ALTER TABLE historial_pagos
  ADD COLUMN IF NOT EXISTS creado_por_id TEXT,
  ADD COLUMN IF NOT EXISTS creado_por_nombre TEXT;
