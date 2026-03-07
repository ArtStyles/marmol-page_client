-- Schema para la base de datos "marmol"
-- Ejecutar una vez en pgAdmin (o: psql -U usuario -d marmol -f schema.sql)

-- Configuración del sistema (una sola fila)
CREATE TABLE IF NOT EXISTS configuracion (
  id TEXT PRIMARY KEY DEFAULT 'default',
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

-- Trabajadores
CREATE TABLE IF NOT EXISTS trabajadores (
  id TEXT PRIMARY KEY,
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

-- Historial de pagos
CREATE TABLE IF NOT EXISTS historial_pagos (
  id TEXT PRIMARY KEY,
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
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usuarios de ejemplo (mismas credenciales que el mock del front; password en texto plano solo desarrollo)
INSERT INTO admin_users (id, name, email, password_hash, role) VALUES
  ('SUP-001', 'Super Admin', 'superadmin@marmol.local', 'super123', 'Super Admin'),
  ('ADM-001', 'Admin Principal', 'admin@marmol.local', 'admin123', 'Administrador'),
  ('CONT-001', 'Contadora General', 'contadora@marmol.local', 'conta123', 'Contadora'),
  ('VEN-001', 'Gestor de Ventas', 'ventas@marmol.local', 'ventas123', 'Gestor de Ventas'),
  ('PROD-001', 'Jefe de Turno', 'produccion@marmol.local', 'prod123', 'Jefe de Turno de Produccion'),
  ('OBR-001', 'Carlos Mendoza', 'carlos.mendoza@taller.com', 'obrero123', 'Obrero')
ON CONFLICT (email) DO NOTHING;

-- Secuencias para IDs (opcional; también se pueden generar en app)
-- INSERT inicial de configuración si no existe
INSERT INTO configuracion (id, tarifas_globales, salarios_fijos_por_rol, precios_m2, nombre_empresa, email, telefono, direccion)
SELECT 'default',
  '{"picar":400,"pulir":250,"escuadrar":100}'::jsonb,
  '{"Administrador":28000,"Gestor de Ventas":18000,"Jefe de Turno de Producción":22000}'::jsonb,
  '{"40x40":{"crudo":120,"pulido":180},"60x40":{"crudo":140,"pulido":200},"80x40":{"crudo":160,"pulido":220}}'::jsonb,
  'Mármoles Elegance',
  'info@marmoleselegance.com',
  '+52 555 123 4567',
  'Av. Principal 123, Col. Centro, CDMX'
WHERE NOT EXISTS (SELECT 1 FROM configuracion WHERE id = 'default');
