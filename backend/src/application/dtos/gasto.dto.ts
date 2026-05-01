import type { Gasto } from '../../domain/entities/index.js'

export type CreateGastoDto = Pick<Gasto, 'fecha' | 'costo' | 'tipo' | 'flujo' | 'descripcion' | 'encargado'>
export type UpdateGastoDto = Partial<CreateGastoDto>
export type CancelGastoDto = {
  motivoAnulacion: string
}
export type GastoResponseDto = Gasto
