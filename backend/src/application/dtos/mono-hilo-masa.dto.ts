import type { Dimension, MonoHiloMasa, UbicacionMasaMonoHilo } from '../../domain/entities/index.js'

export type MonoHiloMasaResponseDto = MonoHiloMasa

export interface CreateMonoHiloMasaInputDto {
  largoCm: number
  anchoCm: number
  profundidadCm: number
  observaciones?: string
}

export interface CreateMonoHiloMasasDto {
  bloqueId: string
  masas: CreateMonoHiloMasaInputDto[]
}

export interface UpdateMonoHiloMasaUbicacionDto {
  ubicacionDestino: Exclude<UbicacionMasaMonoHilo, 'consumida'>
}

export interface ConsumeMonoHiloParaPicadoDto {
  bloqueId: string
  dimension: Dimension
  cantidadLosas: number
}
