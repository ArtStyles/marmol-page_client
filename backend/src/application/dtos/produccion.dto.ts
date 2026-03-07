import type { ProduccionDiaria, ProduccionTrabajador } from '../../domain/entities/index.js'

export type CreateProduccionDto = Omit<ProduccionDiaria, 'id'>
export type UpdateProduccionDto = Partial<Omit<ProduccionDiaria, 'id'>>
export type ProduccionResponseDto = ProduccionDiaria

export type CreateProduccionTrabajadorDto = Omit<ProduccionTrabajador, 'id'>
export type UpdateProduccionTrabajadorDto = Partial<Omit<ProduccionTrabajador, 'id'>>
export type ProduccionTrabajadorResponseDto = ProduccionTrabajador
