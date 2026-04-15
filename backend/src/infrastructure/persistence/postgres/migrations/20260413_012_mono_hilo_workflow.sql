-- Registra masas del proceso mono hilo para controlar salida a picado y estimados de merma.

CREATE TABLE IF NOT EXISTS mono_hilo_masas (
  id TEXT PRIMARY KEY,
  workshop_id TEXT NOT NULL DEFAULT 'TLR-001',
  bloque_id TEXT NOT NULL,
  bloque_codigo TEXT NOT NULL,
  bloque_nombre TEXT NOT NULL,
  codigo TEXT NOT NULL,
  largo_cm NUMERIC(10,2) NOT NULL,
  ancho_cm NUMERIC(10,2) NOT NULL,
  profundidad_cm NUMERIC(10,2) NOT NULL,
  margen_cm NUMERIC(10,2) NOT NULL DEFAULT 1,
  grosor_disco_mm NUMERIC(10,2) NOT NULL DEFAULT 8,
  espesor_losa_cm NUMERIC(10,2) NOT NULL DEFAULT 3,
  ubicacion TEXT NOT NULL DEFAULT 'almacen' CHECK (ubicacion IN ('almacen', 'proceso', 'consumida')),
  observaciones TEXT NOT NULL DEFAULT '',
  fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  estimados JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mono_hilo_masas_workshop_codigo
  ON mono_hilo_masas(workshop_id, codigo);

CREATE INDEX IF NOT EXISTS idx_mono_hilo_masas_workshop_bloque
  ON mono_hilo_masas(workshop_id, bloque_id);

CREATE INDEX IF NOT EXISTS idx_mono_hilo_masas_workshop_ubicacion
  ON mono_hilo_masas(workshop_id, ubicacion);
