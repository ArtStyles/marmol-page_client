import type { MonoHiloMasaRepositoryPort } from '../../../domain/ports/index.js'
import type {
  Dimension,
  MonoHiloEstimadoDimension,
  MonoHiloEstimados,
  MonoHiloMasa,
} from '../../../domain/entities/index.js'
import { getPool } from './connection.js'
import { nextId } from './helpers.js'
import { getCurrentWorkshopId } from './tenant.js'

function asNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeEstimadoItem(value: unknown): MonoHiloEstimadoDimension {
  const raw = (value ?? {}) as Partial<MonoHiloEstimadoDimension>
  return {
    losasEstimadas: Math.max(0, Math.trunc(asNumber(raw.losasEstimadas))),
    losasConsumidas: Math.max(0, Math.trunc(asNumber(raw.losasConsumidas))),
    mermaEstimadaM3: asNumber(raw.mermaEstimadaM3),
    mermaEstimadaPorcentaje: asNumber(raw.mermaEstimadaPorcentaje),
  }
}

function normalizeEstimados(value: unknown): MonoHiloEstimados {
  const raw = (value ?? {}) as Record<string, unknown>

  return {
    '40x40': normalizeEstimadoItem(raw['40x40']),
    '60x40': normalizeEstimadoItem(raw['60x40']),
    '80x40': normalizeEstimadoItem(raw['80x40']),
    '160x60': normalizeEstimadoItem(raw['160x60']),
    '160x65': normalizeEstimadoItem(raw['160x65']),
  }
}

function sanitizeEstimados(estimados: MonoHiloEstimados): MonoHiloEstimados {
  return {
    '40x40': {
      ...estimados['40x40'],
      losasEstimadas: Math.max(0, Math.trunc(estimados['40x40'].losasEstimadas)),
      losasConsumidas: Math.max(0, Math.trunc(estimados['40x40'].losasConsumidas)),
    },
    '60x40': {
      ...estimados['60x40'],
      losasEstimadas: Math.max(0, Math.trunc(estimados['60x40'].losasEstimadas)),
      losasConsumidas: Math.max(0, Math.trunc(estimados['60x40'].losasConsumidas)),
    },
    '80x40': {
      ...estimados['80x40'],
      losasEstimadas: Math.max(0, Math.trunc(estimados['80x40'].losasEstimadas)),
      losasConsumidas: Math.max(0, Math.trunc(estimados['80x40'].losasConsumidas)),
    },
    '160x60': {
      ...estimados['160x60'],
      losasEstimadas: Math.max(0, Math.trunc(estimados['160x60'].losasEstimadas)),
      losasConsumidas: Math.max(0, Math.trunc(estimados['160x60'].losasConsumidas)),
    },
    '160x65': {
      ...estimados['160x65'],
      losasEstimadas: Math.max(0, Math.trunc(estimados['160x65'].losasEstimadas)),
      losasConsumidas: Math.max(0, Math.trunc(estimados['160x65'].losasConsumidas)),
    },
  }
}

function rowToMonoHiloMasa(row: Record<string, unknown>): MonoHiloMasa {
  return {
    id: row.id as string,
    bloqueId: row.bloque_id as string,
    bloqueCodigo: row.bloque_codigo as string,
    bloqueNombre: row.bloque_nombre as string,
    codigo: row.codigo as string,
    largoCm: asNumber(row.largo_cm),
    anchoCm: asNumber(row.ancho_cm),
    profundidadCm: asNumber(row.profundidad_cm),
    margenCm: asNumber(row.margen_cm),
    grosorDiscoMm: asNumber(row.grosor_disco_mm),
    espesorLosaCm: asNumber(row.espesor_losa_cm),
    ubicacion: (row.ubicacion as MonoHiloMasa['ubicacion']) ?? 'almacen',
    observaciones: (row.observaciones as string) ?? '',
    fechaRegistro:
      (row.fecha_registro as string | null) ??
      (row.created_at as string | null) ??
      new Date().toISOString(),
    estimados: normalizeEstimados(row.estimados),
  }
}

export class PostgresMonoHiloMasaRepository implements MonoHiloMasaRepositoryPort {
  async findAll(): Promise<MonoHiloMasa[]> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const result = await pool.query(
      `SELECT *
       FROM mono_hilo_masas
       WHERE workshop_id = $1
       ORDER BY fecha_registro DESC, id DESC`,
      [workshopId],
    )

    return result.rows.map((row) => rowToMonoHiloMasa(row))
  }

  async findById(id: string): Promise<MonoHiloMasa | null> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const result = await pool.query(
      `SELECT *
       FROM mono_hilo_masas
       WHERE id = $1 AND workshop_id = $2`,
      [id, workshopId],
    )

    if (result.rows.length === 0) return null
    return rowToMonoHiloMasa(result.rows[0])
  }

  async create(data: Omit<MonoHiloMasa, 'id'>): Promise<MonoHiloMasa> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const id = await nextId(pool, 'MH', 'mono_hilo_masas')

    await pool.query(
      `INSERT INTO mono_hilo_masas (
         id,
         workshop_id,
         bloque_id,
         bloque_codigo,
         bloque_nombre,
         codigo,
         largo_cm,
         ancho_cm,
         profundidad_cm,
         margen_cm,
         grosor_disco_mm,
         espesor_losa_cm,
         ubicacion,
         observaciones,
         fecha_registro,
         estimados
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16
       )`,
      [
        id,
        workshopId,
        data.bloqueId,
        data.bloqueCodigo,
        data.bloqueNombre,
        data.codigo,
        data.largoCm,
        data.anchoCm,
        data.profundidadCm,
        data.margenCm,
        data.grosorDiscoMm,
        data.espesorLosaCm,
        data.ubicacion,
        data.observaciones ?? '',
        data.fechaRegistro,
        JSON.stringify(sanitizeEstimados(data.estimados)),
      ],
    )

    return this.findById(id) as Promise<MonoHiloMasa>
  }

  async update(id: string, data: Partial<MonoHiloMasa>): Promise<MonoHiloMasa | null> {
    const current = await this.findById(id)
    if (!current) return null

    const merged: MonoHiloMasa = {
      ...current,
      ...data,
      estimados: data.estimados ? sanitizeEstimados(data.estimados) : current.estimados,
    }

    const pool = getPool()
    const workshopId = getCurrentWorkshopId()

    await pool.query(
      `UPDATE mono_hilo_masas
       SET bloque_id = $2,
           bloque_codigo = $3,
           bloque_nombre = $4,
           codigo = $5,
           largo_cm = $6,
           ancho_cm = $7,
           profundidad_cm = $8,
           margen_cm = $9,
           grosor_disco_mm = $10,
           espesor_losa_cm = $11,
           ubicacion = $12,
           observaciones = $13,
           fecha_registro = $14,
           estimados = $15,
           updated_at = NOW()
       WHERE id = $1 AND workshop_id = $16`,
      [
        id,
        merged.bloqueId,
        merged.bloqueCodigo,
        merged.bloqueNombre,
        merged.codigo,
        merged.largoCm,
        merged.anchoCm,
        merged.profundidadCm,
        merged.margenCm,
        merged.grosorDiscoMm,
        merged.espesorLosaCm,
        merged.ubicacion,
        merged.observaciones ?? '',
        merged.fechaRegistro,
        JSON.stringify(merged.estimados),
        workshopId,
      ],
    )

    return this.findById(id)
  }

  async delete(id: string): Promise<boolean> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const result = await pool.query(
      'DELETE FROM mono_hilo_masas WHERE id = $1 AND workshop_id = $2',
      [id, workshopId],
    )

    return (result.rowCount ?? 0) > 0
  }
}
