import type { Equipo } from '../../domain/entities/index.js'

export type CreateEquipoDto = Pick<Equipo, 'tipo' | 'estado'> & {
  notas?: string
}
export type UpdateEquipoDto = Partial<Pick<Equipo, 'tipo' | 'estado' | 'notas'>>
export type EquipoResponseDto = Equipo
