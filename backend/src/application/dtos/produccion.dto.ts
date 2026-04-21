import type { MonoHiloMasa, ProduccionDiaria, ProduccionTrabajador } from '../../domain/entities/index.js'

export type CreateProduccionDto = Omit<ProduccionDiaria, 'id'>
export type UpdateProduccionDto = Partial<Omit<ProduccionDiaria, 'id'>>
export type ProduccionResponseDto = ProduccionDiaria

export interface AprobarProduccionTallerDto {
  aprobado: boolean
  motivoRechazo?: string
}

export interface AprobarEntradaProduccionAlmacenDto {
  motivo: string
}

export interface AnularProduccionMonoHiloDto {
  motivo: string
}

export interface AnularProduccionMonoHiloResponseDto {
  produccion: ProduccionDiaria
  masas: MonoHiloMasa[]
}

export type CreateProduccionTrabajadorDto = Omit<ProduccionTrabajador, 'id'>
export type UpdateProduccionTrabajadorDto = Partial<Omit<ProduccionTrabajador, 'id'>>
export type ProduccionTrabajadorResponseDto = ProduccionTrabajador
