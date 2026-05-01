-- Limpieza operativa completa conservando acceso al sistema.
-- Preserva: admin_users, permisos, workshops, configuracion y schema_migrations.
-- Elimina: datos operativos, catalogos de trabajo e historial ruidoso.

TRUNCATE TABLE
  produccion_trabajadores,
  produccion,
  mono_hilo_masas,
  inventario_movimientos,
  ventas,
  historial_pagos,
  mermas,
  gastos,
  productos,
  bloques,
  catalogo_items,
  equipos,
  trabajadores,
  system_logs;

-- Recalcula el punto de partida visual de los talleres que se conservan.
UPDATE workshops
SET
  empleados = 0,
  ventas_mes = 0,
  produccion_mes_m2 = 0,
  margen_operativo = 0,
  ordenes_activas = 0,
  ultima_actualizacion = CURRENT_DATE::text;
