'use client'

import { useEffect, useMemo, useState } from 'react'
import { useConfiguracion } from '@/hooks/use-configuracion'
import { useInventarioStore } from '@/hooks/use-inventario'
import { createVenta, getVentas } from '@/lib/resources-api'
import type { Dimension, Producto, Venta, VentaDetalleProducto } from '@/lib/types'
import {
  createDetalleFormulario,
  createEmptyMetros,
  getDimensionAreaM2,
  getMetrosVenta as resolveMetrosVenta,
  metrosToLosasEquivalentes,
  getPrecioProducto as resolvePrecioProducto,
  getVentaBloquesResumen as resolveVentaBloquesResumen,
  getVentaDetalles as resolveVentaDetalles,
  getVentaProductoResumen as resolveVentaProductoResumen,
} from '../lib/ventas-helpers'
import type { FormDetalleProducto } from '../model/types'

type ClienteField = 'clienteNombre' | 'clienteEmail' | 'clienteTelefono' | 'motivoMovimientoAlmacen'

function round2(value: number): number {
  return Number(value.toFixed(2))
}

export const useVentasPageState = () => {
  const { productos: inventarioProductos } = useInventarioStore()
  const productos = useMemo(
    () => inventarioProductos.filter((producto) => producto.ubicacion === 'almacen'),
    [inventarioProductos],
  )
  const { config } = useConfiguracion()

  const [ventas, setVentas] = useState<Venta[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null)
  const [detalleCounter, setDetalleCounter] = useState(2)
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [numericTouched, setNumericTouched] = useState({
    descuento: false,
  })
  const [formData, setFormData] = useState({
    descuento: 0,
    clienteNombre: '',
    clienteEmail: '',
    clienteTelefono: '',
    motivoMovimientoAlmacen: '',
    detallesProductos: [createDetalleFormulario(1)] as FormDetalleProducto[],
  })

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        setLoading(true)
        setLoadError(null)
        const fromApi = await getVentas()
        if (!active) return
        setVentas(fromApi)
      } catch {
        if (!active) return
        setVentas([])
        setLoadError('No se pudieron cargar las ventas desde el backend.')
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

  const resolveDetalleCantidad = (detalle: FormDetalleProducto, producto: Producto) => {
    if (producto.tipo === 'Plancha') {
      const cantidadUnidades = Math.max(0, Math.trunc(detalle.cantidadUnidades || 0))
      const metrosCuadrados = round2(cantidadUnidades * getDimensionAreaM2(producto.dimension))
      return {
        cantidadUnidades,
        metrosCuadrados,
      }
    }

    return {
      cantidadUnidades: 0,
      metrosCuadrados: Math.max(0, detalle.metrosCuadrados || 0),
    }
  }

  const resolveProductoDetalle = (detalleFormulario: FormDetalleProducto): Producto | undefined => {
    const hasAnySelector = Boolean(
      detalleFormulario.tipo ||
      detalleFormulario.origenId ||
      detalleFormulario.dimension ||
      detalleFormulario.estado,
    )

    if (
      detalleFormulario.tipo &&
      detalleFormulario.origenId &&
      detalleFormulario.dimension &&
      detalleFormulario.estado
    ) {
      return productos.find(
        (item) =>
          item.tipo === detalleFormulario.tipo &&
          item.origenId === detalleFormulario.origenId &&
          item.dimension === detalleFormulario.dimension &&
          item.estado === detalleFormulario.estado,
      )
    }

    if (hasAnySelector) {
      return undefined
    }

    if (detalleFormulario.productoId) {
      return productos.find((item) => item.id === detalleFormulario.productoId)
    }

    return undefined
  }

  const buildDetalleVenta = (
    detalleFormulario: FormDetalleProducto,
  ): VentaDetalleProducto | null => {
    const producto = resolveProductoDetalle(detalleFormulario)
    if (!producto) return null

    const { cantidadUnidades, metrosCuadrados } = resolveDetalleCantidad(detalleFormulario, producto)
    if (metrosCuadrados <= 0) return null

    const precioM2 = getPrecioProducto(producto)
    const baseDetalle = {
      productoId: producto.id,
      productoNombre: producto.nombre,
      origenId: producto.origenId,
      origenNombre: producto.origenNombre,
      dimension: producto.dimension,
      estado: producto.estado,
      metrosCuadrados,
      precioM2,
      subtotal: metrosCuadrados * precioM2,
    }

    if (producto.tipo === 'Plancha') {
      return {
        ...baseDetalle,
        cantidadUnidades,
      }
    }

    return baseDetalle
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

  const ventasCompletadas = ventas.filter((venta) => venta.estado === 'completada')
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

  const detallesCalculados = formData.detallesProductos.flatMap((detalle) => {
    const parsedDetalle = buildDetalleVenta(detalle)
    return parsedDetalle ? [parsedDetalle] : []
  })

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
      detallesProductos: prev.detallesProductos.map((detalle) => {
        if (detalle.id !== detalleId) return detalle

        const nextDetalle: FormDetalleProducto = { ...detalle, ...patch }

        const tipoChanged = patch.tipo !== undefined && patch.tipo !== detalle.tipo
        const origenChanged = patch.origenId !== undefined && patch.origenId !== detalle.origenId
        const dimensionChanged =
          patch.dimension !== undefined && patch.dimension !== detalle.dimension
        const estadoChanged = patch.estado !== undefined && patch.estado !== detalle.estado
        const selectionChanged = tipoChanged || origenChanged || dimensionChanged || estadoChanged

        if (tipoChanged) {
          nextDetalle.origenId = ''
          nextDetalle.dimension = ''
          nextDetalle.estado = ''
        }

        if (origenChanged) {
          nextDetalle.dimension = ''
          nextDetalle.estado = ''
        }

        if (dimensionChanged) {
          nextDetalle.estado = ''
        }

        const producto = resolveProductoDetalle(nextDetalle)
        const resolvedProductoId = producto?.id ?? ''
        const productoChanged = resolvedProductoId !== detalle.productoId
        nextDetalle.productoId = resolvedProductoId

        if (selectionChanged || productoChanged) {
          nextDetalle.metrosCuadrados = 0
          nextDetalle.cantidadUnidades = 0
        }

        if (producto?.tipo === 'Plancha') {
          nextDetalle.metrosCuadrados = 0
        } else if (producto) {
          nextDetalle.cantidadUnidades = 0
        }

        return nextDetalle
      }),
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

  const handleDetalleUnidadesChange = (detalleId: string, rawValue: string) => {
    const parsedValue = rawValue === '' ? 0 : Number(rawValue)
    updateDetalleFormulario(detalleId, {
      cantidadUnidades: Number.isFinite(parsedValue) ? Math.max(0, Math.trunc(parsedValue)) : 0,
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

    const tieneProductoSinCantidad = formData.detallesProductos.some((detalle) => {
      if (!detalle.productoId) return false
      const producto = productos.find((item) => item.id === detalle.productoId)
      if (!producto) return false
      if (producto.tipo === 'Plancha') return Math.trunc(detalle.cantidadUnidades || 0) <= 0
      return detalle.metrosCuadrados <= 0
    })
    if (tieneProductoSinCantidad) {
      setFormError('Cada producto seleccionado debe tener cantidad valida.')
      return
    }

    const tieneCantidadSinProducto = formData.detallesProductos.some(
      (detalle) => !detalle.productoId && (detalle.metrosCuadrados > 0 || detalle.cantidadUnidades > 0),
    )
    if (tieneCantidadSinProducto) {
      setFormError('Selecciona el producto para cada fila con cantidad ingresada.')
      return
    }

    const detallesVenta = formData.detallesProductos
      .filter((detalle) => detalle.productoId)
      .flatMap((detalle) => {
        const parsedDetalle = buildDetalleVenta(detalle)
        return parsedDetalle ? [parsedDetalle] : []
      })

    if (detallesVenta.length === 0) {
      setFormError('Agrega al menos un producto para registrar la venta.')
      return
    }

    const cantidadM2 = detallesVenta.reduce((sum, detalle) => sum + detalle.metrosCuadrados, 0)
    const subtotal = detallesVenta.reduce((sum, detalle) => sum + detalle.subtotal, 0)
    if (cantidadM2 <= 0) {
      setFormError('La venta debe tener m² mayores a 0.')
      return
    }

    const metrosPorDimension = detallesVenta.reduce<Record<Dimension, number>>((acc, detalle) => {
      acc[detalle.dimension] += detalle.metrosCuadrados
      return acc
    }, createEmptyMetros())

    const motivoMovimientoAlmacen = formData.motivoMovimientoAlmacen.trim()
    if (motivoMovimientoAlmacen.length < 5) {
      setFormError('Debes indicar un motivo de salida de almacen (minimo 5 caracteres).')
      return
    }
    const primerDetalle = detallesVenta[0]
    if (!primerDetalle) {
      setFormError('Agrega al menos un producto para registrar la venta.')
      return
    }
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
      estado: 'pendiente_aprobacion_almacen',
      motivoMovimientoAlmacen,
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
      motivoMovimientoAlmacen: '',
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
    loadError,
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
    handleDetalleUnidadesChange,
    handleDescuentoChange,
    handleClienteFieldChange,
    handleSubmit,
    resetForm,
  }
}

