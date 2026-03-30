-- Sistema de permisos flexible (grupos + permisos directos por usuario)

CREATE TABLE IF NOT EXISTS admin_permission_definitions (
  code TEXT PRIMARY KEY,
  module TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT ''
);

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

CREATE TABLE IF NOT EXISTS admin_permission_group_permissions (
  group_id TEXT NOT NULL REFERENCES admin_permission_groups(id) ON DELETE CASCADE,
  permission_code TEXT NOT NULL REFERENCES admin_permission_definitions(code) ON DELETE CASCADE,
  PRIMARY KEY (group_id, permission_code)
);

CREATE TABLE IF NOT EXISTS admin_user_permission_groups (
  user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  group_id TEXT NOT NULL REFERENCES admin_permission_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_user_permission_groups_group
  ON admin_user_permission_groups (group_id);

CREATE TABLE IF NOT EXISTS admin_user_permissions (
  user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  permission_code TEXT NOT NULL REFERENCES admin_permission_definitions(code) ON DELETE CASCADE,
  PRIMARY KEY (user_id, permission_code)
);

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
