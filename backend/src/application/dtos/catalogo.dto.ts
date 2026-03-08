import type { CatalogoItem } from '../../domain/entities/index.js'

export type CreateCatalogoItemDto = Omit<CatalogoItem, 'id'>
export type UpdateCatalogoItemDto = Partial<Omit<CatalogoItem, 'id'>>
export type CatalogoItemResponseDto = CatalogoItem
