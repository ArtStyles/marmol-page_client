'use client'

import { useEffect, useState } from 'react'
import { useConfiguracion } from '@/hooks/use-configuracion'
import { useInventarioStore } from '@/hooks/use-inventario'
import { ventas as initialVentas } from '@/lib/data'
import { createVenta, getVentas } from '@/lib/resources-api'
import type { Dimension, Producto, Venta, VentaDetalleProducto } from '@/lib/types'
import {
  createDetalleFormulario,
  createEmptyMetros,
  getMetrosVenta as resolveMetrosVenta,
  metrosToLosasEquivalentes,
  getPrecioProducto as resolvePrecioProducto,
  getVentaBloquesResumen as resolveVentaBloquesResumen,
  getVentaDetalles as resolveVentaDetalles,
  getVentaProductoResumen as resolveVentaProductoResumen,
} from '../lib/ventas-helpers'
import type { FormDetalleProducto } from '../model/types'

type ClienteField = 'clienteNombre' | 'clienteEmail' | 'clienteTelefono'

export const useVentasPageState = () => {
  const { productos } = useInventarioStore()
  const { config } = useConfiguracion()

  const [ventas, setVentas] = useState<Venta[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null)
  const [detalleCounter, setDetalleCounter] = useState(2)
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [numericTouched, setNumericTouched] = useState({
    descuento: false,
  })
  const [formData, setFormData] = useState({
    descuento: 0,
    clienteNombre: '',
    clienteEmail: '',
    clienteTelefono: '',
    detallesProductos: [createDetalleFormulario(1)] as FormDetalleProducto[],
  })

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        setLoading(true)
        const fromApi = await getVentas()
        if (!active) return
        setVentas(fromApi)
      } catch {
        if (!active) return
        setVentas(initialVentas.map((venta) => ({ ...venta, estado: 'completada' })))
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [])

  const getPrecioProducto = (producto: Producto): number => {
    return resolvePrecioProducto(producto, config.preciosM2)
  }

  const getMetrosVenta = (venta: Venta): Record<Dimension, number> => {
    return resolveMetrosVenta(venta, productos)
  }

  const getVentaDetalles = (venta: Venta): VentaDetalleProducto[] => {
    return resolveVentaDetalles(venta, productos)
  }

  const getVentaProductoResumen = (venta: Venta): string => {
    return resolveVentaProductoResumen(venta, productos)
  }

  const getVentaBloquesResumen = (venta: Venta): string => {
    return resolveVentaBloquesResumen(venta, productos)
  }

  const filteredVentas = ventas.filter((venta) => {
    const query = searchTerm.toLowerCase()
    const detalles = getVentaDetalles(venta)

    const matchDetalle = detalles.some(
      (detalle) =>
        detalle.productoNombre.toLowerCase().includes(query) ||
        detalle.origenNombre.toLowerCase().includes(query),
    )

    return (
      venta.id.toLowerCase().includes(query) ||
      getVentaProductoResumen(venta).toLowerCase().includes(query) ||
      venta.clienteNombre.toLowerCase().includes(query) ||
      matchDetalle
    )
  })

  const groupedByDate = filteredVentas.reduce<Record<string, Venta[]>>((acc, venta) => {
    if (!acc[venta.fecha]) {
      acc[venta.fecha] = []
    }
    acc[venta.fecha].push(venta)
    return acc
  }, {})

  const fechasOrdenadas = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a))

  const ventasCompletadas = ventas
  const totalRevenue = ventasCompletadas.reduce((sum, venta) => sum + venta.total, 0)

  const totalM2PorDimension = ventasCompletadas.reduce<Record<Dimension, number>>(
    (acc, venta) => {
      const metros = getMetrosVenta(venta)
      acc['40x40'] += metros['40x40']
      acc['60x40'] += metros['60x40']
      acc['80x40'] += metros['80x40']
      return acc
    },
    createEmptyMetros(),
  )

  const totalM2Vendidos =
    totalM2PorDimension['40x40'] + totalM2PorDimension['60x40'] + totalM2PorDimension['80x40']

  const totalLosasEquivalentesPorDimension = {
    '40x40': metrosToLosasEquivalentes(totalM2PorDimension['40x40'], '40x40'),
    '60x40': metrosToLosasEquivalentes(totalM2PorDimension['60x40'], '60x40'),
    '80x40': metrosToLosasEquivalentes(totalM2PorDimension['80x40'], '80x40'),
  } satisfies Record<Dimension, number>

  const totalLosasEquivalentesVendidas =
    totalLosasEquivalentesPorDimension['40x40'] +
    totalLosasEquivalentesPorDimension['60x40'] +
    totalLosasEquivalentesPorDimension['80x40']

  const avgSaleValue = ventasCompletadas.length > 0 ? totalRevenue / ventasCompletadas.length : 0

  const recentVentas = [...ventas].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 3)

  const detallesCalculados = formData.detallesProductos
    .map((detalle) => {
      const producto = productos.find((item) => item.id === detalle.productoId)
      if (!producto || detalle.metrosCuadrados <= 0) return null

      const precioM2 = getPrecioProducto(producto)
      return {
        productoId: producto.id,
        productoNombre: producto.nombre,
        origenId: producto.origenId,
        origenNombre: producto.origenNombre,
        dimension: producto.dimension,
        estado: producto.estado,
        metrosCuadrados: detalle.metrosCuadrados,
        precioM2,
        subtotal: detalle.metrosCuadrados * precioM2,
      } satisfies VentaDetalleProducto
    })
    .filter((detalle): detalle is VentaDetalleProducto => Boolean(detalle))

  const totalM2Form = detallesCalculados.reduce((sum, detalle) => sum + detalle.metrosCuadrados, 0)
  const subtotalCalculado = detallesCalculados.reduce((sum, detalle) => sum + detalle.subtotal, 0)

  const metrosPorDimensionForm = detallesCalculados.reduce<Record<Dimension, number>>((acc, detalle) => {
    acc[detalle.dimension] += detalle.metrosCuadrados
    return acc
  }, createEmptyMetros())

  const losasEquivalentesPorDimensionForm = {
    '40x40': metrosToLosasEquivalentes(metrosPorDimensionForm['40x40'], '40x40'),
    '60x40': metrosToLosasEquivalentes(metrosPorDimensionForm['60x40'], '60x40'),
    '80x40': metrosToLosasEquivalentes(metrosPorDimensionForm['80x40'], '80x40'),
  } satisfies Record<Dimension, number>

  const descuentoCalculado = subtotalCalculado * (formData.descuento / 100)
  const totalCalculado = subtotalCalculado - descuentoCalculado

  const updateDetalleFormulario = (detalleId: string, patch: Partial<FormDetalleProducto>) => {
    setFormError(null)
    setFormData((prev) => ({
      ...prev,
      detallesProductos: prev.detallesProductos.map((detalle) =>
        detalle.id === detalleId ? { ...detalle, ...patch } : detalle,
      ),
    }))
  }

  const handleAgregarDetalleProducto = () => {
    setFormError(null)
    setFormData((prev) => ({
      ...prev,
      detallesProductos: [...prev.detallesProductos, createDetalleFormulario(detalleCounter)],
    }))
    setDetalleCounter((prev) => prev + 1)
  }

  const handleEliminarDetalleProducto = (detalleId: string) => {
    setFormError(null)
    setFormData((prev) => {
      if (prev.detallesProductos.length === 1) return prev
      return {
        ...prev,
        detallesProductos: prev.detallesProductos.filter((detalle) => detalle.id !== detalleId),
      }
    })
  }

  const handleDetalleMetrosChange = (detalleId: string, rawValue: string) => {
    const parsedValue = rawValue === '' ? 0 : Number(rawValue)
    updateDetalleFormulario(detalleId, {
      metrosCuadrados: Number.isFinite(parsedValue) ? Math.max(0, parsedValue) : 0,
    })
  }

  const handleDescuentoChange = (rawValue: string) => {
    const parsedValue = rawValue === '' ? 0 : Number(rawValue)
    setNumericTouched((prev) => ({ ...prev, descuento: rawValue !== '' }))
    setFormData((prev) => ({
      ...prev,
      descuento: Number.isFinite(parsedValue) ? Math.min(100, Math.max(0, parsedValue)) : 0,
    }))
  }

  const handleClienteFieldChange = (field: ClienteField, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const getLosasEquivalentesPorDimensionVenta = (venta: Venta): Record<Dimension, number> => {
    const metros = getMetrosVenta(venta)
    return {
      '40x40': metrosToLosasEquivalentes(metros['40x40'], '40x40'),
      '60x40': metrosToLosasEquivalentes(metros['60x40'], '60x40'),
      '80x40': metrosToLosasEquivalentes(metros['80x40'], '80x40'),
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError(null)

    const tieneProductoSinM2 = formData.detallesProductos.some(
      (detalle) => detalle.productoId && detalle.metrosCuadrados <= 0,
    )
    if (tieneProductoSinM2) {
      setFormError('Cada producto seleccionado debe tener m2 mayores a 0.')
      return
    }

    const tieneM2SinProducto = formData.detallesProductos.some(
      (detalle) => !detalle.productoId && detalle.metrosCuadrados > 0,
    )
    if (tieneM2SinProducto) {
      setFormError('Selecciona el producto para cada fila con m2 ingresados.')
      return
    }

    const detallesVenta = formData.detallesProductos
      .filter((detalle) => detalle.productoId && detalle.metrosCuadrados > 0)
      .map((detalle) => {
        const producto = productos.find((item) => item.id === detalle.productoId)
        if (!producto) return null

        const precioM2 = getPrecioProducto(producto)
        return {
          productoId: producto.id,
          productoNombre: producto.nombre,
          origenId: producto.origenId,
          origenNombre: producto.origenNombre,
          dimension: producto.dimension,
          estado: producto.estado,
          metrosCuadrados: detalle.metrosCuadrados,
          precioM2,
          subtotal: detalle.metrosCuadrados * precioM2,
        } satisfies VentaDetalleProducto
      })
      .filter((detalle): detalle is VentaDetalleProducto => Boolean(detalle))

    if (detallesVenta.length === 0) {
      setFormError('Agrega al menos un producto para registrar la venta.')
      return
    }

    const cantidadM2 = detallesVenta.reduce((sum, detalle) => sum + detalle.metrosCuadrados, 0)
    const subtotal = detallesVenta.reduce((sum, detalle) => sum + detalle.subtotal, 0)
    if (cantidadM2 <= 0) {
      setFormError('La venta debe tener m2 mayores a 0.')
      return
    }

    const metrosPorDimension = detallesVenta.reduce<Record<Dimension, number>>((acc, detalle) => {
      acc[detalle.dimension] += detalle.metrosCuadrados
      return acc
    }, createEmptyMetros())

    const primerDetalle = detallesVenta[0]
    const nombreResumen =
      detallesVenta.length > 1
        ? `${primerDetalle.productoNombre} +${detallesVenta.length - 1}`
        : primerDetalle.productoNombre

    const precioPromedio = subtotal / cantidadM2
    const descuentoTotal = subtotal * (formData.descuento / 100)
    const total = subtotal - descuentoTotal

    const newVentaPayload: Omit<Venta, 'id'> = {
      productoId: primerDetalle.productoId,
      productoNombre: nombreResumen,
      detallesProductos: detallesVenta,
      cantidadM2,
      metrosPorDimension,
      precioM2: precioPromedio,
      descuento: formData.descuento,
      fondoOperativo: 0,
      subtotal,
      total,
      clienteNombre: formData.clienteNombre,
      clienteEmail: formData.clienteEmail,
      clienteTelefono: formData.clienteTelefono,
      fecha: new Date().toISOString().split('T')[0],
      estado: 'completada',
    }

    try {
      const newVenta = await createVenta(newVentaPayload)
      setVentas((prev) => [newVenta, ...prev])
    } catch {
      setFormError('No se pudo registrar la venta en el backend.')
      return
    }

    resetForm()
  }

  const resetForm = (closeDialog = true) => {
    setFormData({
      descuento: 0,
      clienteNombre: '',
      clienteEmail: '',
      clienteTelefono: '',
      detallesProductos: [createDetalleFormulario(1)],
    })
    setDetalleCounter(2)
    setFormError(null)
    setNumericTouched({
      descuento: false,
    })
    if (closeDialog) {
      setIsDialogOpen(false)
    }
  }

  return {
    productos,
    ventas,
    searchTerm,
    setSearchTerm,
    isDialogOpen,
    setIsDialogOpen,
    selectedVenta,
    setSelectedVenta,
    formData,
    numericTouched,
    loading,
    formError,
    groupedByDate,
    fechasOrdenadas,
    ventasCompletadas,
    totalRevenue,
    totalM2PorDimension,
    totalM2Vendidos,
    totalLosasEquivalentesPorDimension,
    totalLosasEquivalentesVendidas,
    avgSaleValue,
    recentVentas,
    detallesCalculados,
    totalM2Form,
    subtotalCalculado,
    metrosPorDimensionForm,
    losasEquivalentesPorDimensionForm,
    descuentoCalculado,
    totalCalculado,
    getPrecioProducto,
    getMetrosVenta,
    getVentaDetalles,
    getVentaProductoResumen,
    getVentaBloquesResumen,
    getLosasEquivalentesPorDimensionVenta,
    updateDetalleFormulario,
    handleAgregarDetalleProducto,
    handleEliminarDetalleProducto,
    handleDetalleMetrosChange,
    handleDescuentoChange,
    handleClienteFieldChange,
    handleSubmit,
    resetForm,
  }
}
