-- Agrega la ubicacion operativa del producto para separar stock en almacen y fuera de almacen (proceso).

ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS ubicacion TEXT NOT NULL DEFAULT 'almacen';

ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_ubicacion_check;

ALTER TABLE productos
  ADD CONSTRAINT productos_ubicacion_check
  CHECK (ubicacion IN ('almacen', 'proceso'));

CREATE INDEX IF NOT EXISTS idx_productos_workshop_ubicacion
  ON productos (workshop_id, ubicacion);
