-- Optimiza paginacion por cursor en historial de movimientos por taller.
CREATE INDEX IF NOT EXISTS idx_inventario_movimientos_workshop_fecha_id_desc
  ON inventario_movimientos(workshop_id, fecha_solicitud DESC, id DESC);
