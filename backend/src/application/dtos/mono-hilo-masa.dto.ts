import type {
  Dimension,
  MonoHiloMasa,
  ProduccionDiaria,
  UbicacionMasaMonoHilo,
} from '../../domain/entities/index.js'

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
  masaId?: string
  dimension: Dimension
  cantidadLosas: number
}

export interface RegisterMonoHiloProduccionDto {
  fecha: string
  bloqueId: string
  largoCm: number
  anchoCm: number
  profundidadCm: number
  observaciones?: string
  equipoId: string
  trabajadorIds: string[]
}

export interface RegisterMonoHiloProduccionResponseDto {
  produccion: ProduccionDiaria
  masas: MonoHiloMasa[]
}
