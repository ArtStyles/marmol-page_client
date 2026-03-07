import type { Merma } from '../../domain/entities/index.js'

export type CreateMermaDto = Omit<Merma, 'id'>
export type UpdateMermaDto = Partial<Omit<Merma, 'id'>>
export type MermaResponseDto = Merma
