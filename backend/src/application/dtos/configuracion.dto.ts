import type { ConfiguracionSistema } from '../../domain/entities/index.js'

export type ConfiguracionResponseDto = ConfiguracionSistema
export type UpdateConfiguracionDto = Partial<ConfiguracionSistema>
