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
    createdAt: toTimestampIso(r.created_at),
    creadoPorId: (r.creado_por_id as string | null) ?? undefined,
    creadoPorNombre: (r.creado_por_nombre as string | null) ?? undefined,
    origenId: r.origen_id as string,
    origenNombre: r.origen_nombre as string,
    workflowTipo: (r.workflow_tipo as ProduccionDiaria['workflowTipo']) ?? 'regular',
    estadoRegistro: (r.estado_registro as ProduccionDiaria['estadoRegistro']) ?? 'activo',
    tipo: r.tipo as ProduccionDiaria['tipo'],
    dimension: r.dimension as ProduccionDiaria['dimension'],
    cantidadPicar: Number(r.cantidad_picar),
    cantidadPulir: Number(r.cantidad_pulir),
    cantidadEscuadrar: Number(r.cantidad_escuadrar),
    cantidadDevastar: Number(r.cantidad_devastar),
    cantidadResinar: Number(r.cantidad_resinar),
    totalLosas: Number(r.total_losas),
    totalM2: Number(r.total_m2),
    detallesAcciones: r.detalles_acciones as ProduccionDiaria['detallesAcciones'],
    monoHiloDetalle: (r.mono_hilo_detalle as ProduccionDiaria['monoHiloDetalle']) ?? undefined,
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
    anulacionMotivo: (r.anulacion_motivo as string | null) ?? undefined,
    anuladoPorId: (r.anulado_por_id as string | null) ?? undefined,
    anuladoPorNombre: (r.anulado_por_nombre as string | null) ?? undefined,
    anuladoFecha: toTimestampIso(r.anulado_fecha),
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
        id, workshop_id, fecha, creado_por_id, creado_por_nombre, origen_id, origen_nombre, workflow_tipo, estado_registro, tipo, dimension, cantidad_picar, cantidad_pulir, cantidad_escuadrar, cantidad_devastar, cantidad_resinar,
        total_losas, total_m2, detalles_acciones, mono_hilo_detalle, can_edit, editable_until,
        aprobacion_taller_estado, aprobacion_taller_por_id, aprobacion_taller_por_nombre, aprobacion_taller_fecha, aprobacion_taller_motivo_rechazo,
        aprobacion_almacen_estado, aprobacion_almacen_por_id, aprobacion_almacen_por_nombre, aprobacion_almacen_fecha, aprobacion_almacen_motivo,
        inventario_aplicado, movimiento_inventario_ids, anulacion_motivo, anulado_por_id, anulado_por_nombre, anulado_fecha
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38)`,
      [
        id,
        workshopId,
        data.fecha,
        data.creadoPorId ?? null,
        data.creadoPorNombre ?? null,
        data.origenId,
        data.origenNombre,
        data.workflowTipo ?? 'regular',
        data.estadoRegistro ?? 'activo',
        data.tipo,
        data.dimension,
        data.cantidadPicar,
        data.cantidadPulir,
        data.cantidadEscuadrar,
        data.cantidadDevastar,
        data.cantidadResinar,
        data.totalLosas,
        data.totalM2,
        data.detallesAcciones ? JSON.stringify(data.detallesAcciones) : null,
        data.monoHiloDetalle ? JSON.stringify(data.monoHiloDetalle) : null,
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
        data.anulacionMotivo ?? null,
        data.anuladoPorId ?? null,
        data.anuladoPorNombre ?? null,
        data.anuladoFecha ?? null,
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
        fecha=$2, creado_por_id=$3, creado_por_nombre=$4, origen_id=$5, origen_nombre=$6, workflow_tipo=$7, estado_registro=$8, tipo=$9, dimension=$10, cantidad_picar=$11, cantidad_pulir=$12, cantidad_escuadrar=$13, cantidad_devastar=$14, cantidad_resinar=$15,
        total_losas=$16, total_m2=$17, detalles_acciones=$18, mono_hilo_detalle=$19, can_edit=$20, editable_until=$21,
        aprobacion_taller_estado=$22, aprobacion_taller_por_id=$23, aprobacion_taller_por_nombre=$24, aprobacion_taller_fecha=$25, aprobacion_taller_motivo_rechazo=$26,
        aprobacion_almacen_estado=$27, aprobacion_almacen_por_id=$28, aprobacion_almacen_por_nombre=$29, aprobacion_almacen_fecha=$30, aprobacion_almacen_motivo=$31,
        inventario_aplicado=$32, movimiento_inventario_ids=$33, anulacion_motivo=$34, anulado_por_id=$35, anulado_por_nombre=$36, anulado_fecha=$37
        WHERE id=$1 AND workshop_id=$38`,
      [
        id,
        merged.fecha,
        merged.creadoPorId ?? null,
        merged.creadoPorNombre ?? null,
        merged.origenId,
        merged.origenNombre,
        merged.workflowTipo ?? 'regular',
        merged.estadoRegistro ?? 'activo',
        merged.tipo,
        merged.dimension,
        merged.cantidadPicar,
        merged.cantidadPulir,
        merged.cantidadEscuadrar,
        merged.cantidadDevastar,
        merged.cantidadResinar,
        merged.totalLosas,
        merged.totalM2,
        merged.detallesAcciones ? JSON.stringify(merged.detallesAcciones) : null,
        merged.monoHiloDetalle ? JSON.stringify(merged.monoHiloDetalle) : null,
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
        merged.anulacionMotivo ?? null,
        merged.anuladoPorId ?? null,
        merged.anuladoPorNombre ?? null,
        merged.anuladoFecha ?? null,
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
    produccionId: (r.produccion_id as string | null) ?? undefined,
    produccionDetalleId: (r.produccion_detalle_id as string | null) ?? undefined,
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
      `INSERT INTO produccion_trabajadores (id, workshop_id, fecha, produccion_id, produccion_detalle_id, trabajador_id, trabajador_nombre, accion, origen_id, origen_nombre, tipo, dimension, cantidad_losas, pago_por_losa, pago_total, bono, pago_final, pagado)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [
        id,
        workshopId,
        data.fecha,
        data.produccionId ?? null,
        data.produccionDetalleId ?? null,
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
      `UPDATE produccion_trabajadores SET fecha=$2, produccion_id=$3, produccion_detalle_id=$4, trabajador_id=$5, trabajador_nombre=$6, accion=$7, origen_id=$8, origen_nombre=$9, tipo=$10, dimension=$11, cantidad_losas=$12, pago_por_losa=$13, pago_total=$14, bono=$15, pago_final=$16, pagado=$17 WHERE id=$1 AND workshop_id=$18`,
      [
        id,
        merged.fecha,
        merged.produccionId ?? null,
        merged.produccionDetalleId ?? null,
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
