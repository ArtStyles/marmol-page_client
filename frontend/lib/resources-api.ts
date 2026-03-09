import type {
  BloqueOLote,
  CatalogoItem,
  ConfiguracionSistema,
  Equipo,
  HistorialPago,
  Merma,
  ProduccionDiaria,
  ProduccionTrabajador,
  Producto,
  SystemLog,
  Trabajador,
  Venta,
} from './types'
import { apiRequest } from './api-client'

export type GastoTipo =
  | 'Materia prima'
  | 'Transporte'
  | 'Servicios'
  | 'Mantenimiento'
  | 'Nomina'
  | 'Operacion'
  | 'Imprevisto'

export type GastoFlujo = 'Produccion' | 'Inventario' | 'Ventas' | 'Administracion' | 'General'

export type Gasto = {
  id: string
  fecha: string
  costo: number
  tipo: GastoTipo
  flujo: GastoFlujo
  descripcion: string
  encargado: string
}

export const getConfiguracion = (): Promise<ConfiguracionSistema> =>
  apiRequest<ConfiguracionSistema>('/configuracion')

export const updateConfiguracion = (
  input: Partial<ConfiguracionSistema>,
): Promise<ConfiguracionSistema> =>
  apiRequest<ConfiguracionSistema>('/configuracion', {
    method: 'PUT',
    body: input,
  })

export const getProductos = (): Promise<Producto[]> => apiRequest<Producto[]>('/productos')

export const getBloques = (): Promise<BloqueOLote[]> => apiRequest<BloqueOLote[]>('/bloques')

export const createBloque = (input: Omit<BloqueOLote, 'id'>): Promise<BloqueOLote> =>
  apiRequest<BloqueOLote>('/bloques', {
    method: 'POST',
    body: input,
  })

export const updateBloque = (
  bloqueId: string,
  patch: Partial<BloqueOLote>,
): Promise<BloqueOLote> =>
  apiRequest<BloqueOLote>(`/bloques/${bloqueId}`, {
    method: 'PATCH',
    body: patch,
  })

export const deleteBloque = async (bloqueId: string): Promise<boolean> => {
  await apiRequest<void>(`/bloques/${bloqueId}`, {
    method: 'DELETE',
  })
  return true
}

export const getTrabajadores = (): Promise<Trabajador[]> =>
  apiRequest<Trabajador[]>('/trabajadores')

export const createTrabajador = (input: Omit<Trabajador, 'id'>): Promise<Trabajador> =>
  apiRequest<Trabajador>('/trabajadores', {
    method: 'POST',
    body: input,
  })

export const updateTrabajador = (
  trabajadorId: string,
  patch: Partial<Trabajador>,
): Promise<Trabajador> =>
  apiRequest<Trabajador>(`/trabajadores/${trabajadorId}`, {
    method: 'PATCH',
    body: patch,
  })

export const deleteTrabajador = async (trabajadorId: string): Promise<boolean> => {
  await apiRequest<void>(`/trabajadores/${trabajadorId}`, {
    method: 'DELETE',
  })
  return true
}

export const getEquipos = (): Promise<Equipo[]> => apiRequest<Equipo[]>('/equipos')

export const createEquipo = (input: Omit<Equipo, 'id'>): Promise<Equipo> =>
  apiRequest<Equipo>('/equipos', {
    method: 'POST',
    body: input,
  })

export const updateEquipo = (
  equipoId: string,
  patch: Partial<Equipo>,
): Promise<Equipo> =>
  apiRequest<Equipo>(`/equipos/${equipoId}`, {
    method: 'PATCH',
    body: patch,
  })

export const deleteEquipo = async (equipoId: string): Promise<boolean> => {
  await apiRequest<void>(`/equipos/${equipoId}`, {
    method: 'DELETE',
  })
  return true
}

export const getProduccion = (): Promise<ProduccionDiaria[]> =>
  apiRequest<ProduccionDiaria[]>('/produccion')

export const createProduccion = (input: Omit<ProduccionDiaria, 'id'>): Promise<ProduccionDiaria> =>
  apiRequest<ProduccionDiaria>('/produccion', {
    method: 'POST',
    body: input,
  })

export const updateProduccion = (
  produccionId: string,
  patch: Partial<ProduccionDiaria>,
): Promise<ProduccionDiaria> =>
  apiRequest<ProduccionDiaria>(`/produccion/${produccionId}`, {
    method: 'PATCH',
    body: patch,
  })

export const deleteProduccion = async (produccionId: string): Promise<boolean> => {
  await apiRequest<void>(`/produccion/${produccionId}`, {
    method: 'DELETE',
  })
  return true
}

export const getProduccionTrabajadores = (): Promise<ProduccionTrabajador[]> =>
  apiRequest<ProduccionTrabajador[]>('/produccion-trabajadores')

export const updateProduccionTrabajador = (
  produccionTrabajadorId: string,
  patch: Partial<ProduccionTrabajador>,
): Promise<ProduccionTrabajador> =>
  apiRequest<ProduccionTrabajador>(`/produccion-trabajadores/${produccionTrabajadorId}`, {
    method: 'PATCH',
    body: patch,
  })

export const getMermas = (): Promise<Merma[]> => apiRequest<Merma[]>('/mermas')

export const createMerma = (input: Omit<Merma, 'id'>): Promise<Merma> =>
  apiRequest<Merma>('/mermas', {
    method: 'POST',
    body: input,
  })

export const updateMerma = (
  mermaId: string,
  patch: Partial<Merma>,
): Promise<Merma> =>
  apiRequest<Merma>(`/mermas/${mermaId}`, {
    method: 'PATCH',
    body: patch,
  })

export const deleteMerma = async (mermaId: string): Promise<boolean> => {
  await apiRequest<void>(`/mermas/${mermaId}`, {
    method: 'DELETE',
  })
  return true
}

export const getVentas = (): Promise<Venta[]> => apiRequest<Venta[]>('/ventas')

export const createVenta = (input: Omit<Venta, 'id'>): Promise<Venta> =>
  apiRequest<Venta>('/ventas', {
    method: 'POST',
    body: input,
  })

export const getGastos = (): Promise<Gasto[]> => apiRequest<Gasto[]>('/gastos')

export const createGasto = (input: Omit<Gasto, 'id'>): Promise<Gasto> =>
  apiRequest<Gasto>('/gastos', {
    method: 'POST',
    body: input,
  })

export const getHistorialPagos = (): Promise<HistorialPago[]> =>
  apiRequest<HistorialPago[]>('/historial-pagos')

export const createHistorialPago = (
  input: Omit<HistorialPago, 'id'>,
): Promise<HistorialPago> =>
  apiRequest<HistorialPago>('/historial-pagos', {
    method: 'POST',
    body: input,
  })

export const updateHistorialPago = (
  historialPagoId: string,
  patch: Partial<HistorialPago>,
): Promise<HistorialPago> =>
  apiRequest<HistorialPago>(`/historial-pagos/${historialPagoId}`, {
    method: 'PATCH',
    body: patch,
  })

export const deleteHistorialPago = async (historialPagoId: string): Promise<boolean> => {
  await apiRequest<void>(`/historial-pagos/${historialPagoId}`, {
    method: 'DELETE',
  })
  return true
}

export const getLogs = (): Promise<SystemLog[]> => apiRequest<SystemLog[]>('/logs')

export const getCatalogo = (): Promise<Array<CatalogoItem & { visible?: boolean }>> =>
  apiRequest<Array<CatalogoItem & { visible?: boolean }>>('/catalogo')

export const createCatalogoItem = (
  input: Omit<CatalogoItem, 'id'> & { visible?: boolean },
): Promise<CatalogoItem & { visible?: boolean }> =>
  apiRequest<CatalogoItem & { visible?: boolean }>('/catalogo', {
    method: 'POST',
    body: input,
  })

export const updateCatalogoItem = (
  itemId: string,
  patch: Partial<CatalogoItem & { visible?: boolean }>,
): Promise<CatalogoItem & { visible?: boolean }> =>
  apiRequest<CatalogoItem & { visible?: boolean }>(`/catalogo/${itemId}`, {
    method: 'PATCH',
    body: patch,
  })

export const deleteCatalogoItem = async (itemId: string): Promise<boolean> => {
  await apiRequest<void>(`/catalogo/${itemId}`, {
    method: 'DELETE',
  })
  return true
}
