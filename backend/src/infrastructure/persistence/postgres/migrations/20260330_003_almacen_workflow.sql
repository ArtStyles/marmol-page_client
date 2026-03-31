-- Flujo de aprobaciones de taller/almacen e historial exclusivo de movimientos.

CREATE TABLE IF NOT EXISTS inventario_movimientos (
  id TEXT PRIMARY KEY,
  workshop_id TEXT NOT NULL DEFAULT 'TLR-001',
  fecha_solicitud TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_resolucion TIMESTAMPTZ,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida')),
  origen TEXT NOT NULL CHECK (origen IN ('produccion', 'venta', 'merma', 'proceso', 'ajuste')),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
  referencia_id TEXT,
  motivo TEXT NOT NULL,
  observaciones TEXT NOT NULL DEFAULT '',
  solicitado_por_id TEXT,
  solicitado_por_nombre TEXT,
  aprobado_por_id TEXT,
  aprobado_por_nombre TEXT,
  motivo_rechazo TEXT,
  detalles JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventario_movimientos_workshop_id
  ON inventario_movimientos(workshop_id);

ALTER TABLE produccion ADD COLUMN IF NOT EXISTS aprobacion_taller_estado TEXT NOT NULL DEFAULT 'pendiente';
ALTER TABLE produccion ADD COLUMN IF NOT EXISTS aprobacion_taller_por_id TEXT;
ALTER TABLE produccion ADD COLUMN IF NOT EXISTS aprobacion_taller_por_nombre TEXT;
ALTER TABLE produccion ADD COLUMN IF NOT EXISTS aprobacion_taller_fecha TIMESTAMPTZ;
ALTER TABLE produccion ADD COLUMN IF NOT EXISTS aprobacion_taller_motivo_rechazo TEXT;
ALTER TABLE produccion ADD COLUMN IF NOT EXISTS aprobacion_almacen_estado TEXT NOT NULL DEFAULT 'pendiente';
ALTER TABLE produccion ADD COLUMN IF NOT EXISTS aprobacion_almacen_por_id TEXT;
ALTER TABLE produccion ADD COLUMN IF NOT EXISTS aprobacion_almacen_por_nombre TEXT;
ALTER TABLE produccion ADD COLUMN IF NOT EXISTS aprobacion_almacen_fecha TIMESTAMPTZ;
ALTER TABLE produccion ADD COLUMN IF NOT EXISTS aprobacion_almacen_motivo TEXT;
ALTER TABLE produccion ADD COLUMN IF NOT EXISTS inventario_aplicado BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE produccion ADD COLUMN IF NOT EXISTS movimiento_inventario_ids JSONB NOT NULL DEFAULT '[]';

ALTER TABLE mermas ADD COLUMN IF NOT EXISTS estado_inventario TEXT NOT NULL DEFAULT 'pendiente';
ALTER TABLE mermas ADD COLUMN IF NOT EXISTS movimiento_inventario_id TEXT;

ALTER TABLE ventas ADD COLUMN IF NOT EXISTS motivo_movimiento_almacen TEXT;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS movimiento_inventario_id TEXT;

ALTER TABLE produccion DROP CONSTRAINT IF EXISTS produccion_aprobacion_taller_estado_check;
ALTER TABLE produccion
  ADD CONSTRAINT produccion_aprobacion_taller_estado_check
  CHECK (aprobacion_taller_estado IN ('pendiente', 'aprobado', 'rechazado'));

ALTER TABLE produccion DROP CONSTRAINT IF EXISTS produccion_aprobacion_almacen_estado_check;
ALTER TABLE produccion
  ADD CONSTRAINT produccion_aprobacion_almacen_estado_check
  CHECK (aprobacion_almacen_estado IN ('pendiente', 'aprobado', 'rechazado'));

ALTER TABLE mermas DROP CONSTRAINT IF EXISTS mermas_estado_inventario_check;
ALTER TABLE mermas
  ADD CONSTRAINT mermas_estado_inventario_check
  CHECK (estado_inventario IN ('pendiente', 'aprobado', 'rechazado'));

ALTER TABLE ventas DROP CONSTRAINT IF EXISTS ventas_estado_check;
ALTER TABLE ventas
  ADD CONSTRAINT ventas_estado_check
  CHECK (estado IN ('pendiente', 'completada', 'cancelada', 'pendiente_aprobacion_almacen'));

INSERT INTO admin_permission_definitions (code, module, name, description) VALUES
  ('inventario:approve', 'inventario', 'Aprobar movimientos de almacen', 'Aprobar o rechazar entradas y salidas de almacen.'),
  ('produccion:approve_taller', 'produccion', 'Aprobar produccion de taller', 'Aprobar o rechazar registros de produccion diaria del taller.')
ON CONFLICT (code) DO UPDATE
SET
  module = EXCLUDED.module,
  name = EXCLUDED.name,
  description = EXCLUDED.description;

INSERT INTO admin_permission_groups (id, name, description, is_system, system_key) VALUES
  ('grp_almacen', 'Jefe de Almacen', 'Control exclusivo de movimientos y aprobaciones de almacen.', true, 'role:almacen')
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_system = true,
  system_key = EXCLUDED.system_key;

INSERT INTO admin_permission_group_permissions (group_id, permission_code) VALUES
  ('grp_almacen', 'dashboard:view'),
  ('grp_almacen', 'inventario:read'),
  ('grp_almacen', 'inventario:write'),
  ('grp_almacen', 'inventario:approve'),
  ('grp_almacen', 'produccion:read'),
  ('grp_almacen', 'ventas:read'),
  ('grp_almacen', 'mermas:read'),
  ('grp_almacen', 'historial:read'),
  ('grp_administrador', 'inventario:approve'),
  ('grp_administrador', 'produccion:approve_taller'),
  ('grp_produccion', 'produccion:approve_taller')
ON CONFLICT DO NOTHING;

INSERT INTO admin_user_permission_groups (user_id, group_id)
SELECT u.id, 'grp_almacen'
FROM admin_users u
WHERE u.role = 'Jefe de Almacen'
ON CONFLICT DO NOTHING;

