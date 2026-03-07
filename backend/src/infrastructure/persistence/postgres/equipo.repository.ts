import type { EquipoRepositoryPort } from '../../../domain/ports/index.js'
import type { Equipo } from '../../../domain/entities/index.js'
import { getPool } from './connection.js'
import { nextId } from './helpers.js'

function rowToEquipo(r: Record<string, unknown>): Equipo {
  return {
    id: r.id as string,
    nombre: r.nombre as string,
    tipo: r.tipo as Equipo['tipo'],
    codigoInterno: r.codigo_interno as string,
    estado: r.estado as Equipo['estado'],
    notas: (r.notas as string) ?? '',
  }
}

export class PostgresEquipoRepository implements EquipoRepositoryPort {
  async findAll(): Promise<Equipo[]> {
    const pool = getPool()
    const r = await pool.query('SELECT * FROM equipos ORDER BY id')
    return r.rows.map(rowToEquipo)
  }

  async findById(id: string): Promise<Equipo | null> {
    const pool = getPool()
    const r = await pool.query('SELECT * FROM equipos WHERE id = $1', [id])
    if (r.rows.length === 0) return null
    return rowToEquipo(r.rows[0])
  }

  async create(data: Omit<Equipo, 'id'>): Promise<Equipo> {
    const pool = getPool()
    const id = await nextId(pool, 'EQ', 'equipos')
    await pool.query(
      `INSERT INTO equipos (id, nombre, tipo, codigo_interno, estado, notas) VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, data.nombre, data.tipo, data.codigoInterno, data.estado, data.notas ?? '']
    )
    return this.findById(id) as Promise<Equipo>
  }

  async update(id: string, data: Partial<Equipo>): Promise<Equipo | null> {
    const current = await this.findById(id)
    if (!current) return null
    const merged = { ...current, ...data }
    const pool = getPool()
    await pool.query(
      `UPDATE equipos SET nombre=$2, tipo=$3, codigo_interno=$4, estado=$5, notas=$6 WHERE id=$1`,
      [id, merged.nombre, merged.tipo, merged.codigoInterno, merged.estado, merged.notas ?? '']
    )
    return this.findById(id)
  }

  async delete(id: string): Promise<boolean> {
    const pool = getPool()
    const r = await pool.query('DELETE FROM equipos WHERE id = $1', [id])
    return (r.rowCount ?? 0) > 0
  }
}
