import type { VentaRepositoryPort } from '../../../domain/ports/index.js'
import type { Venta } from '../../../domain/entities/index.js'
import { getPool } from './connection.js'
import { nextId, toDateOnly, toTimestampIso } from './helpers.js'
import { getCurrentWorkshopId } from './tenant.js'

function rowToVenta(r: Record<string, unknown>): Venta {
  return {
    id: r.id as string,
    createdAt: toTimestampIso(r.created_at),
    creadoPorId: (r.creado_por_id as string | null) ?? undefined,
    creadoPorNombre: (r.creado_por_nombre as string | null) ?? undefined,
    bloqueId: (r.bloque_id as string | null) ?? undefined,
    bloqueCodigo: (r.bloque_codigo as string | null) ?? undefined,
    productoId: r.producto_id as string,
    productoNombre: r.producto_nombre as string,
    detallesProductos: r.detalles_productos as Venta['detallesProductos'],
    cantidadM2: Number(r.cantidad_m2),
    metrosPorDimension: r.metros_por_dimension as Venta['metrosPorDimension'],
    precioM2: Number(r.precio_m2),
    descuento: Number(r.descuento),
    fondoDesgasteEquipos: Number(r.fondo_desgaste_equipos ?? 0),
    fondoTrabajadores: Number(r.fondo_trabajadores ?? 0),
    fondoOperativo: Number(r.fondo_operativo),
    subtotal: Number(r.subtotal),
    total: Number(r.total),
    clienteNombre: r.cliente_nombre as string,
    clienteEmail: r.cliente_email as string,
    clienteTelefono: r.cliente_telefono as string,
    observaciones: (r.observaciones as string | null) ?? undefined,
    responsableValidacionId: (r.responsable_validacion_id as string | null) ?? undefined,
    responsableValidacionNombre:
      (r.responsable_validacion_nombre as string | null) ?? undefined,
    fechaLiquidacion: toDateOnly(r.fecha_liquidacion) || undefined,
    fecha: toDateOnly(r.fecha),
    estado: r.estado as Venta['estado'],
    motivoMovimientoAlmacen: (r.motivo_movimiento_almacen as string | null) ?? undefined,
    movimientoInventarioId: (r.movimiento_inventario_id as string | null) ?? undefined,
  }
}

export class PostgresVentaRepository implements VentaRepositoryPort {
  async findAll(): Promise<Venta[]> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const r = await pool.query('SELECT * FROM ventas WHERE workshop_id = $1 ORDER BY fecha DESC, id', [
      workshopId,
    ])
    return r.rows.map(rowToVenta)
  }

  async findById(id: string): Promise<Venta | null> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const r = await pool.query('SELECT * FROM ventas WHERE id = $1 AND workshop_id = $2', [
      id,
      workshopId,
    ])
    if (r.rows.length === 0) return null
    return rowToVenta(r.rows[0])
  }

  async create(data: Omit<Venta, 'id'>): Promise<Venta> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const id = await nextId(pool, 'V', 'ventas')
    await pool.query(
      `INSERT INTO ventas (
        id, workshop_id, bloque_id, bloque_codigo, producto_id, producto_nombre, detalles_productos, cantidad_m2,
        metros_por_dimension, precio_m2, descuento, fondo_desgaste_equipos, fondo_trabajadores, fondo_operativo,
        subtotal, total, cliente_nombre, cliente_email, cliente_telefono, observaciones,
        responsable_validacion_id, responsable_validacion_nombre, fecha_liquidacion, fecha, estado,
        motivo_movimiento_almacen, movimiento_inventario_id, creado_por_id, creado_por_nombre
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29)`,
      [
        id,
        workshopId,
        data.bloqueId ?? null,
        data.bloqueCodigo ?? null,
        data.productoId,
        data.productoNombre,
        data.detallesProductos ? JSON.stringify(data.detallesProductos) : null,
        data.cantidadM2,
        JSON.stringify(data.metrosPorDimension),
        data.precioM2,
        data.descuento,
        data.fondoDesgasteEquipos,
        data.fondoTrabajadores,
        data.fondoOperativo,
        data.subtotal,
        data.total,
        data.clienteNombre,
        data.clienteEmail,
        data.clienteTelefono,
        data.observaciones ?? null,
        data.responsableValidacionId ?? null,
        data.responsableValidacionNombre ?? null,
        data.fechaLiquidacion ?? null,
        data.fecha,
        data.estado,
        data.motivoMovimientoAlmacen ?? null,
        data.movimientoInventarioId ?? null,
        data.creadoPorId ?? null,
        data.creadoPorNombre ?? null,
      ]
    )
    return this.findById(id) as Promise<Venta>
  }

  async update(id: string, data: Partial<Venta>): Promise<Venta | null> {
    const current = await this.findById(id)
    if (!current) return null
    const merged = { ...current, ...data }
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    await pool.query(
      `UPDATE ventas SET
        bloque_id=$2, bloque_codigo=$3, producto_id=$4, producto_nombre=$5, detalles_productos=$6, cantidad_m2=$7,
        metros_por_dimension=$8, precio_m2=$9, descuento=$10, fondo_desgaste_equipos=$11, fondo_trabajadores=$12,
        fondo_operativo=$13, subtotal=$14, total=$15, cliente_nombre=$16, cliente_email=$17, cliente_telefono=$18,
        observaciones=$19, responsable_validacion_id=$20, responsable_validacion_nombre=$21, fecha_liquidacion=$22,
        fecha=$23, estado=$24, motivo_movimiento_almacen=$25, movimiento_inventario_id=$26, creado_por_id=$27,
        creado_por_nombre=$28
      WHERE id=$1 AND workshop_id=$29`,
      [
        id,
        merged.bloqueId ?? null,
        merged.bloqueCodigo ?? null,
        merged.productoId,
        merged.productoNombre,
        merged.detallesProductos ? JSON.stringify(merged.detallesProductos) : null,
        merged.cantidadM2,
        JSON.stringify(merged.metrosPorDimension),
        merged.precioM2,
        merged.descuento,
        merged.fondoDesgasteEquipos,
        merged.fondoTrabajadores,
        merged.fondoOperativo,
        merged.subtotal,
        merged.total,
        merged.clienteNombre,
        merged.clienteEmail,
        merged.clienteTelefono,
        merged.observaciones ?? null,
        merged.responsableValidacionId ?? null,
        merged.responsableValidacionNombre ?? null,
        merged.fechaLiquidacion ?? null,
        merged.fecha,
        merged.estado,
        merged.motivoMovimientoAlmacen ?? null,
        merged.movimientoInventarioId ?? null,
        merged.creadoPorId ?? null,
        merged.creadoPorNombre ?? null,
        workshopId,
      ]
    )
    return this.findById(id)
  }

  async delete(id: string): Promise<boolean> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const r = await pool.query('DELETE FROM ventas WHERE id = $1 AND workshop_id = $2', [
      id,
      workshopId,
    ])
    return (r.rowCount ?? 0) > 0
  }
}
