import { DomainError } from '../../errors/domain.error.js'
import type { InventarioMovimientoDetalle, Producto } from '../../../domain/entities/index.js'
import type { ProductoRepositoryPort } from '../../../domain/ports/index.js'

interface ResolvedSalidaDetalle {
  detalle: InventarioMovimientoDetalle
  producto: Producto
  metrosCuadrados: number
  cantidadLosas: number
}

function dimensionToArea(dimension: Producto['dimension']): number {
  if (dimension === '40x40') return 0.16
  if (dimension === '60x40') return 0.24
  return 0.32
}

function round2(value: number): number {
  return Number(value.toFixed(2))
}

function estadoPrioridad(estado: Producto['estado']): number {
  if (estado === 'Escuadrado') return 3
  if (estado === 'Pulido') return 2
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

function matchesDetalleBase(producto: Producto, detalle: InventarioMovimientoDetalle): boolean {
  return (
    producto.origenId === detalle.origenId &&
    producto.tipo === detalle.tipo &&
    producto.dimension === detalle.dimension
  )
}

function resolveExistingProducto(
  productos: Producto[],
  detalle: InventarioMovimientoDetalle,
): Producto | null {
  if (detalle.productoId) {
    const byId = productos.find((producto) => producto.id === detalle.productoId)
    if (byId) return byId
  }

  const candidatos = productos
    .filter((producto) => matchesDetalleBase(producto, detalle))
    .filter((producto) => (detalle.estado ? producto.estado === detalle.estado : true))

  if (candidatos.length === 0) return null
  return candidatos.sort((a, b) => estadoPrioridad(b.estado) - estadoPrioridad(a.estado))[0]
}

export async function applyInventarioEntrada(
  detalles: InventarioMovimientoDetalle[],
  productoRepository: ProductoRepositoryPort,
): Promise<void> {
  const productos = await productoRepository.findAll()

  for (const detalle of detalles) {
    const area = dimensionToArea(detalle.dimension)
    const cantidadLosas = normalizeDetalleCantidadLosas(detalle, area)
    const metrosCuadrados = normalizeDetalleMetros(detalle, area)

    if (cantidadLosas <= 0 && metrosCuadrados <= 0) {
      continue
    }

    const existente = resolveExistingProducto(productos, detalle)
    if (existente) {
      const updated = await productoRepository.update(existente.id, {
        cantidadLosas: existente.cantidadLosas + cantidadLosas,
        metrosCuadrados: round2(existente.metrosCuadrados + metrosCuadrados),
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
      dimension: detalle.dimension,
      origenId: detalle.origenId,
      origenNombre: detalle.origenNombre,
      cantidadLosas,
      metrosCuadrados,
      precioM2: 0,
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
      const area = dimensionToArea(detalle.dimension)
      const cantidadLosas = normalizeDetalleCantidadLosas(detalle, area)
      const metrosCuadrados = normalizeDetalleMetros(detalle, area)

      if (cantidadLosas <= 0 && metrosCuadrados <= 0) {
        return null
      }

      const producto = resolveExistingProducto(productos, detalle)
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
): Promise<void> {
  const resolved = await resolveSalidaDetalles(detalles, productoRepository)
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
  }
}

export async function applyInventarioSalida(
  detalles: InventarioMovimientoDetalle[],
  productoRepository: ProductoRepositoryPort,
): Promise<void> {
  const resolved = await resolveSalidaDetalles(detalles, productoRepository)
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
