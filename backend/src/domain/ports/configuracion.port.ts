import type { ConfiguracionSistema } from '../entities/index.js'

/**
 * Puerto para lectura/escritura de la configuración del sistema.
 * La implementación (in-memory, DB) vive en infraestructura.
 */
export interface ConfiguracionPort {
  get(): Promise<ConfiguracionSistema>
  save(config: ConfiguracionSistema): Promise<ConfiguracionSistema>
}
