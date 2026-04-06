import type { BloqueOLote } from '../../domain/entities/index.js'

/** DTO para crear un bloque/lote (sin id, generado por el sistema) */
export type CreateBloqueDto = Omit<BloqueOLote, 'id' | 'nombre'> & {
  nombre?: string
}

/** DTO para actualización parcial */
export type UpdateBloqueDto = Partial<Omit<BloqueOLote, 'id'>>

/** DTO de respuesta: entidad tal cual (o se puede omitir campos sensibles si hubiera) */
export type BloqueResponseDto = BloqueOLote
