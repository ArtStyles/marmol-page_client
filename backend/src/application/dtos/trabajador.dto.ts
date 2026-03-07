import type { Trabajador } from '../../domain/entities/index.js'

export type CreateTrabajadorDto = Omit<Trabajador, 'id'>
export type UpdateTrabajadorDto = Partial<Omit<Trabajador, 'id'>>
export type TrabajadorResponseDto = Trabajador
