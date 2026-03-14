import type { ConfiguracionPort } from '../../../domain/ports/index.js'
import type { ConfiguracionSistema } from '../../../domain/entities/index.js'
import { getActiveWorkshopId } from '../../tenant/tenant-context.js'
import {
  getConfiguracion,
  getWorkshopById,
  setConfiguracion,
  updateWorkshop,
} from '../../../store/index.js'

function applyWorkshopCompanyInfo(config: ConfiguracionSistema): ConfiguracionSistema {
  const workshopId = getActiveWorkshopId()
  const workshop = getWorkshopById(workshopId)
  if (!workshop) return config

  return {
    ...config,
    nombreEmpresa: workshop.nombre,
    email: workshop.correo,
    telefono: workshop.telefono,
    direccion: workshop.direccion,
  }
}

export class InMemoryConfiguracionAdapter implements ConfiguracionPort {
  async get(): Promise<ConfiguracionSistema> {
    return applyWorkshopCompanyInfo(getConfiguracion())
  }

  async save(config: ConfiguracionSistema): Promise<ConfiguracionSistema> {
    const saved = setConfiguracion(config)
    const workshopId = getActiveWorkshopId()
    updateWorkshop(workshopId, {
      nombre: config.nombreEmpresa,
      correo: config.email,
      telefono: config.telefono,
      direccion: config.direccion,
    })
    return applyWorkshopCompanyInfo(saved)
  }
}
