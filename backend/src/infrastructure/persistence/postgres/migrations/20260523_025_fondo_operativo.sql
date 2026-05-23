-- Tabla para el fondo operativo mensual del taller (caja chica por período).
-- Permite definir un monto inicial por período YYYY-MM y calcular balance actual.

BEGIN;

CREATE TABLE IF NOT EXISTS fondo_operativo (
  id TEXT PRIMARY KEY,
  workshop_id TEXT NOT NULL DEFAULT 'TLR-001',
  periodo TEXT NOT NULL,
  fondo_inicial NUMERIC(14,2) NOT NULL CHECK (fondo_inicial > 0),
  creado_por_id TEXT,
  creado_por_nombre TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (workshop_id, periodo)
);

COMMIT;
