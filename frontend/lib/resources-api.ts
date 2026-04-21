import type {
  BloqueOLote,
  CatalogoItem,
  ConfiguracionSistema,
  Equipo,
  HistorialPago,
  InventarioMovimiento,
  InventarioMovimientoPage,
  Merma,
  MonoHiloMasa,
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

export const createProducto = (input: Omit<Producto, 'id'>): Promise<Producto> =>
  apiRequest<Producto>('/productos', {
    method: 'POST',
    body: input,
  })

export const updateProducto = (
  productoId: string,
  patch: Partial<Producto>,
): Promise<Producto> =>
  apiRequest<Producto>(`/productos/${productoId}`, {
    method: 'PATCH',
    body: patch,
  })

export const deleteProducto = async (productoId: string): Promise<boolean> => {
  await apiRequest<void>(`/productos/${productoId}`, {
    method: 'DELETE',
  })
  return true
}

export const getBloques = (): Promise<BloqueOLote[]> => apiRequest<BloqueOLote[]>('/bloques')

export const createBloque = (
  input: Omit<BloqueOLote, 'id' | 'nombre'> & { nombre?: string },
): Promise<BloqueOLote> =>
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

export const createEquipo = (
  input: Omit<Equipo, 'id' | 'codigoInterno'>,
): Promise<Equipo> =>
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

export const approveProduccionTaller = (
  produccionId: string,
  input: { aprobado: boolean; motivoRechazo?: string },
): Promise<ProduccionDiaria> =>
  apiRequest<ProduccionDiaria>(`/produccion/${produccionId}/aprobar-taller`, {
    method: 'PATCH',
    body: input,
  })

export const approveProduccionAlmacen = (
  produccionId: string,
  input: { motivo: string },
): Promise<ProduccionDiaria> =>
  apiRequest<ProduccionDiaria>(`/produccion/${produccionId}/aprobar-almacen`, {
    method: 'PATCH',
    body: input,
  })

export const cancelMonoHiloProduccion = (
  produccionId: string,
  input: { motivo: string },
): Promise<{ produccion: ProduccionDiaria; masas: MonoHiloMasa[] }> =>
  apiRequest<{ produccion: ProduccionDiaria; masas: MonoHiloMasa[] }>(
    `/produccion/${produccionId}/anular-mono-hilo`,
    {
      method: 'PATCH',
      body: input,
    },
  )

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

export const getMonoHiloMasas = (): Promise<MonoHiloMasa[]> =>
  apiRequest<MonoHiloMasa[]>('/mono-hilo/masas')

export const createMonoHiloMasas = (input: {
  bloqueId: string
  masas: Array<{
    largoCm: number
    anchoCm: number
    profundidadCm: number
    observaciones?: string
  }>
}): Promise<MonoHiloMasa[]> =>
  apiRequest<MonoHiloMasa[]>('/mono-hilo/masas', {
    method: 'POST',
    body: input,
  })

export const registerMonoHiloProduccion = (input: {
  fecha: string
  bloqueId: string
  largoCm: number
  anchoCm: number
  profundidadCm: number
  observaciones?: string
  equipoId: string
  trabajadorIds: string[]
}): Promise<{ produccion: ProduccionDiaria; masas: MonoHiloMasa[] }> =>
  apiRequest<{ produccion: ProduccionDiaria; masas: MonoHiloMasa[] }>('/mono-hilo/registro', {
    method: 'POST',
    body: input,
  })

export const updateMonoHiloMasaUbicacion = (
  masaId: string,
  input: { ubicacionDestino: 'almacen' | 'proceso' },
): Promise<MonoHiloMasa> =>
  apiRequest<MonoHiloMasa>(`/mono-hilo/masas/${masaId}/ubicacion`, {
    method: 'PATCH',
    body: input,
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

type GetInventarioMovimientosPageParams = {
  limit?: number
  cursor?: string
  estado?: InventarioMovimiento['estado']
}

function buildInventarioMovimientosPagePath(
  params: GetInventarioMovimientosPageParams = {},
): string {
  const query = new URLSearchParams()
  if (typeof params.limit === 'number' && Number.isFinite(params.limit)) {
    query.set('limit', String(Math.trunc(params.limit)))
  }
  if (params.cursor) query.set('cursor', params.cursor)
  if (params.estado) query.set('estado', params.estado)
  const queryString = query.toString()
  return queryString.length > 0
    ? `/inventario-movimientos?${queryString}`
    : '/inventario-movimientos'
}

export const getInventarioMovimientosPage = (
  params: GetInventarioMovimientosPageParams = {},
): Promise<InventarioMovimientoPage> =>
  apiRequest<InventarioMovimientoPage>(buildInventarioMovimientosPagePath(params))

export const getInventarioMovimientos = async (): Promise<InventarioMovimiento[]> => {
  const collected: InventarioMovimiento[] = []
  const seen = new Set<string>()
  let cursor: string | undefined
  let hasMore = true

  while (hasMore) {
    const page = await getInventarioMovimientosPage({ limit: 100, cursor })
    for (const item of page.items) {
      if (seen.has(item.id)) continue
      seen.add(item.id)
      collected.push(item)
    }
    hasMore = page.hasMore && !!page.nextCursor
    cursor = page.nextCursor ?? undefined
  }

  return collected
}

export const getInventarioMovimientoById = (id: string): Promise<InventarioMovimiento> =>
  apiRequest<InventarioMovimiento>(`/inventario-movimientos/${id}`)

export const createSalidaProcesoInventario = (input: {
  accionObjetivo: 'escuadrar' | 'devastar' | 'resinar' | 'pulir'
  productoId: string
  cantidadLosas: number
}): Promise<InventarioMovimiento> =>
  apiRequest<InventarioMovimiento>('/inventario-movimientos/proceso-salida', {
    method: 'POST',
    body: input,
  })

export const createRetornoProcesoInventario = (input: {
  productoId: string
  cantidadLosas: number
  motivo: string
  estadoObjetivo?: Producto['estado']
}): Promise<InventarioMovimiento> =>
  apiRequest<InventarioMovimiento>('/inventario-movimientos/proceso-retorno', {
    method: 'POST',
    body: input,
  })

export const approveInventarioMovimiento = (
  id: string,
  input: { observaciones?: string },
): Promise<InventarioMovimiento> =>
  apiRequest<InventarioMovimiento>(`/inventario-movimientos/${id}/aprobar`, {
    method: 'PATCH',
    body: input,
  })

export const rejectInventarioMovimiento = (
  id: string,
  input: { motivoRechazo: string },
): Promise<InventarioMovimiento> =>
  apiRequest<InventarioMovimiento>(`/inventario-movimientos/${id}/rechazar`, {
    method: 'PATCH',
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

