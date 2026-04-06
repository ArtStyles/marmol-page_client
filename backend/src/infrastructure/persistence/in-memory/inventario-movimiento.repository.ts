import type {
  InventarioMovimientoPageCursor,
  InventarioMovimientoPageQuery,
  InventarioMovimientoPageResult,
  InventarioMovimientoRepositoryPort,
} from '../../../domain/ports/index.js'
import type { InventarioMovimiento } from '../../../domain/entities/index.js'
import {
  createInventarioMovimiento,
  deleteInventarioMovimiento,
  getInventarioMovimientoById,
  getInventarioMovimientos,
  updateInventarioMovimiento,
} from '../../../store/index.js'

function toTimestamp(value: string): number {
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function byFechaSolicitudDesc(
  left: InventarioMovimiento,
  right: InventarioMovimiento,
): number {
  const diff = toTimestamp(right.fechaSolicitud) - toTimestamp(left.fechaSolicitud)
  if (diff !== 0) return diff
  return right.id.localeCompare(left.id)
}

function isBeforeCursor(
  item: InventarioMovimiento,
  cursor: InventarioMovimientoPageCursor,
): boolean {
  const itemTime = toTimestamp(item.fechaSolicitud)
  const cursorTime = toTimestamp(cursor.fechaSolicitud)
  if (itemTime !== cursorTime) return itemTime < cursorTime
  return item.id.localeCompare(cursor.id) < 0
}

export class InMemoryInventarioMovimientoRepository implements InventarioMovimientoRepositoryPort {
  async findAll(): Promise<InventarioMovimiento[]> {
    return [...getInventarioMovimientos()].sort(byFechaSolicitudDesc)
  }

  async findPage(query: InventarioMovimientoPageQuery): Promise<InventarioMovimientoPageResult> {
    const filtered = getInventarioMovimientos()
      .filter((item) => (query.estado ? item.estado === query.estado : true))
      .sort(byFechaSolicitudDesc)
      .filter((item) => (query.cursor ? isBeforeCursor(item, query.cursor) : true))

    const pageItems = filtered.slice(0, query.limit + 1)
    const hasMore = pageItems.length > query.limit
    const items = hasMore ? pageItems.slice(0, query.limit) : pageItems
    const lastItem = hasMore ? items[items.length - 1] : null

    return {
      items,
      hasMore,
      nextCursor: lastItem
        ? {
            fechaSolicitud: lastItem.fechaSolicitud,
            id: lastItem.id,
          }
        : null,
    }
  }

  async findById(id: string): Promise<InventarioMovimiento | null> {
    const item = getInventarioMovimientoById(id)
    return item ?? null
  }

  async create(data: Omit<InventarioMovimiento, 'id'>): Promise<InventarioMovimiento> {
    return createInventarioMovimiento(data)
  }

  async update(id: string, data: Partial<InventarioMovimiento>): Promise<InventarioMovimiento | null> {
    return updateInventarioMovimiento(id, data)
  }

  async delete(id: string): Promise<boolean> {
    return deleteInventarioMovimiento(id)
  }
}
