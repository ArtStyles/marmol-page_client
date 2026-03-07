import type { VentaRepositoryPort } from '../../../domain/ports/index.js'
import type { Venta } from '../../../domain/entities/index.js'
import { getPool } from './connection.js'
import { nextId } from './helpers.js'

function rowToVenta(r: Record<string, unknown>): Venta {
  return {
    id: r.id as string,
    productoId: r.producto_id as string,
    productoNombre: r.producto_nombre as string,
    detallesProductos: r.detalles_productos as Venta['detallesProductos'],
    cantidadM2: Number(r.cantidad_m2),
    metrosPorDimension: r.metros_por_dimension as Venta['metrosPorDimension'],
    precioM2: Number(r.precio_m2),
    descuento: Number(r.descuento),
    fondoOperativo: Number(r.fondo_operativo),
    subtotal: Number(r.subtotal),
    total: Number(r.total),
    clienteNombre: r.cliente_nombre as string,
    clienteEmail: r.cliente_email as string,
    clienteTelefono: r.cliente_telefono as string,
    fecha: String(r.fecha).split('T')[0],
    estado: r.estado as Venta['estado'],
  }
}

export class PostgresVentaRepository implements VentaRepositoryPort {
  async findAll(): Promise<Venta[]> {
    const pool = getPool()
    const r = await pool.query('SELECT * FROM ventas ORDER BY fecha DESC, id')
    return r.rows.map(rowToVenta)
  }

  async findById(id: string): Promise<Venta | null> {
    const pool = getPool()
    const r = await pool.query('SELECT * FROM ventas WHERE id = $1', [id])
    if (r.rows.length === 0) return null
    return rowToVenta(r.rows[0])
  }

  async create(data: Omit<Venta, 'id'>): Promise<Venta> {
    const pool = getPool()
    const id = await nextId(pool, 'V', 'ventas')
    await pool.query(
      `INSERT INTO ventas (id, producto_id, producto_nombre, detalles_productos, cantidad_m2, metros_por_dimension, precio_m2, descuento, fondo_operativo, subtotal, total, cliente_nombre, cliente_email, cliente_telefono, fecha, estado)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [
        id,
        data.productoId,
        data.productoNombre,
        data.detallesProductos ? JSON.stringify(data.detallesProductos) : null,
        data.cantidadM2,
        JSON.stringify(data.metrosPorDimension),
        data.precioM2,
        data.descuento,
        data.fondoOperativo,
        data.subtotal,
        data.total,
        data.clienteNombre,
        data.clienteEmail,
        data.clienteTelefono,
        data.fecha,
        data.estado,
      ]
    )
    return this.findById(id) as Promise<Venta>
  }

  async update(id: string, data: Partial<Venta>): Promise<Venta | null> {
    const current = await this.findById(id)
    if (!current) return null
    const merged = { ...current, ...data }
    const pool = getPool()
    await pool.query(
      `UPDATE ventas SET producto_id=$2, producto_nombre=$3, detalles_productos=$4, cantidad_m2=$5, metros_por_dimension=$6, precio_m2=$7, descuento=$8, fondo_operativo=$9, subtotal=$10, total=$11, cliente_nombre=$12, cliente_email=$13, cliente_telefono=$14, fecha=$15, estado=$16 WHERE id=$1`,
      [
        id,
        merged.productoId,
        merged.productoNombre,
        merged.detallesProductos ? JSON.stringify(merged.detallesProductos) : null,
        merged.cantidadM2,
        JSON.stringify(merged.metrosPorDimension),
        merged.precioM2,
        merged.descuento,
        merged.fondoOperativo,
        merged.subtotal,
        merged.total,
        merged.clienteNombre,
        merged.clienteEmail,
        merged.clienteTelefono,
        merged.fecha,
        merged.estado,
      ]
    )
    return this.findById(id)
  }

  async delete(id: string): Promise<boolean> {
    const pool = getPool()
    const r = await pool.query('DELETE FROM ventas WHERE id = $1', [id])
    return (r.rowCount ?? 0) > 0
  }
}
