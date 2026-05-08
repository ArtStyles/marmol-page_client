import type { BloqueRepositoryPort } from '../../../domain/ports/index.js'
import type { BloqueOLote } from '../../../domain/entities/index.js'
import { getPool } from './connection.js'
import { nextId, toDateOnly } from './helpers.js'
import { getCurrentWorkshopId } from './tenant.js'

function rowToBloque(r: Record<string, unknown>): BloqueOLote {
  const id = r.id as string
  const tipo = r.tipo as 'Bloque' | 'Lote'

  return {
    id,
    nombre: normalizeBloqueCodigo(id, tipo, r.nombre as string),
    tipo,
    dimensionBase: r.dimension_base as BloqueOLote['dimensionBase'],
    costo: Number(r.costo),
    costoTransporte: Number(r.costo_transporte),
    metrosComprados: Number(r.metros_comprados),
    fechaIngreso: toDateOnly(r.fecha_ingreso),
    proveedor: r.proveedor as string,
    canteraOrigen: (r.cantera_origen as string | null) ?? '',
    losasProducidas: Number(r.losas_producidas),
    losasPerdidas: Number(r.losas_perdidas),
    metrosVendibles: Number(r.metros_vendibles),
    gananciaReal: Number(r.ganancia_real),
    estado: r.estado as 'activo' | 'agotado' | 'vendido',
  }
}

function normalizeBloqueCodigo(
  id: string,
  tipo: BloqueOLote['tipo'],
  nombreActual: string,
): string {
  const prefijo = tipo === 'Bloque' ? 'A' : 'L'
  const codigoRegex = new RegExp(`^${prefijo}-\\d{3}$`)

  if (codigoRegex.test(nombreActual.trim())) {
    return nombreActual.trim()
  }

  const match = id.match(/(\d+)$/)
  if (!match) return nombreActual

  const numero = Number.parseInt(match[1], 10)
  if (!Number.isFinite(numero) || numero <= 0) return nombreActual

  return `${prefijo}-${String(numero).padStart(3, '0')}`
}

export class PostgresBloqueRepository implements BloqueRepositoryPort {
  async findAll(): Promise<BloqueOLote[]> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const r = await pool.query('SELECT * FROM bloques WHERE workshop_id = $1 ORDER BY id', [workshopId])
    return r.rows.map(rowToBloque)
  }

  async findById(id: string): Promise<BloqueOLote | null> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const r = await pool.query('SELECT * FROM bloques WHERE id = $1 AND workshop_id = $2', [
      id,
      workshopId,
    ])
    if (r.rows.length === 0) return null
    return rowToBloque(r.rows[0])
  }

  async create(data: Omit<BloqueOLote, 'id'>): Promise<BloqueOLote> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const id = await nextId(pool, 'BL', 'bloques')
    await pool.query(
      `INSERT INTO bloques (id, workshop_id, nombre, tipo, dimension_base, costo, costo_transporte, metros_comprados, fecha_ingreso, proveedor, cantera_origen, losas_producidas, losas_perdidas, metros_vendibles, ganancia_real, estado)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [
        id,
        workshopId,
        data.nombre,
        data.tipo,
        data.dimensionBase,
        data.costo,
        data.costoTransporte,
        data.metrosComprados,
        data.fechaIngreso,
        data.proveedor,
        data.canteraOrigen,
        data.losasProducidas,
        data.losasPerdidas,
        data.metrosVendibles,
        data.gananciaReal,
        data.estado,
      ]
    )
    return this.findById(id) as Promise<BloqueOLote>
  }

  async update(id: string, data: Partial<BloqueOLote>): Promise<BloqueOLote | null> {
    const current = await this.findById(id)
    if (!current) return null
    const merged = { ...current, ...data }
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    await pool.query(
      `UPDATE bloques SET nombre=$2, tipo=$3, dimension_base=$4, costo=$5, costo_transporte=$6, metros_comprados=$7, fecha_ingreso=$8, proveedor=$9, cantera_origen=$10, losas_producidas=$11, losas_perdidas=$12, metros_vendibles=$13, ganancia_real=$14, estado=$15 WHERE id=$1 AND workshop_id=$16`,
      [
        id,
        merged.nombre,
        merged.tipo,
        merged.dimensionBase,
        merged.costo,
        merged.costoTransporte,
        merged.metrosComprados,
        merged.fechaIngreso,
        merged.proveedor,
        merged.canteraOrigen,
        merged.losasProducidas,
        merged.losasPerdidas,
        merged.metrosVendibles,
        merged.gananciaReal,
        merged.estado,
        workshopId,
      ]
    )
    return this.findById(id)
  }

  async delete(id: string): Promise<boolean> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const r = await pool.query('DELETE FROM bloques WHERE id = $1 AND workshop_id = $2', [
      id,
      workshopId,
    ])
    return (r.rowCount ?? 0) > 0
  }
}
