-- Schema para la base de datos "marmol"
-- Ejecutar una vez en pgAdmin (o: psql -U usuario -d marmol -f schema.sql)

-- Configuración del sistema (una sola fila)
CREATE TABLE IF NOT EXISTS configuracion (
  id TEXT PRIMARY KEY DEFAULT 'default',
  workshop_id TEXT NOT NULL DEFAULT 'TLR-001',
  tarifas_globales JSONB NOT NULL DEFAULT '{"picar":400,"pulir":250,"escuadrar":100}',
  salarios_fijos_por_rol JSONB NOT NULL DEFAULT '{}',
  precios_m2 JSONB NOT NULL DEFAULT '{}',
  nombre_empresa TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  telefono TEXT NOT NULL DEFAULT '',
  direccion TEXT NOT NULL DEFAULT '',
  notificaciones_email BOOLEAN NOT NULL DEFAULT true,
  alertas_stock_bajo BOOLEAN NOT NULL DEFAULT true,
  reportes_ventas BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bloques y lotes
CREATE TABLE IF NOT EXISTS bloques (
  id TEXT PRIMARY KEY,
  workshop_id TEXT NOT NULL DEFAULT 'TLR-001',
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('Bloque', 'Lote')),
  dimension_base TEXT NOT NULL CHECK (dimension_base IN ('40x40', '60x40', '80x40')),
  costo NUMERIC(14,2) NOT NULL,
  costo_transporte NUMERIC(14,2) NOT NULL,
  metros_comprados NUMERIC(10,2) NOT NULL,
  fecha_ingreso DATE NOT NULL,
  proveedor TEXT NOT NULL,
  losas_producidas INTEGER NOT NULL DEFAULT 0,
  losas_perdidas INTEGER NOT NULL DEFAULT 0,
  metros_vendibles NUMERIC(10,2) NOT NULL DEFAULT 0,
  ganancia_real NUMERIC(14,2) NOT NULL DEFAULT 0,
  estado TEXT NOT NULL CHECK (estado IN ('activo', 'agotado')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Productos
CREATE TABLE IF NOT EXISTS productos (
  id TEXT PRIMARY KEY,
  workshop_id TEXT NOT NULL DEFAULT 'TLR-001',
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('Piso', 'Plancha')),
  estado TEXT NOT NULL CHECK (estado IN ('Picado', 'Pulido', 'Escuadrado')),
  dimension TEXT NOT NULL CHECK (dimension IN ('40x40', '60x40', '80x40')),
  origen_id TEXT NOT NULL,
  origen_nombre TEXT NOT NULL,
  cantidad_losas INTEGER NOT NULL,
  metros_cuadrados NUMERIC(10,2) NOT NULL,
  precio_m2 NUMERIC(10,2) NOT NULL,
  imagen TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Catalogo comercial (landing)
CREATE TABLE IF NOT EXISTS catalogo_items (
  id TEXT PRIMARY KEY,
  workshop_id TEXT NOT NULL DEFAULT 'TLR-001',
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('Piso', 'Plancha')),
  acabado TEXT NOT NULL CHECK (acabado IN ('Crudo', 'Pulido')),
  dimension TEXT NOT NULL CHECK (dimension IN ('40x40', '60x40', '80x40')),
  precio_m2 NUMERIC(10,2) NOT NULL,
  stock_losas INTEGER NOT NULL DEFAULT 0,
  destacado BOOLEAN NOT NULL DEFAULT false,
  descripcion TEXT NOT NULL DEFAULT '',
  imagen TEXT NOT NULL DEFAULT '',
  visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trabajadores
CREATE TABLE IF NOT EXISTS trabajadores (
  id TEXT PRIMARY KEY,
  workshop_id TEXT NOT NULL DEFAULT 'TLR-001',
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  telefono TEXT NOT NULL DEFAULT '',
  rol TEXT NOT NULL,
  fecha_ingreso DATE NOT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('activo', 'inactivo')),
  usuario TEXT,
  contrasena TEXT,
  tarifas_personalizadas JSONB,
  losas_producidas INTEGER NOT NULL DEFAULT 0,
  pagos_totales NUMERIC(14,2) NOT NULL DEFAULT 0,
  bonos_totales NUMERIC(14,2) NOT NULL DEFAULT 0,
  acumulado_pendiente NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Equipos
CREATE TABLE IF NOT EXISTS equipos (
  id TEXT PRIMARY KEY,
  workshop_id TEXT NOT NULL DEFAULT 'TLR-001',
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('Pulidora', 'Cortadora', 'Escuadradora')),
  codigo_interno TEXT NOT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('activo', 'mantenimiento', 'inactivo')),
  notas TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Producción diaria
CREATE TABLE IF NOT EXISTS produccion (
  id TEXT PRIMARY KEY,
  workshop_id TEXT NOT NULL DEFAULT 'TLR-001',
  fecha DATE NOT NULL,
  origen_id TEXT NOT NULL,
  origen_nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('Piso', 'Plancha')),
  dimension TEXT NOT NULL CHECK (dimension IN ('40x40', '60x40', '80x40')),
  cantidad_picar INTEGER NOT NULL DEFAULT 0,
  cantidad_pulir INTEGER NOT NULL DEFAULT 0,
  cantidad_escuadrar INTEGER NOT NULL DEFAULT 0,
  total_losas INTEGER NOT NULL,
  total_m2 NUMERIC(10,2) NOT NULL,
  detalles_acciones JSONB,
  can_edit BOOLEAN,
  editable_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Producción por trabajador
CREATE TABLE IF NOT EXISTS produccion_trabajadores (
  id TEXT PRIMARY KEY,
  workshop_id TEXT NOT NULL DEFAULT 'TLR-001',
  fecha DATE NOT NULL,
  trabajador_id TEXT NOT NULL,
  trabajador_nombre TEXT NOT NULL,
  accion TEXT NOT NULL CHECK (accion IN ('picar', 'pulir', 'escuadrar')),
  origen_id TEXT NOT NULL,
  origen_nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('Piso', 'Plancha')),
  dimension TEXT NOT NULL CHECK (dimension IN ('40x40', '60x40', '80x40')),
  cantidad_losas INTEGER NOT NULL,
  pago_por_losa NUMERIC(10,2) NOT NULL,
  pago_total NUMERIC(14,2) NOT NULL,
  bono NUMERIC(14,2) NOT NULL DEFAULT 0,
  pago_final NUMERIC(14,2) NOT NULL,
  pagado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mermas
CREATE TABLE IF NOT EXISTS mermas (
  id TEXT PRIMARY KEY,
  workshop_id TEXT NOT NULL DEFAULT 'TLR-001',
  fecha DATE NOT NULL,
  origen_id TEXT NOT NULL,
  origen_nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('Piso', 'Plancha')),
  dimension TEXT NOT NULL CHECK (dimension IN ('40x40', '60x40', '80x40')),
  cantidad_losas INTEGER NOT NULL,
  metros_cuadrados NUMERIC(10,2) NOT NULL,
  motivo TEXT NOT NULL,
  observaciones TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ventas
CREATE TABLE IF NOT EXISTS ventas (
  id TEXT PRIMARY KEY,
  workshop_id TEXT NOT NULL DEFAULT 'TLR-001',
  producto_id TEXT NOT NULL,
  producto_nombre TEXT NOT NULL,
  detalles_productos JSONB,
  cantidad_m2 NUMERIC(10,2) NOT NULL,
  metros_por_dimension JSONB NOT NULL,
  precio_m2 NUMERIC(10,2) NOT NULL,
  descuento NUMERIC(10,2) NOT NULL DEFAULT 0,
  fondo_operativo NUMERIC(10,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(14,2) NOT NULL,
  total NUMERIC(14,2) NOT NULL,
  cliente_nombre TEXT NOT NULL,
  cliente_email TEXT NOT NULL,
  cliente_telefono TEXT NOT NULL,
  fecha DATE NOT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('pendiente', 'completada', 'cancelada')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gastos operativos
CREATE TABLE IF NOT EXISTS gastos (
  id TEXT PRIMARY KEY,
  workshop_id TEXT NOT NULL DEFAULT 'TLR-001',
  fecha DATE NOT NULL,
  costo NUMERIC(14,2) NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('Materia prima', 'Transporte', 'Servicios', 'Mantenimiento', 'Nomina', 'Operacion', 'Imprevisto')),
  flujo TEXT NOT NULL CHECK (flujo IN ('Produccion', 'Inventario', 'Ventas', 'Administracion', 'General')),
  descripcion TEXT NOT NULL,
  encargado TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Historial de pagos
CREATE TABLE IF NOT EXISTS historial_pagos (
  id TEXT PRIMARY KEY,
  workshop_id TEXT NOT NULL DEFAULT 'TLR-001',
  trabajador_id TEXT NOT NULL,
  trabajador_nombre TEXT NOT NULL,
  fecha DATE NOT NULL,
  produccion_ids JSONB NOT NULL DEFAULT '[]',
  monto_acciones NUMERIC(14,2) NOT NULL,
  monto_bonos NUMERIC(14,2) NOT NULL DEFAULT 0,
  bono_extra NUMERIC(14,2) NOT NULL DEFAULT 0,
  motivo_bono_extra TEXT NOT NULL DEFAULT '',
  total_pagado NUMERIC(14,2) NOT NULL,
  observaciones TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Logs del sistema
CREATE TABLE IF NOT EXISTS system_logs (
  id TEXT PRIMARY KEY,
  workshop_id TEXT NOT NULL DEFAULT 'TLR-001',
  fecha TEXT NOT NULL,
  usuario TEXT NOT NULL,
  accion TEXT NOT NULL,
  modulo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  nivel TEXT NOT NULL CHECK (nivel IN ('info', 'alerta', 'error')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Talleres (workshops)
CREATE TABLE IF NOT EXISTS workshops (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  ciudad TEXT NOT NULL,
  direccion TEXT NOT NULL DEFAULT '',
  encargado TEXT NOT NULL,
  telefono TEXT NOT NULL DEFAULT '',
  correo TEXT NOT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('activo', 'en-implementacion', 'pausado')),
  empleados INTEGER NOT NULL DEFAULT 0,
  capacidad_m2_mes NUMERIC(14,2) NOT NULL DEFAULT 0,
  ventas_mes NUMERIC(14,2) NOT NULL DEFAULT 0,
  produccion_mes_m2 NUMERIC(14,2) NOT NULL DEFAULT 0,
  margen_operativo NUMERIC(5,4) NOT NULL DEFAULT 0,
  ordenes_activas INTEGER NOT NULL DEFAULT 0,
  ultima_actualizacion TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usuarios admin (login)
CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  workshop_id TEXT NOT NULL DEFAULT 'TLR-001',
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Catalogo de permisos
CREATE TABLE IF NOT EXISTS admin_permission_definitions (
  code TEXT PRIMARY KEY,
  module TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT ''
);

-- Grupos de permisos
CREATE TABLE IF NOT EXISTS admin_permission_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_system BOOLEAN NOT NULL DEFAULT false,
  system_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_permission_groups_name_lower
  ON admin_permission_groups (LOWER(name));

-- Relacion grupo -> permisos
CREATE TABLE IF NOT EXISTS admin_permission_group_permissions (
  group_id TEXT NOT NULL REFERENCES admin_permission_groups(id) ON DELETE CASCADE,
  permission_code TEXT NOT NULL REFERENCES admin_permission_definitions(code) ON DELETE CASCADE,
  PRIMARY KEY (group_id, permission_code)
);

-- Relacion usuario -> grupos
CREATE TABLE IF NOT EXISTS admin_user_permission_groups (
  user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  group_id TEXT NOT NULL REFERENCES admin_permission_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_user_permission_groups_group
  ON admin_user_permission_groups (group_id);

-- Permisos directos por usuario
CREATE TABLE IF NOT EXISTS admin_user_permissions (
  user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  permission_code TEXT NOT NULL REFERENCES admin_permission_definitions(code) ON DELETE CASCADE,
  PRIMARY KEY (user_id, permission_code)
);

-- Compatibilidad para bases existentes sin workshop_id
ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS workshop_id TEXT NOT NULL DEFAULT 'TLR-001';
ALTER TABLE bloques ADD COLUMN IF NOT EXISTS workshop_id TEXT NOT NULL DEFAULT 'TLR-001';
ALTER TABLE productos ADD COLUMN IF NOT EXISTS workshop_id TEXT NOT NULL DEFAULT 'TLR-001';
ALTER TABLE catalogo_items ADD COLUMN IF NOT EXISTS workshop_id TEXT NOT NULL DEFAULT 'TLR-001';
ALTER TABLE trabajadores ADD COLUMN IF NOT EXISTS workshop_id TEXT NOT NULL DEFAULT 'TLR-001';
ALTER TABLE equipos ADD COLUMN IF NOT EXISTS workshop_id TEXT NOT NULL DEFAULT 'TLR-001';
ALTER TABLE produccion ADD COLUMN IF NOT EXISTS workshop_id TEXT NOT NULL DEFAULT 'TLR-001';
ALTER TABLE produccion_trabajadores ADD COLUMN IF NOT EXISTS workshop_id TEXT NOT NULL DEFAULT 'TLR-001';
ALTER TABLE mermas ADD COLUMN IF NOT EXISTS workshop_id TEXT NOT NULL DEFAULT 'TLR-001';
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS workshop_id TEXT NOT NULL DEFAULT 'TLR-001';
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS workshop_id TEXT NOT NULL DEFAULT 'TLR-001';
ALTER TABLE historial_pagos ADD COLUMN IF NOT EXISTS workshop_id TEXT NOT NULL DEFAULT 'TLR-001';
ALTER TABLE system_logs ADD COLUMN IF NOT EXISTS workshop_id TEXT NOT NULL DEFAULT 'TLR-001';
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS workshop_id TEXT NOT NULL DEFAULT 'TLR-001';

CREATE INDEX IF NOT EXISTS idx_configuracion_workshop_id ON configuracion(workshop_id);
CREATE INDEX IF NOT EXISTS idx_bloques_workshop_id ON bloques(workshop_id);
CREATE INDEX IF NOT EXISTS idx_productos_workshop_id ON productos(workshop_id);
CREATE INDEX IF NOT EXISTS idx_catalogo_items_workshop_id ON catalogo_items(workshop_id);
CREATE INDEX IF NOT EXISTS idx_trabajadores_workshop_id ON trabajadores(workshop_id);
CREATE INDEX IF NOT EXISTS idx_equipos_workshop_id ON equipos(workshop_id);
CREATE INDEX IF NOT EXISTS idx_produccion_workshop_id ON produccion(workshop_id);
CREATE INDEX IF NOT EXISTS idx_produccion_trabajadores_workshop_id ON produccion_trabajadores(workshop_id);
CREATE INDEX IF NOT EXISTS idx_mermas_workshop_id ON mermas(workshop_id);
CREATE INDEX IF NOT EXISTS idx_ventas_workshop_id ON ventas(workshop_id);
CREATE INDEX IF NOT EXISTS idx_gastos_workshop_id ON gastos(workshop_id);
CREATE INDEX IF NOT EXISTS idx_historial_pagos_workshop_id ON historial_pagos(workshop_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_workshop_id ON system_logs(workshop_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_workshop_id ON admin_users(workshop_id);

-- Seed minimo: solo usuarios para autenticacion (sin datos operativos demo)
-- Password en texto plano solo para desarrollo local.
INSERT INTO admin_users (id, name, email, workshop_id, password_hash, role) VALUES
  ('SUP-001', 'Super Admin', 'superadmin@marmol.local', 'TLR-001', 'super123', 'Super Admin'),
  ('ADM-001', 'Admin Principal', 'admin@marmol.local', 'TLR-001', 'admin123', 'Administrador'),
  ('CONT-001', 'Contadora General', 'contadora@marmol.local', 'TLR-001', 'conta123', 'Contadora'),
  ('VEN-001', 'Gestor de Ventas', 'ventas@marmol.local', 'TLR-001', 'ventas123', 'Gestor de Ventas'),
  ('PROD-001', 'Jefe de Turno', 'produccion@marmol.local', 'TLR-001', 'prod123', 'Jefe de Turno de Produccion'),
  ('OBR-001', 'Carlos Mendoza', 'carlos.mendoza@taller.com', 'TLR-001', 'obrero123', 'Obrero'),
  ('ADM-002', 'Admin Guadalajara', 'admin.gdl@marmol.local', 'TLR-002', 'admingdl123', 'Administrador'),
  ('ADM-003', 'Admin Monterrey', 'admin.mty@marmol.local', 'TLR-003', 'adminmty123', 'Administrador')
ON CONFLICT (email) DO NOTHING;

INSERT INTO admin_permission_definitions (code, module, name, description) VALUES
  ('dashboard:view', 'dashboard', 'Ver dashboard', 'Acceso al panel principal.'),
  ('inventario:read', 'inventario', 'Ver inventario', 'Consultar inventario y productos.'),
  ('inventario:write', 'inventario', 'Editar inventario', 'Crear, editar y eliminar productos de inventario.'),
  ('produccion:read', 'produccion', 'Ver produccion', 'Consultar produccion diaria.'),
  ('produccion:write', 'produccion', 'Editar produccion', 'Registrar y modificar produccion diaria.'),
  ('equipos:read', 'equipos', 'Ver equipos', 'Consultar equipos operativos.'),
  ('equipos:write', 'equipos', 'Editar equipos', 'Crear, editar y eliminar equipos.'),
  ('asignaciones:read', 'asignaciones', 'Ver asignaciones', 'Consultar asignaciones de produccion.'),
  ('asignaciones:write', 'asignaciones', 'Editar asignaciones', 'Crear y modificar asignaciones.'),
  ('ventas:read', 'ventas', 'Ver ventas', 'Consultar ventas y estado comercial.'),
  ('ventas:write', 'ventas', 'Editar ventas', 'Crear y modificar ventas.'),
  ('finanzas:read', 'finanzas', 'Ver finanzas', 'Consultar KPIs y panel financiero.'),
  ('gastos:read', 'gastos', 'Ver gastos', 'Consultar gastos operativos.'),
  ('gastos:write', 'gastos', 'Editar gastos', 'Registrar y modificar gastos.'),
  ('contabilidad:read', 'contabilidad', 'Ver contabilidad', 'Consultar reportes contables.'),
  ('bloques:read', 'bloques', 'Ver materia prima', 'Consultar bloques y lotes.'),
  ('bloques:write', 'bloques', 'Editar materia prima', 'Crear, editar y eliminar bloques/lotes.'),
  ('mermas:read', 'mermas', 'Ver mermas', 'Consultar mermas.'),
  ('mermas:write', 'mermas', 'Editar mermas', 'Registrar y modificar mermas.'),
  ('catalogo:read', 'catalogo', 'Ver catalogo', 'Consultar catalogo comercial.'),
  ('catalogo:write', 'catalogo', 'Editar catalogo', 'Crear, editar y eliminar items de catalogo.'),
  ('historial:read', 'historial', 'Ver historial', 'Consultar historial y bitacora.'),
  ('historial:write', 'historial', 'Editar historial', 'Registrar eventos de historial.'),
  ('trabajadores:read', 'trabajadores', 'Ver trabajadores', 'Consultar trabajadores.'),
  ('trabajadores:write', 'trabajadores', 'Editar trabajadores', 'Crear, editar y eliminar trabajadores.'),
  ('pagos:read', 'pagos', 'Ver pagos', 'Consultar historial de pagos.'),
  ('pagos:write', 'pagos', 'Editar pagos', 'Registrar y modificar pagos.'),
  ('configuracion:read', 'configuracion', 'Ver configuracion', 'Consultar configuracion del sistema.'),
  ('configuracion:write', 'configuracion', 'Editar configuracion', 'Actualizar configuracion del sistema.'),
  ('workshops:read', 'workshops', 'Ver talleres', 'Consultar talleres.'),
  ('workshops:write', 'workshops', 'Editar talleres', 'Crear, editar y eliminar talleres.'),
  ('workshops:override_scope', 'workshops', 'Cambiar alcance de taller', 'Permite cambiar el taller activo en sesion.'),
  ('permissions:read', 'permissions', 'Ver permisos', 'Consultar catalogo de permisos y grupos.'),
  ('permissions:write', 'permissions', 'Editar permisos', 'Crear, editar y eliminar grupos de permisos.'),
  ('users:access:read', 'permissions', 'Ver accesos de usuarios', 'Consultar permisos asignados por usuario.'),
  ('users:access:write', 'permissions', 'Editar accesos de usuarios', 'Asignar grupos y permisos directos a usuarios.'),
  ('obrero:panel:view', 'obrero', 'Ver panel obrero', 'Acceso al panel operativo de obrero.')
ON CONFLICT (code) DO UPDATE
SET
  module = EXCLUDED.module,
  name = EXCLUDED.name,
  description = EXCLUDED.description;

INSERT INTO admin_permission_groups (id, name, description, is_system, system_key) VALUES
  ('grp_super_admin', 'Super Admin', 'Acceso total a todos los modulos y alcance multi-taller.', true, 'role:super_admin'),
  ('grp_administrador', 'Administrador', 'Gestion operativa completa y administracion de accesos.', true, 'role:administrador'),
  ('grp_contadora', 'Contadora', 'Acceso de consulta contable y financiera.', true, 'role:contadora'),
  ('grp_ventas', 'Gestor de Ventas', 'Operacion comercial y seguimiento de pagos.', true, 'role:ventas'),
  ('grp_produccion', 'Jefe de Turno de Produccion', 'Operacion de produccion, equipos, asignaciones y mermas.', true, 'role:produccion'),
  ('grp_obrero', 'Obrero', 'Acceso a su panel operativo y consulta de su produccion/pagos.', true, 'role:obrero')
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_system = true,
  system_key = EXCLUDED.system_key;

DELETE FROM admin_permission_group_permissions
WHERE group_id IN (
  'grp_super_admin',
  'grp_administrador',
  'grp_contadora',
  'grp_ventas',
  'grp_produccion',
  'grp_obrero'
);

INSERT INTO admin_permission_group_permissions (group_id, permission_code)
SELECT 'grp_super_admin', code
FROM admin_permission_definitions
ON CONFLICT DO NOTHING;

INSERT INTO admin_permission_group_permissions (group_id, permission_code) VALUES
  ('grp_administrador', 'dashboard:view'),
  ('grp_administrador', 'inventario:read'),
  ('grp_administrador', 'inventario:write'),
  ('grp_administrador', 'produccion:read'),
  ('grp_administrador', 'produccion:write'),
  ('grp_administrador', 'equipos:read'),
  ('grp_administrador', 'equipos:write'),
  ('grp_administrador', 'asignaciones:read'),
  ('grp_administrador', 'asignaciones:write'),
  ('grp_administrador', 'ventas:read'),
  ('grp_administrador', 'ventas:write'),
  ('grp_administrador', 'finanzas:read'),
  ('grp_administrador', 'gastos:read'),
  ('grp_administrador', 'gastos:write'),
  ('grp_administrador', 'contabilidad:read'),
  ('grp_administrador', 'bloques:read'),
  ('grp_administrador', 'bloques:write'),
  ('grp_administrador', 'mermas:read'),
  ('grp_administrador', 'mermas:write'),
  ('grp_administrador', 'catalogo:read'),
  ('grp_administrador', 'catalogo:write'),
  ('grp_administrador', 'historial:read'),
  ('grp_administrador', 'historial:write'),
  ('grp_administrador', 'trabajadores:read'),
  ('grp_administrador', 'trabajadores:write'),
  ('grp_administrador', 'pagos:read'),
  ('grp_administrador', 'pagos:write'),
  ('grp_administrador', 'configuracion:read'),
  ('grp_administrador', 'configuracion:write'),
  ('grp_administrador', 'workshops:read'),
  ('grp_administrador', 'permissions:read'),
  ('grp_administrador', 'permissions:write'),
  ('grp_administrador', 'users:access:read'),
  ('grp_administrador', 'users:access:write'),

  ('grp_contadora', 'dashboard:view'),
  ('grp_contadora', 'contabilidad:read'),
  ('grp_contadora', 'finanzas:read'),
  ('grp_contadora', 'gastos:read'),
  ('grp_contadora', 'pagos:read'),
  ('grp_contadora', 'historial:read'),

  ('grp_ventas', 'dashboard:view'),
  ('grp_ventas', 'ventas:read'),
  ('grp_ventas', 'ventas:write'),
  ('grp_ventas', 'catalogo:read'),
  ('grp_ventas', 'pagos:read'),
  ('grp_ventas', 'historial:read'),
  ('grp_ventas', 'inventario:read'),

  ('grp_produccion', 'dashboard:view'),
  ('grp_produccion', 'produccion:read'),
  ('grp_produccion', 'produccion:write'),
  ('grp_produccion', 'equipos:read'),
  ('grp_produccion', 'equipos:write'),
  ('grp_produccion', 'asignaciones:read'),
  ('grp_produccion', 'asignaciones:write'),
  ('grp_produccion', 'mermas:read'),
  ('grp_produccion', 'mermas:write'),
  ('grp_produccion', 'bloques:read'),
  ('grp_produccion', 'inventario:read'),
  ('grp_produccion', 'historial:read'),

  ('grp_obrero', 'obrero:panel:view'),
  ('grp_obrero', 'asignaciones:read'),
  ('grp_obrero', 'pagos:read'),
  ('grp_obrero', 'trabajadores:read')
ON CONFLICT DO NOTHING;

WITH role_group_map AS (
  SELECT
    u.id AS user_id,
    CASE
      WHEN u.role = 'Super Admin' THEN 'grp_super_admin'
      WHEN u.role = 'Administrador' THEN 'grp_administrador'
      WHEN u.role = 'Contadora' THEN 'grp_contadora'
      WHEN u.role = 'Gestor de Ventas' THEN 'grp_ventas'
      WHEN u.role = 'Jefe de Turno de Produccion' THEN 'grp_produccion'
      WHEN u.role = 'Jefe de Turno de Producción' THEN 'grp_produccion'
      WHEN u.role = 'Obrero' THEN 'grp_obrero'
      ELSE NULL
    END AS group_id
  FROM admin_users u
)
INSERT INTO admin_user_permission_groups (user_id, group_id)
SELECT m.user_id, m.group_id
FROM role_group_map m
WHERE m.group_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM admin_user_permission_groups aug
    WHERE aug.user_id = m.user_id
  )
ON CONFLICT DO NOTHING;
