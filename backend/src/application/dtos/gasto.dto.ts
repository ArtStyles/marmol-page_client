import type { Gasto } from '../../domain/entities/index.js'

export type CreateGastoDto = Omit<Gasto, 'id'>
export type UpdateGastoDto = Partial<Omit<Gasto, 'id'>>
export type GastoResponseDto = Gasto
