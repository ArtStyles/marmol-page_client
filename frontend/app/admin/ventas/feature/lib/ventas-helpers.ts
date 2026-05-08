import {
  buildEmptyMetrosPorDimension,
  dimensionToAreaM2,
  normalizeDimension,
  type Dimension,
  type EstadoInventario,
  type Producto,
  type Venta,
  type VentaDetalleProducto,
} from '@/lib/types'
import type {
  FloorDocumentDimension,
  FloorSaleFormRow,
  SaleDocumentState,
  SlabDocumentState,
  SlabSaleFormRow,
  VentaResolvedDetailRow,
  VentaResolvedSections,
} from '../model/types'

export const floorDimensionOrder: FloorDocumentDimension[] = ['80x40', '60x40', '40x40']
export const floorStateOrder: SaleDocumentState[] = ['Crudo', 'Escuadrado', 'Pulido']
export const slabStateOrder: SlabDocumentState[] = ['Crudo', 'Pulido']

const documentToInventoryState: Record<SaleDocumentState, EstadoInventario> = {
  Crudo: 'Picado',
  Escuadrado: 'Escuadrado',
  Pulido: 'Pulido',
}

const inventoryToDocumentState: Partial<Record<EstadoInventario, SaleDocumentState>> = {
  Picado: 'Crudo',
  Escuadrado: 'Escuadrado',
  Pulido: 'Pulido',
}

export const round2 = (value: number): number => Number(value.toFixed(2))

export const formatMoney = (value: number): string =>
  `CUP ${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

export const getDimensionAreaM2 = (dimension: Dimension): number => dimensionToAreaM2(dimension)

export const createEmptyMetros = (
  dimensions: Iterable<Dimension> = floorDimensionOrder,
): Record<string, number> => buildEmptyMetrosPorDimension(dimensions)

export const resolveInventoryStateFromDocument = (
  state: SaleDocumentState,
): EstadoInventario => documentToInventoryState[state]

export const resolveDocumentStateFromInventory = (
  state: EstadoInventario,
): SaleDocumentState => inventoryToDocumentState[state] ?? 'Crudo'

export const createInitialFloorRows = (): FloorSaleFormRow[] =>
  floorDimensionOrder.flatMap((dimension) =>
    floorStateOrder.map((estado) => ({
      id: `floor-${dimension}-${estado}`,
      dimension,
      estado,
      cantidadM2: 0,
      precioM2: 0,
    })),
  )

export const createSlabRow = (seed = 1): SlabSaleFormRow => ({
  id: `slab-${seed}-${Math.random().toString(16).slice(2, 7)}`,
  dimension: '160x60',
  estado: 'Crudo',
  cantidadUnidades: 0,
  precioUnitario: 0,
})

export const isProductoSellableForDocument = (producto: Producto): boolean =>
  producto.ubicacion === 'almacen' &&
  (producto.estado === 'Picado' || producto.estado === 'Escuadrado' || producto.estado === 'Pulido')

export const getVentaDetalles = (
  venta: Venta,
  productos: Producto[],
): VentaDetalleProducto[] => {
  if (venta.detallesProductos && venta.detallesProductos.length > 0) {
    return venta.detallesProductos
  }

  const producto = productos.find((item) => item.id === venta.productoId)
  if (!producto) return []

  return [
    {
      productoId: producto.id,
      productoNombre: producto.nombre,
      origenId: producto.origenId,
      origenNombre: producto.origenNombre,
      dimension: producto.dimension,
      estado: producto.estado,
      metrosCuadrados: venta.cantidadM2,
      precioM2: venta.precioM2,
      subtotal: round2(venta.cantidadM2 * venta.precioM2),
    },
  ]
}

export const resolveVentaSections = (
  venta: Venta,
  productos: Producto[],
): VentaResolvedSections => {
  const detalles = getVentaDetalles(venta, productos)

  const rows: VentaResolvedDetailRow[] = detalles.map((detalle) => {
    const tipo = productos.find((producto) => producto.id === detalle.productoId)?.tipo
      ?? (getDimensionAreaM2(detalle.dimension) > 0 && floorDimensionOrder.includes(normalizeDimension(detalle.dimension) as FloorDocumentDimension)
        ? 'Piso'
        : 'Plancha')
    const precioUnitario =
      tipo === 'Plancha'
        ? round2(detalle.precioM2 * getDimensionAreaM2(detalle.dimension))
        : undefined

    return {
      ...detalle,
      tipo,
      estadoDocumento: resolveDocumentStateFromInventory(detalle.estado),
      precioUnitario,
    }
  })

  return {
    floorRows: rows.filter((detalle) => detalle.tipo === 'Piso'),
    slabRows: rows.filter((detalle) => detalle.tipo === 'Plancha'),
  }
}

export const getVentaBloqueResumen = (venta: Venta, productos: Producto[]): string => {
  if (venta.bloqueCodigo?.trim()) {
    return venta.bloqueCodigo.trim()
  }

  const detalles = getVentaDetalles(venta, productos)
  const bloques = Array.from(new Set(detalles.map((detalle) => detalle.origenNombre).filter(Boolean)))
  return bloques[0] ?? 'Sin bloque'
}
