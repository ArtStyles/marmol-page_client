import { dimensiones } from '@/lib/data'
import type { ConfiguracionSistema, Dimension, Producto, Venta, VentaDetalleProducto } from '@/lib/types'
import type { FormDetalleProducto } from '../model/types'

export const dimensionOptions: Dimension[] = dimensiones as Dimension[]

export const createEmptyMetros = (): Record<Dimension, number> => ({
  '40x40': 0,
  '60x40': 0,
  '80x40': 0,
})

export const getDimensionAreaM2 = (dimension: Dimension): number => {
  if (dimension === '40x40') return 1 / 6
  if (dimension === '60x40') return 1 / 4
  return 1 / 3
}

export const metrosToLosasEquivalentes = (metros: number, dimension: Dimension): number => {
  const area = getDimensionAreaM2(dimension)
  if (area <= 0) return 0
  return metros / area
}

export const createDetalleFormulario = (index: number): FormDetalleProducto => ({
  id: `detalle-${index}`,
  productoId: '',
  metrosCuadrados: 0,
  cantidadUnidades: 0,
})

export const formatMoney = (value: number): string => `$${Math.round(value).toLocaleString()}`

export const getPrecioProducto = (
  producto: Producto,
  preciosM2: ConfiguracionSistema['preciosM2'],
): number => {
  const estado = producto.estado === 'Pulido' ? 'pulido' : 'crudo'
  return preciosM2[producto.dimension][estado]
}

export const getMetrosVenta = (
  venta: Venta,
  productos: Producto[],
): Record<Dimension, number> => {
  if (venta.detallesProductos && venta.detallesProductos.length > 0) {
    return venta.detallesProductos.reduce<Record<Dimension, number>>((acc, detalle) => {
      acc[detalle.dimension] += detalle.metrosCuadrados
      return acc
    }, createEmptyMetros())
  }

  if (venta.metrosPorDimension) {
    return {
      '40x40': venta.metrosPorDimension['40x40'] ?? 0,
      '60x40': venta.metrosPorDimension['60x40'] ?? 0,
      '80x40': venta.metrosPorDimension['80x40'] ?? 0,
    }
  }

  const producto = productos.find((p) => p.id === venta.productoId)
  const fallback = createEmptyMetros()
  if (producto) {
    fallback[producto.dimension] = venta.cantidadM2
  }
  return fallback
}

export const getVentaDetalles = (
  venta: Venta,
  productos: Producto[],
): VentaDetalleProducto[] => {
  if (venta.detallesProductos && venta.detallesProductos.length > 0) {
    return venta.detallesProductos
  }

  const producto = productos.find((item) => item.id === venta.productoId)
  if (!producto) return []

  const metrosPorDimension = getMetrosVenta(venta, productos)
  const metrosFallback = metrosPorDimension[producto.dimension] || venta.cantidadM2

  return [
    {
      productoId: producto.id,
      productoNombre: producto.nombre,
      origenId: producto.origenId,
      origenNombre: producto.origenNombre,
      dimension: producto.dimension,
      estado: producto.estado,
      metrosCuadrados: metrosFallback,
      precioM2: venta.precioM2,
      subtotal: metrosFallback * venta.precioM2,
    },
  ]
}

export const getVentaProductoResumen = (venta: Venta, productos: Producto[]): string => {
  const detalles = getVentaDetalles(venta, productos)
  if (detalles.length === 0) return venta.productoNombre
  if (detalles.length === 1) return detalles[0].productoNombre
  return `${detalles[0].productoNombre} +${detalles.length - 1}`
}

export const getVentaBloquesResumen = (venta: Venta, productos: Producto[]): string => {
  const detalles = getVentaDetalles(venta, productos)
  const bloques = Array.from(new Set(detalles.map((detalle) => detalle.origenNombre)))

  if (bloques.length === 0) return 'Sin bloque'
  if (bloques.length === 1) return bloques[0]
  return `${bloques[0]} +${bloques.length - 1}`
}
