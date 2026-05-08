ALTER TABLE bloques ALTER COLUMN dimension_base DROP NOT NULL;

ALTER TABLE bloques DROP CONSTRAINT IF EXISTS bloques_dimension_base_check;
ALTER TABLE bloques
  ADD CONSTRAINT bloques_dimension_base_check
  CHECK (dimension_base IS NULL OR dimension_base ~* '^[0-9]+(\.[0-9]+)?x[0-9]+(\.[0-9]+)?$');

ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_dimension_check;
ALTER TABLE productos
  ADD CONSTRAINT productos_dimension_check
  CHECK (dimension ~* '^[0-9]+(\.[0-9]+)?x[0-9]+(\.[0-9]+)?$');

ALTER TABLE catalogo_items DROP CONSTRAINT IF EXISTS catalogo_items_dimension_check;
ALTER TABLE catalogo_items
  ADD CONSTRAINT catalogo_items_dimension_check
  CHECK (dimension ~* '^[0-9]+(\.[0-9]+)?x[0-9]+(\.[0-9]+)?$');

ALTER TABLE produccion DROP CONSTRAINT IF EXISTS produccion_dimension_check;
ALTER TABLE produccion
  ADD CONSTRAINT produccion_dimension_check
  CHECK (dimension ~* '^[0-9]+(\.[0-9]+)?x[0-9]+(\.[0-9]+)?$');

ALTER TABLE produccion_trabajadores DROP CONSTRAINT IF EXISTS produccion_trabajadores_dimension_check;
ALTER TABLE produccion_trabajadores
  ADD CONSTRAINT produccion_trabajadores_dimension_check
  CHECK (dimension ~* '^[0-9]+(\.[0-9]+)?x[0-9]+(\.[0-9]+)?$');

ALTER TABLE mermas DROP CONSTRAINT IF EXISTS mermas_dimension_check;
ALTER TABLE mermas
  ADD CONSTRAINT mermas_dimension_check
  CHECK (dimension ~* '^[0-9]+(\.[0-9]+)?x[0-9]+(\.[0-9]+)?$');

ALTER TABLE ventas ADD COLUMN IF NOT EXISTS fondo_desgaste_equipos NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS fondo_trabajadores NUMERIC(10,2) NOT NULL DEFAULT 0;

UPDATE ventas
SET
  total = ROUND((subtotal - (subtotal * (descuento / 100)))::numeric, 2),
  fondo_desgaste_equipos = ROUND(((subtotal - (subtotal * (descuento / 100))) * 0.10)::numeric, 2),
  fondo_trabajadores = ROUND(((subtotal - (subtotal * (descuento / 100))) * 0.05)::numeric, 2),
  fondo_operativo = ROUND(((subtotal - (subtotal * (descuento / 100))) * 0.15)::numeric, 2)
WHERE
  COALESCE(fondo_desgaste_equipos, 0) = 0
  AND COALESCE(fondo_trabajadores, 0) = 0;
