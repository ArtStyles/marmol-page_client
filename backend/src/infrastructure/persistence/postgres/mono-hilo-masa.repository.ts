import type { MonoHiloMasaRepositoryPort } from '../../../domain/ports/index.js'
import type {
  Dimension,
  MonoHiloEstimadoDimension,
  MonoHiloEstimados,
  MonoHiloMasa,
  MonoHiloRemanente,
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
  return Object.fromEntries(
    Object.entries(raw).map(([dimension, estimado]) => [dimension, normalizeEstimadoItem(estimado)]),
  ) as MonoHiloEstimados
}

function sanitizeEstimados(estimados: MonoHiloEstimados): MonoHiloEstimados {
  return Object.fromEntries(
    Object.entries(estimados).map(([dimension, estimado]) => [
      dimension,
      {
        ...estimado,
        losasEstimadas: Math.max(0, Math.trunc(estimado.losasEstimadas)),
        losasConsumidas: Math.max(0, Math.trunc(estimado.losasConsumidas)),
      },
    ]),
  ) as MonoHiloEstimados
}

function normalizeRemanenteItem(value: unknown): MonoHiloRemanente | null {
  const raw = (value ?? {}) as Partial<MonoHiloRemanente>
  const largoCm = asNumber(raw.largoCm)
  const anchoCm = asNumber(raw.anchoCm)

  if (largoCm <= 0 || anchoCm <= 0) return null

  return {
    largoCm: Number(largoCm.toFixed(2)),
    anchoCm: Number(anchoCm.toFixed(2)),
  }
}

function normalizeRemanentes(value: unknown): MonoHiloRemanente[] {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => normalizeRemanenteItem(item))
    .filter((item): item is MonoHiloRemanente => Boolean(item))
}

function sanitizeRemanentes(remanentes: MonoHiloRemanente[] | undefined): MonoHiloRemanente[] {
  return normalizeRemanentes(remanentes ?? [])
}

function rowToMonoHiloMasa(row: Record<string, unknown>): MonoHiloMasa {
  return {
    id: row.id as string,
    bloqueId: row.bloque_id as string,
    bloqueCodigo: row.bloque_codigo as string,
    bloqueNombre: row.bloque_nombre as string,
    produccionId: (row.produccion_id as string | null) ?? undefined,
    creadoPorId: (row.creado_por_id as string | null) ?? undefined,
    creadoPorNombre: (row.creado_por_nombre as string | null) ?? undefined,
    codigo: row.codigo as string,
    largoCm: asNumber(row.largo_cm),
    anchoCm: asNumber(row.ancho_cm),
    profundidadCm: asNumber(row.profundidad_cm),
    margenCm: asNumber(row.margen_cm),
    grosorDiscoMm: asNumber(row.grosor_disco_mm),
    espesorLosaCm: asNumber(row.espesor_losa_cm),
    ubicacion: (row.ubicacion as MonoHiloMasa['ubicacion']) ?? 'almacen',
    estado: (row.estado as MonoHiloMasa['estado']) ?? 'activa',
    observaciones: (row.observaciones as string) ?? '',
    fechaRegistro:
      (row.fecha_registro as string | null) ??
      (row.created_at as string | null) ??
      new Date().toISOString(),
    estimados: normalizeEstimados(row.estimados),
    remanentes: normalizeRemanentes(row.remanentes),
    anulacionMotivo: (row.anulacion_motivo as string | null) ?? undefined,
    anuladoPorId: (row.anulado_por_id as string | null) ?? undefined,
    anuladoPorNombre: (row.anulado_por_nombre as string | null) ?? undefined,
    anuladoFecha: (row.anulado_fecha as string | null) ?? undefined,
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
         produccion_id,
         codigo,
         largo_cm,
         ancho_cm,
         profundidad_cm,
         margen_cm,
         grosor_disco_mm,
         espesor_losa_cm,
         ubicacion,
         estado,
         observaciones,
         fecha_registro,
         creado_por_id,
         creado_por_nombre,
         estimados,
         remanentes,
         anulacion_motivo,
         anulado_por_id,
         anulado_por_nombre,
         anulado_fecha
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25
       )`,
      [
        id,
        workshopId,
        data.bloqueId,
        data.bloqueCodigo,
        data.bloqueNombre,
        data.produccionId ?? null,
        data.codigo,
        data.largoCm,
        data.anchoCm,
        data.profundidadCm,
        data.margenCm,
        data.grosorDiscoMm,
        data.espesorLosaCm,
        data.ubicacion,
        data.estado ?? 'activa',
        data.observaciones ?? '',
        data.fechaRegistro,
        data.creadoPorId ?? null,
        data.creadoPorNombre ?? null,
        JSON.stringify(sanitizeEstimados(data.estimados)),
        JSON.stringify(sanitizeRemanentes(data.remanentes)),
        data.anulacionMotivo ?? null,
        data.anuladoPorId ?? null,
        data.anuladoPorNombre ?? null,
        data.anuladoFecha ?? null,
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
      remanentes: data.remanentes ? sanitizeRemanentes(data.remanentes) : current.remanentes,
    }

    const pool = getPool()
    const workshopId = getCurrentWorkshopId()

    await pool.query(
      `UPDATE mono_hilo_masas
       SET bloque_id = $2,
           bloque_codigo = $3,
           bloque_nombre = $4,
           produccion_id = $5,
           codigo = $6,
           largo_cm = $7,
           ancho_cm = $8,
           profundidad_cm = $9,
           margen_cm = $10,
           grosor_disco_mm = $11,
           espesor_losa_cm = $12,
           ubicacion = $13,
           estado = $14,
           observaciones = $15,
           fecha_registro = $16,
           creado_por_id = $17,
           creado_por_nombre = $18,
           estimados = $19,
           remanentes = $20,
           anulacion_motivo = $21,
           anulado_por_id = $22,
           anulado_por_nombre = $23,
           anulado_fecha = $24,
           updated_at = NOW()
       WHERE id = $1 AND workshop_id = $25`,
      [
        id,
        merged.bloqueId,
        merged.bloqueCodigo,
        merged.bloqueNombre,
        merged.produccionId ?? null,
        merged.codigo,
        merged.largoCm,
        merged.anchoCm,
        merged.profundidadCm,
        merged.margenCm,
        merged.grosorDiscoMm,
        merged.espesorLosaCm,
        merged.ubicacion,
        merged.estado ?? 'activa',
        merged.observaciones ?? '',
        merged.fechaRegistro,
        merged.creadoPorId ?? null,
        merged.creadoPorNombre ?? null,
        JSON.stringify(merged.estimados),
        JSON.stringify(sanitizeRemanentes(merged.remanentes)),
        merged.anulacionMotivo ?? null,
        merged.anuladoPorId ?? null,
        merged.anuladoPorNombre ?? null,
        merged.anuladoFecha ?? null,
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
