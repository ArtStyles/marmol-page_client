import type { TrabajadorRepositoryPort } from '../../../domain/ports/index.js'
import type { Trabajador } from '../../../domain/entities/index.js'
import { getPool } from './connection.js'
import { nextId } from './helpers.js'

function rowToTrabajador(r: Record<string, unknown>): Trabajador {
  return {
    id: r.id as string,
    nombre: r.nombre as string,
    email: r.email as string,
    telefono: (r.telefono as string) ?? '',
    rol: r.rol as Trabajador['rol'],
    fechaIngreso: String(r.fecha_ingreso).split('T')[0],
    estado: r.estado as 'activo' | 'inactivo',
    usuario: r.usuario as string | undefined,
    contrasena: r.contrasena as string | undefined,
    tarifasPersonalizadas: (r.tarifas_personalizadas as Trabajador['tarifasPersonalizadas']) ?? null,
    losasProducidas: Number(r.losas_producidas),
    pagosTotales: Number(r.pagos_totales),
    bonosTotales: Number(r.bonos_totales),
    acumuladoPendiente: Number(r.acumulado_pendiente),
  }
}

export class PostgresTrabajadorRepository implements TrabajadorRepositoryPort {
  async findAll(): Promise<Trabajador[]> {
    const pool = getPool()
    const r = await pool.query('SELECT * FROM trabajadores ORDER BY id')
    return r.rows.map(rowToTrabajador)
  }

  async findById(id: string): Promise<Trabajador | null> {
    const pool = getPool()
    const r = await pool.query('SELECT * FROM trabajadores WHERE id = $1', [id])
    if (r.rows.length === 0) return null
    return rowToTrabajador(r.rows[0])
  }

  async create(data: Omit<Trabajador, 'id'>): Promise<Trabajador> {
    const pool = getPool()
    const id = await nextId(pool, 'T', 'trabajadores')
    await pool.query(
      `INSERT INTO trabajadores (id, nombre, email, telefono, rol, fecha_ingreso, estado, usuario, contrasena, tarifas_personalizadas, losas_producidas, pagos_totales, bonos_totales, acumulado_pendiente)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        id,
        data.nombre,
        data.email,
        data.telefono ?? '',
        data.rol,
        data.fechaIngreso,
        data.estado,
        data.usuario ?? null,
        data.contrasena ?? null,
        data.tarifasPersonalizadas ? JSON.stringify(data.tarifasPersonalizadas) : null,
        data.losasProducidas,
        data.pagosTotales,
        data.bonosTotales,
        data.acumuladoPendiente,
      ]
    )
    return this.findById(id) as Promise<Trabajador>
  }

  async update(id: string, data: Partial<Trabajador>): Promise<Trabajador | null> {
    const current = await this.findById(id)
    if (!current) return null
    const merged = { ...current, ...data }
    const pool = getPool()
    await pool.query(
      `UPDATE trabajadores SET nombre=$2, email=$3, telefono=$4, rol=$5, fecha_ingreso=$6, estado=$7, usuario=$8, contrasena=$9, tarifas_personalizadas=$10, losas_producidas=$11, pagos_totales=$12, bonos_totales=$13, acumulado_pendiente=$14 WHERE id=$1`,
      [
        id,
        merged.nombre,
        merged.email,
        merged.telefono ?? '',
        merged.rol,
        merged.fechaIngreso,
        merged.estado,
        merged.usuario ?? null,
        merged.contrasena ?? null,
        merged.tarifasPersonalizadas ? JSON.stringify(merged.tarifasPersonalizadas) : null,
        merged.losasProducidas,
        merged.pagosTotales,
        merged.bonosTotales,
        merged.acumuladoPendiente,
      ]
    )
    return this.findById(id)
  }

  async delete(id: string): Promise<boolean> {
    const pool = getPool()
    const r = await pool.query('DELETE FROM trabajadores WHERE id = $1', [id])
    return (r.rowCount ?? 0) > 0
  }
}
