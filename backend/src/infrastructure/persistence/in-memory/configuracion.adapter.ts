import type { ConfiguracionPort } from '../../../domain/ports/index.js'
import type { ConfiguracionSistema } from '../../../domain/entities/index.js'
import { getConfiguracion, setConfiguracion } from '../../../store/index.js'

export class InMemoryConfiguracionAdapter implements ConfiguracionPort {
  async get(): Promise<ConfiguracionSistema> {
    return getConfiguracion()
  }

  async save(config: ConfiguracionSistema): Promise<ConfiguracionSistema> {
    return setConfiguracion(config)
  }
}
