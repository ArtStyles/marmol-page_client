import type { Equipo } from '../../domain/entities/index.js'

export type CreateEquipoDto = Omit<Equipo, 'id'>
export type UpdateEquipoDto = Partial<Omit<Equipo, 'id'>>
export type EquipoResponseDto = Equipo
