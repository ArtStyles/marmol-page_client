import type { BloqueRepositoryPort } from '../../../domain/ports/index.js'
import type { BloqueOLote } from '../../../domain/entities/index.js'
import {
  getBloques,
  getBloqueById,
  createBloque,
  updateBloque,
  deleteBloque,
} from '../../../store/index.js'

function normalizeBloqueCodigo(item: BloqueOLote): BloqueOLote {
  const prefijo = item.tipo === 'Bloque' ? 'A' : 'L'
  const codigoRegex = new RegExp(`^${prefijo}-\\d{3}$`)
  const nombreActual = item.nombre.trim()

  if (codigoRegex.test(nombreActual)) {
    return item
  }

  const match = item.id.match(/(\d+)$/)
  if (!match) return item

  const numero = Number.parseInt(match[1], 10)
  if (!Number.isFinite(numero) || numero <= 0) return item

  return {
    ...item,
    nombre: `${prefijo}-${String(numero).padStart(3, '0')}`,
  }
}

export class InMemoryBloqueRepository implements BloqueRepositoryPort {
  async findAll(): Promise<BloqueOLote[]> {
    return getBloques().map(normalizeBloqueCodigo)
  }

  async findById(id: string): Promise<BloqueOLote | null> {
    const item = getBloqueById(id)
    return item ? normalizeBloqueCodigo(item) : null
  }

  async create(data: Omit<BloqueOLote, 'id'>): Promise<BloqueOLote> {
    return normalizeBloqueCodigo(createBloque(data))
  }

  async update(id: string, data: Partial<BloqueOLote>): Promise<BloqueOLote | null> {
    const updated = updateBloque(id, data)
    return updated ? normalizeBloqueCodigo(updated) : null
  }

  async delete(id: string): Promise<boolean> {
    return deleteBloque(id)
  }
}
