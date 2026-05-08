import { DomainError } from '../../errors/domain.error.js'
import {
  dimensionToAreaM2,
  type InventarioMovimientoDetalle,
  type Producto,
} from '../../../domain/entities/index.js'
import type {
  InventarioMovimientoRepositoryPort,
  ProductoRepositoryPort,
} from '../../../domain/ports/index.js'

interface ResolvedSalidaDetalle {
  detalle: InventarioMovimientoDetalle
  producto: Producto
  metrosCuadrados: number
  cantidadLosas: number
}

function round2(value: number): number {
  return Number(value.toFixed(2))
}

function estadoPrioridad(estado: Producto['estado']): number {
  if (estado === 'Pulido') return 5
  if (estado === 'Resinado') return 4
  if (estado === 'Devastado') return 3
  if (estado === 'Escuadrado') return 2
  return 1
}

function normalizeDetalleCantidadLosas(detalle: InventarioMovimientoDetalle, area: number): number {
  if (detalle.cantidadLosas > 0) return detalle.cantidadLosas
  if (detalle.metrosCuadrados > 0) return Math.ceil(detalle.metrosCuadrados / area)
  return 0
}

function normalizeDetalleMetros(detalle: InventarioMovimientoDetalle, area: number): number {
  if (detalle.metrosCuadrados > 0) return round2(detalle.metrosCuadrados)
  if (detalle.cantidadLosas > 0) return round2(detalle.cantidadLosas * area)
  return 0
}

function resolveDetalleUbicacionOrigen(detalle: InventarioMovimientoDetalle): Producto['ubicacion'] {
  return detalle.ubicacionOrigen ?? 'almacen'
}

function resolveDetalleUbicacionDestino(detalle: InventarioMovimientoDetalle): Producto['ubicacion'] {
  return detalle.ubicacionDestino ?? 'almacen'
}

export function buildEntradaRollbackDetalles(
  detalles: InventarioMovimientoDetalle[],
): InventarioMovimientoDetalle[] {
  return detalles.map((detalle) => ({
    ...detalle,
    productoId: undefined,
    estado: detalle.estadoDestino ?? detalle.estado,
    ubicacionOrigen: detalle.ubicacionDestino ?? 'almacen',
    ubicacionDestino: undefined,
  }))
}

export function buildSalidaRollbackDetalles(
  detalles: InventarioMovimientoDetalle[],
): InventarioMovimientoDetalle[] {
  return detalles.map((detalle) => ({
    ...detalle,
    productoId: undefined,
    estado: detalle.estado ?? detalle.estadoDestino,
    ubicacionOrigen: undefined,
    ubicacionDestino: detalle.ubicacionOrigen ?? 'almacen',
  }))
}

function matchesDetalleBase(producto: Producto, detalle: InventarioMovimientoDetalle): boolean {
  return (
    producto.origenId === detalle.origenId &&
    producto.tipo === detalle.tipo &&
    producto.dimension === detalle.dimension
  )
}

function resolveExistingProductoForSalida(
  productos: Producto[],
  detalle: InventarioMovimientoDetalle,
): Producto | null {
  const ubicacionOrigen = resolveDetalleUbicacionOrigen(detalle)

  if (detalle.productoId) {
    const byId = productos.find((producto) => producto.id === detalle.productoId)
    if (byId && byId.ubicacion === ubicacionOrigen) return byId
  }

  const candidatos = productos
    .filter((producto) => producto.ubicacion === ubicacionOrigen)
    .filter((producto) => matchesDetalleBase(producto, detalle))
    .filter((producto) => (detalle.estado ? producto.estado === detalle.estado : true))

  if (candidatos.length === 0) return null
  return candidatos.sort((a, b) => estadoPrioridad(b.estado) - estadoPrioridad(a.estado))[0]
}

function resolveExistingProductoForEntrada(
  productos: Producto[],
  detalle: InventarioMovimientoDetalle,
  ubicacionDestino: Producto['ubicacion'],
): Producto | null {
  const candidatos = productos
    .filter((producto) => producto.ubicacion === ubicacionDestino)
    .filter((producto) => matchesDetalleBase(producto, detalle))
    .filter((producto) => (detalle.estado ? producto.estado === detalle.estado : true))

  if (candidatos.length === 0) return null
  return candidatos.sort((a, b) => estadoPrioridad(b.estado) - estadoPrioridad(a.estado))[0]
}

function resolvePrecioM2Entrada(
  productos: Producto[],
  detalle: InventarioMovimientoDetalle,
): number {
  if (detalle.productoId) {
    const productoOrigen = productos.find((producto) => producto.id === detalle.productoId)
    if (productoOrigen && productoOrigen.precioM2 > 0) {
      return productoOrigen.precioM2
    }
  }

  const candidato = productos
    .filter((producto) => matchesDetalleBase(producto, detalle))
    .filter((producto) => producto.precioM2 > 0)
    .sort((a, b) => estadoPrioridad(b.estado) - estadoPrioridad(a.estado))[0]

  return candidato?.precioM2 ?? 0
}

export async function applyInventarioEntrada(
  detalles: InventarioMovimientoDetalle[],
  productoRepository: ProductoRepositoryPort,
): Promise<void> {
  const productos = await productoRepository.findAll()

  for (const detalle of detalles) {
    const area = dimensionToAreaM2(detalle.dimension)
    const cantidadLosas = normalizeDetalleCantidadLosas(detalle, area)
    const metrosCuadrados = normalizeDetalleMetros(detalle, area)
    const ubicacionDestino = resolveDetalleUbicacionDestino(detalle)
    const precioM2 = resolvePrecioM2Entrada(productos, detalle)

    if (cantidadLosas <= 0 && metrosCuadrados <= 0) {
      continue
    }

    const existente = resolveExistingProductoForEntrada(productos, detalle, ubicacionDestino)
    if (existente) {
      const precioActualizado = existente.precioM2 > 0 ? existente.precioM2 : precioM2
      const updated = await productoRepository.update(existente.id, {
        cantidadLosas: existente.cantidadLosas + cantidadLosas,
        metrosCuadrados: round2(existente.metrosCuadrados + metrosCuadrados),
        precioM2: precioActualizado,
      })
      if (!updated) {
        throw new DomainError(
          `No se pudo actualizar producto ${existente.id}`,
          500,
          'INVENTARIO_UPDATE_FAILED',
        )
      }

      const index = productos.findIndex((producto) => producto.id === existente.id)
      if (index >= 0) productos[index] = updated
      continue
    }

    if (!detalle.estado) {
      throw new DomainError(
        `El detalle ${detalle.productoNombre} requiere estado para crear entrada de inventario`,
        400,
        'INVENTARIO_ESTADO_REQUERIDO',
      )
    }

    const created = await productoRepository.create({
      nombre: detalle.productoNombre,
      tipo: detalle.tipo,
      estado: detalle.estado,
      ubicacion: ubicacionDestino,
      dimension: detalle.dimension,
      origenId: detalle.origenId,
      origenNombre: detalle.origenNombre,
      cantidadLosas,
      metrosCuadrados,
      precioM2,
      imagen: '/placeholder.jpg',
    })
    productos.push(created)
  }
}

async function resolveSalidaDetalles(
  detalles: InventarioMovimientoDetalle[],
  productoRepository: ProductoRepositoryPort,
): Promise<ResolvedSalidaDetalle[]> {
  const productos = await productoRepository.findAll()

  return detalles
    .map((detalle) => {
      const area = dimensionToAreaM2(detalle.dimension)
      const cantidadLosas = normalizeDetalleCantidadLosas(detalle, area)
      const metrosCuadrados = normalizeDetalleMetros(detalle, area)

      if (cantidadLosas <= 0 && metrosCuadrados <= 0) {
        return null
      }

      const producto = resolveExistingProductoForSalida(productos, detalle)
      if (!producto) {
        throw new DomainError(
          `Producto no encontrado para salida: ${detalle.productoNombre}`,
          404,
          'PRODUCTO_NOT_FOUND',
          { detalle },
        )
      }

      return {
        detalle,
        producto,
        metrosCuadrados,
        cantidadLosas,
      }
    })
    .filter((value): value is ResolvedSalidaDetalle => Boolean(value))
}

export async function validateInventarioSalida(
  detalles: InventarioMovimientoDetalle[],
  productoRepository: ProductoRepositoryPort,
  movimientoRepository?: InventarioMovimientoRepositoryPort,
): Promise<void> {
  const resolved = await resolveSalidaDetalles(detalles, productoRepository)
  const consumoPorProducto = aggregateSalidaConsumption(resolved)
  const consumoPendientePorProducto = movimientoRepository
    ? await resolvePendingSalidaConsumption(productoRepository, movimientoRepository)
    : new Map<string, { losas: number; metros: number }>()

  for (const { losas, metros, producto } of consumoPorProducto.values()) {
    const pendiente = consumoPendientePorProducto.get(producto.id)
    const disponibleLosas = Math.max(0, producto.cantidadLosas - (pendiente?.losas ?? 0))
    const disponibleM2 = round2(Math.max(0, producto.metrosCuadrados - (pendiente?.metros ?? 0)))

    if (disponibleLosas < losas || disponibleM2 + 1e-6 < metros) {
      throw new DomainError(
        `Stock insuficiente para ${producto.nombre}`,
        409,
        'STOCK_INSUFICIENTE',
        {
          productoId: producto.id,
          disponibleLosas,
          solicitadoLosas: losas,
          disponibleM2,
          solicitadoM2: round2(metros),
          reservadoPendienteLosas: pendiente?.losas ?? 0,
          reservadoPendienteM2: round2(pendiente?.metros ?? 0),
        },
      )
    }
  }
}

export async function applyInventarioSalida(
  detalles: InventarioMovimientoDetalle[],
  productoRepository: ProductoRepositoryPort,
): Promise<void> {
  const resolved = await resolveSalidaDetalles(detalles, productoRepository)
  const consumoPorProducto = aggregateSalidaConsumption(resolved)

  for (const { losas, metros, producto } of consumoPorProducto.values()) {
    if (producto.cantidadLosas < losas || producto.metrosCuadrados + 1e-6 < metros) {
      throw new DomainError(
        `Stock insuficiente para ${producto.nombre}`,
        409,
        'STOCK_INSUFICIENTE',
        {
          productoId: producto.id,
          disponibleLosas: producto.cantidadLosas,
          solicitadoLosas: losas,
          disponibleM2: round2(producto.metrosCuadrados),
          solicitadoM2: round2(metros),
        },
      )
    }

    const updated = await productoRepository.update(producto.id, {
      cantidadLosas: Math.max(0, producto.cantidadLosas - losas),
      metrosCuadrados: round2(Math.max(0, producto.metrosCuadrados - metros)),
    })

    if (!updated) {
      throw new DomainError(
        `No se pudo actualizar producto ${producto.id}`,
        500,
        'INVENTARIO_UPDATE_FAILED',
      )
    }
  }
}

function aggregateSalidaConsumption(
  resolved: ResolvedSalidaDetalle[],
): Map<string, { losas: number; metros: number; producto: Producto }> {
  const consumoPorProducto = new Map<string, { losas: number; metros: number; producto: Producto }>()

  for (const item of resolved) {
    const current = consumoPorProducto.get(item.producto.id)
    if (!current) {
      consumoPorProducto.set(item.producto.id, {
        losas: item.cantidadLosas,
        metros: item.metrosCuadrados,
        producto: item.producto,
      })
      continue
    }

    current.losas += item.cantidadLosas
    current.metros += item.metrosCuadrados
  }

  return consumoPorProducto
}

async function resolvePendingSalidaConsumption(
  productoRepository: ProductoRepositoryPort,
  movimientoRepository: InventarioMovimientoRepositoryPort,
): Promise<Map<string, { losas: number; metros: number }>> {
  const movimientosPendientes = (await movimientoRepository.findAll()).filter(
    (movimiento) =>
      movimiento.estado === 'pendiente' &&
      (movimiento.tipo === 'salida' || movimiento.origen === 'proceso'),
  )

  if (movimientosPendientes.length === 0) {
    return new Map()
  }

  const detallesPendientes = movimientosPendientes.flatMap((movimiento) => movimiento.detalles)
  const resolved = await resolveSalidaDetalles(detallesPendientes, productoRepository)
  const consumoPendiente = new Map<string, { losas: number; metros: number }>()

  for (const item of resolved) {
    const current = consumoPendiente.get(item.producto.id)
    if (!current) {
      consumoPendiente.set(item.producto.id, {
        losas: item.cantidadLosas,
        metros: item.metrosCuadrados,
      })
      continue
    }

    current.losas += item.cantidadLosas
    current.metros += item.metrosCuadrados
  }

  return consumoPendiente
}
