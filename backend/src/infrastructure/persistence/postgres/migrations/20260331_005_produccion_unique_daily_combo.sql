-- Evita duplicados en produccion por taller/fecha/origen/tipo/dimension.
-- Tambien limpia duplicados historicos conservando el registro mas relevante.

DO $$
BEGIN
  IF to_regclass('public.produccion') IS NULL THEN
    RAISE EXCEPTION 'La tabla produccion no existe. Ejecuta db:setup antes de esta migracion.';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.inventario_movimientos') IS NOT NULL THEN
    WITH ranked AS (
      SELECT
        p.id,
        p.workshop_id,
        p.fecha,
        p.origen_id,
        p.tipo,
        p.dimension,
        ROW_NUMBER() OVER (
          PARTITION BY p.workshop_id, p.fecha, p.origen_id, p.tipo, p.dimension
          ORDER BY
            CASE WHEN p.inventario_aplicado THEN 1 ELSE 0 END DESC,
            CASE p.aprobacion_almacen_estado
              WHEN 'aprobado' THEN 2
              WHEN 'pendiente' THEN 1
              ELSE 0
            END DESC,
            CASE p.aprobacion_taller_estado
              WHEN 'aprobado' THEN 2
              WHEN 'pendiente' THEN 1
              ELSE 0
            END DESC,
            p.created_at DESC NULLS LAST,
            p.id DESC
        ) AS rn
      FROM produccion p
    ),
    keepers AS (
      SELECT
        workshop_id,
        fecha,
        origen_id,
        tipo,
        dimension,
        id AS keep_id
      FROM ranked
      WHERE rn = 1
    ),
    dups AS (
      SELECT
        r.id AS drop_id,
        k.keep_id
      FROM ranked r
      JOIN keepers k
        ON k.workshop_id = r.workshop_id
       AND k.fecha = r.fecha
       AND k.origen_id = r.origen_id
       AND k.tipo = r.tipo
       AND k.dimension = r.dimension
      WHERE r.rn > 1
    )
    UPDATE inventario_movimientos im
    SET referencia_id = d.keep_id
    FROM dups d
    WHERE im.origen = 'produccion'
      AND im.referencia_id = d.drop_id;
  END IF;
END $$;

WITH ranked AS (
  SELECT
    p.id,
    ROW_NUMBER() OVER (
      PARTITION BY p.workshop_id, p.fecha, p.origen_id, p.tipo, p.dimension
      ORDER BY
        CASE WHEN p.inventario_aplicado THEN 1 ELSE 0 END DESC,
        CASE p.aprobacion_almacen_estado
          WHEN 'aprobado' THEN 2
          WHEN 'pendiente' THEN 1
          ELSE 0
        END DESC,
        CASE p.aprobacion_taller_estado
          WHEN 'aprobado' THEN 2
          WHEN 'pendiente' THEN 1
          ELSE 0
        END DESC,
        p.created_at DESC NULLS LAST,
        p.id DESC
    ) AS rn
  FROM produccion p
)
DELETE FROM produccion p
USING ranked r
WHERE p.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_produccion_unique_daily_combo
  ON produccion (workshop_id, fecha, origen_id, tipo, dimension);
