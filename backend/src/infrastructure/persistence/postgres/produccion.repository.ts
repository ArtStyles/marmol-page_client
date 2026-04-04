import type {
  ProduccionRepositoryPort,
  ProduccionTrabajadorRepositoryPort,
} from '../../../domain/ports/index.js'
import type { ProduccionDiaria, ProduccionTrabajador } from '../../../domain/entities/index.js'
import { getPool } from './connection.js'
import { nextId, toDateOnly, toTimestampIso } from './helpers.js'
import { getCurrentWorkshopId } from './tenant.js'

function rowToProduccion(r: Record<string, unknown>): ProduccionDiaria {
  return {
    id: r.id as string,
    fecha: toDateOnly(r.fecha),
    origenId: r.origen_id as string,
    origenNombre: r.origen_nombre as string,
    tipo: r.tipo as ProduccionDiaria['tipo'],
    dimension: r.dimension as ProduccionDiaria['dimension'],
    cantidadPicar: Number(r.cantidad_picar),
    cantidadPulir: Number(r.cantidad_pulir),
    cantidadEscuadrar: Number(r.cantidad_escuadrar),
    cantidadResinar: Number(r.cantidad_resinar),
    totalLosas: Number(r.total_losas),
    totalM2: Number(r.total_m2),
    detallesAcciones: r.detalles_acciones as ProduccionDiaria['detallesAcciones'],
    canEdit: r.can_edit as boolean | undefined,
    editableUntil: toTimestampIso(r.editable_until),
    aprobacionTallerEstado:
      (r.aprobacion_taller_estado as ProduccionDiaria['aprobacionTallerEstado']) ?? 'pendiente',
    aprobacionTallerPorId: (r.aprobacion_taller_por_id as string | null) ?? undefined,
    aprobacionTallerPorNombre: (r.aprobacion_taller_por_nombre as string | null) ?? undefined,
    aprobacionTallerFecha: toTimestampIso(r.aprobacion_taller_fecha),
    aprobacionTallerMotivoRechazo:
      (r.aprobacion_taller_motivo_rechazo as string | null) ?? undefined,
    aprobacionAlmacenEstado:
      (r.aprobacion_almacen_estado as ProduccionDiaria['aprobacionAlmacenEstado']) ?? 'pendiente',
    aprobacionAlmacenPorId: (r.aprobacion_almacen_por_id as string | null) ?? undefined,
    aprobacionAlmacenPorNombre: (r.aprobacion_almacen_por_nombre as string | null) ?? undefined,
    aprobacionAlmacenFecha: toTimestampIso(r.aprobacion_almacen_fecha),
    aprobacionAlmacenMotivo: (r.aprobacion_almacen_motivo as string | null) ?? undefined,
    inventarioAplicado: (r.inventario_aplicado as boolean | null) ?? false,
    movimientoInventarioIds: (r.movimiento_inventario_ids as string[] | null) ?? [],
  }
}

export class PostgresProduccionRepository implements ProduccionRepositoryPort {
  async findAll(): Promise<ProduccionDiaria[]> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const r = await pool.query('SELECT * FROM produccion WHERE workshop_id = $1 ORDER BY fecha DESC, id', [
      workshopId,
    ])
    return r.rows.map(rowToProduccion)
  }

  async findById(id: string): Promise<ProduccionDiaria | null> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const r = await pool.query('SELECT * FROM produccion WHERE id = $1 AND workshop_id = $2', [
      id,
      workshopId,
    ])
    if (r.rows.length === 0) return null
    return rowToProduccion(r.rows[0])
  }

  async create(data: Omit<ProduccionDiaria, 'id'>): Promise<ProduccionDiaria> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()

    const id = await nextId(pool, 'PG', 'produccion')
    await pool.query(
      `INSERT INTO produccion (
        id, workshop_id, fecha, origen_id, origen_nombre, tipo, dimension, cantidad_picar, cantidad_pulir, cantidad_escuadrar, cantidad_resinar,
        total_losas, total_m2, detalles_acciones, can_edit, editable_until,
        aprobacion_taller_estado, aprobacion_taller_por_id, aprobacion_taller_por_nombre, aprobacion_taller_fecha, aprobacion_taller_motivo_rechazo,
        aprobacion_almacen_estado, aprobacion_almacen_por_id, aprobacion_almacen_por_nombre, aprobacion_almacen_fecha, aprobacion_almacen_motivo,
        inventario_aplicado, movimiento_inventario_ids
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28)`,
      [
        id,
        workshopId,
        data.fecha,
        data.origenId,
        data.origenNombre,
        data.tipo,
        data.dimension,
        data.cantidadPicar,
        data.cantidadPulir,
        data.cantidadEscuadrar,
        data.cantidadResinar,
        data.totalLosas,
        data.totalM2,
        data.detallesAcciones ? JSON.stringify(data.detallesAcciones) : null,
        data.canEdit ?? null,
        data.editableUntil ?? null,
        data.aprobacionTallerEstado ?? 'pendiente',
        data.aprobacionTallerPorId ?? null,
        data.aprobacionTallerPorNombre ?? null,
        data.aprobacionTallerFecha ?? null,
        data.aprobacionTallerMotivoRechazo ?? null,
        data.aprobacionAlmacenEstado ?? 'pendiente',
        data.aprobacionAlmacenPorId ?? null,
        data.aprobacionAlmacenPorNombre ?? null,
        data.aprobacionAlmacenFecha ?? null,
        data.aprobacionAlmacenMotivo ?? null,
        data.inventarioAplicado ?? false,
        JSON.stringify(data.movimientoInventarioIds ?? []),
      ]
    )
    return this.findById(id) as Promise<ProduccionDiaria>
  }

  async update(id: string, data: Partial<ProduccionDiaria>): Promise<ProduccionDiaria | null> {
    const current = await this.findById(id)
    if (!current) return null
    const merged = { ...current, ...data }
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    await pool.query(
      `UPDATE produccion SET
        fecha=$2, origen_id=$3, origen_nombre=$4, tipo=$5, dimension=$6, cantidad_picar=$7, cantidad_pulir=$8, cantidad_escuadrar=$9, cantidad_resinar=$10,
        total_losas=$11, total_m2=$12, detalles_acciones=$13, can_edit=$14, editable_until=$15,
        aprobacion_taller_estado=$16, aprobacion_taller_por_id=$17, aprobacion_taller_por_nombre=$18, aprobacion_taller_fecha=$19, aprobacion_taller_motivo_rechazo=$20,
        aprobacion_almacen_estado=$21, aprobacion_almacen_por_id=$22, aprobacion_almacen_por_nombre=$23, aprobacion_almacen_fecha=$24, aprobacion_almacen_motivo=$25,
        inventario_aplicado=$26, movimiento_inventario_ids=$27
      WHERE id=$1 AND workshop_id=$28`,
      [
        id,
        merged.fecha,
        merged.origenId,
        merged.origenNombre,
        merged.tipo,
        merged.dimension,
        merged.cantidadPicar,
        merged.cantidadPulir,
        merged.cantidadEscuadrar,
        merged.cantidadResinar,
        merged.totalLosas,
        merged.totalM2,
        merged.detallesAcciones ? JSON.stringify(merged.detallesAcciones) : null,
        merged.canEdit ?? null,
        merged.editableUntil ?? null,
        merged.aprobacionTallerEstado ?? 'pendiente',
        merged.aprobacionTallerPorId ?? null,
        merged.aprobacionTallerPorNombre ?? null,
        merged.aprobacionTallerFecha ?? null,
        merged.aprobacionTallerMotivoRechazo ?? null,
        merged.aprobacionAlmacenEstado ?? 'pendiente',
        merged.aprobacionAlmacenPorId ?? null,
        merged.aprobacionAlmacenPorNombre ?? null,
        merged.aprobacionAlmacenFecha ?? null,
        merged.aprobacionAlmacenMotivo ?? null,
        merged.inventarioAplicado ?? false,
        JSON.stringify(merged.movimientoInventarioIds ?? []),
        workshopId,
      ]
    )
    return this.findById(id)
  }

  async delete(id: string): Promise<boolean> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const r = await pool.query('DELETE FROM produccion WHERE id = $1 AND workshop_id = $2', [
      id,
      workshopId,
    ])
    return (r.rowCount ?? 0) > 0
  }
}

function rowToProduccionTrabajador(r: Record<string, unknown>): ProduccionTrabajador {
  return {
    id: r.id as string,
    fecha: toDateOnly(r.fecha),
    trabajadorId: r.trabajador_id as string,
    trabajadorNombre: r.trabajador_nombre as string,
    accion: r.accion as ProduccionTrabajador['accion'],
    origenId: r.origen_id as string,
    origenNombre: r.origen_nombre as string,
    tipo: r.tipo as ProduccionTrabajador['tipo'],
    dimension: r.dimension as ProduccionTrabajador['dimension'],
    cantidadLosas: Number(r.cantidad_losas),
    pagoPorLosa: Number(r.pago_por_losa),
    pagoTotal: Number(r.pago_total),
    bono: Number(r.bono),
    pagoFinal: Number(r.pago_final),
    pagado: Boolean(r.pagado),
  }
}

export class PostgresProduccionTrabajadorRepository implements ProduccionTrabajadorRepositoryPort {
  async findAll(): Promise<ProduccionTrabajador[]> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const r = await pool.query(
      'SELECT * FROM produccion_trabajadores WHERE workshop_id = $1 ORDER BY fecha DESC, id',
      [workshopId],
    )
    return r.rows.map(rowToProduccionTrabajador)
  }

  async findById(id: string): Promise<ProduccionTrabajador | null> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const r = await pool.query(
      'SELECT * FROM produccion_trabajadores WHERE id = $1 AND workshop_id = $2',
      [id, workshopId],
    )
    if (r.rows.length === 0) return null
    return rowToProduccionTrabajador(r.rows[0])
  }

  async create(data: Omit<ProduccionTrabajador, 'id'>): Promise<ProduccionTrabajador> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const id = await nextId(pool, 'PD', 'produccion_trabajadores')
    await pool.query(
      `INSERT INTO produccion_trabajadores (id, workshop_id, fecha, trabajador_id, trabajador_nombre, accion, origen_id, origen_nombre, tipo, dimension, cantidad_losas, pago_por_losa, pago_total, bono, pago_final, pagado)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [
        id,
        workshopId,
        data.fecha,
        data.trabajadorId,
        data.trabajadorNombre,
        data.accion,
        data.origenId,
        data.origenNombre,
        data.tipo,
        data.dimension,
        data.cantidadLosas,
        data.pagoPorLosa,
        data.pagoTotal,
        data.bono,
        data.pagoFinal,
        data.pagado,
      ]
    )
    return this.findById(id) as Promise<ProduccionTrabajador>
  }

  async update(id: string, data: Partial<ProduccionTrabajador>): Promise<ProduccionTrabajador | null> {
    const current = await this.findById(id)
    if (!current) return null
    const merged = { ...current, ...data }
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    await pool.query(
      `UPDATE produccion_trabajadores SET fecha=$2, trabajador_id=$3, trabajador_nombre=$4, accion=$5, origen_id=$6, origen_nombre=$7, tipo=$8, dimension=$9, cantidad_losas=$10, pago_por_losa=$11, pago_total=$12, bono=$13, pago_final=$14, pagado=$15 WHERE id=$1 AND workshop_id=$16`,
      [
        id,
        merged.fecha,
        merged.trabajadorId,
        merged.trabajadorNombre,
        merged.accion,
        merged.origenId,
        merged.origenNombre,
        merged.tipo,
        merged.dimension,
        merged.cantidadLosas,
        merged.pagoPorLosa,
        merged.pagoTotal,
        merged.bono,
        merged.pagoFinal,
        merged.pagado,
        workshopId,
      ]
    )
    return this.findById(id)
  }

  async delete(id: string): Promise<boolean> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const r = await pool.query(
      'DELETE FROM produccion_trabajadores WHERE id = $1 AND workshop_id = $2',
      [id, workshopId],
    )
    return (r.rowCount ?? 0) > 0
  }
}
