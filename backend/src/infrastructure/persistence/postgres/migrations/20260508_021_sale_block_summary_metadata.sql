ALTER TABLE ventas ADD COLUMN IF NOT EXISTS bloque_id TEXT;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS bloque_codigo TEXT;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS observaciones TEXT;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS responsable_validacion_id TEXT;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS responsable_validacion_nombre TEXT;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS fecha_liquidacion DATE;
