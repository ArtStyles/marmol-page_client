'use client'

import { useEffect, useMemo, useState } from 'react'
import { useInventarioStore } from '@/hooks/use-inventario'
import { ADMIN_STORAGE_KEY, type AdminUser } from '@/lib/admin-auth'
import { getBloqueCodigo } from '@/lib/bloque-codigo'
import { getBloques, createVenta, getVentas } from '@/lib/resources-api'
import { normalizeDimension, type BloqueOLote, type Producto, type Venta } from '@/lib/types'
import {
  createEmptyMetros,
  createInitialFloorRows,
  createSlabRow,
  floorDimensionOrder,
  formatMoney,
  getDimensionAreaM2,
  getVentaBloqueResumen,
  isProductoSellableForDocument,
  resolveInventoryStateFromDocument,
  resolveVentaSections,
  round2,
  slabStateOrder,
} from '../lib/ventas-helpers'
import type {
  FloorSaleFormRow,
  SlabDocumentState,
  SlabSaleFormRow,
  VentaFormState,
} from '../model/types'

const INTERNAL_SALE_CONTACT = {
  nombre: 'Registro interno por bloque',
  email: 'ventas@interno.local',
  telefono: 'N/A',
}

function buildInitialForm(today: string): VentaFormState {
  return {
    bloqueId: '',
    fecha: today,
    observaciones: '',
    fechaLiquidacion: '',
    floorRows: createInitialFloorRows(),
    slabRows: [createSlabRow(1)],
  }
}

function buildPlanchaDimensionsByState(productosBloque: Producto[]): Record<SlabDocumentState, string[]> {
  const map: Record<SlabDocumentState, string[]> = {
    Crudo: [],
    Pulido: [],
  }

  slabStateOrder.forEach((estado) => {
    const dimensions = Array.from(
      new Set(
        productosBloque
          .filter(
            (producto) =>
              producto.tipo === 'Plancha' &&
              producto.cantidadLosas > 0 &&
              producto.metrosCuadrados > 0 &&
              producto.estado === resolveInventoryStateFromDocument(estado),
          )
          .map((producto) => normalizeDimension(producto.dimension)),
      ),
    ).sort((left, right) => left.localeCompare(right))

    map[estado] = dimensions
  })

  return map
}

function getFirstPlanchaOption(
  dimensionsByState: Record<SlabDocumentState, string[]>,
): { estado: SlabDocumentState; dimension: string } | null {
  for (const estado of slabStateOrder) {
    const dimension = dimensionsByState[estado][0]
    if (dimension) {
      return { estado, dimension }
    }
  }

  return null
}

function buildInitialSlabRows(
  dimensionsByState: Record<SlabDocumentState, string[]>,
  seed = 1,
): SlabSaleFormRow[] {
  const firstOption = getFirstPlanchaOption(dimensionsByState)
  if (!firstOption) return []

  return [
    {
      ...createSlabRow(seed),
      estado: firstOption.estado,
      dimension: firstOption.dimension,
    },
  ]
}

function normalizeSlabRowWithStock(
  row: SlabSaleFormRow,
  dimensionsByState: Record<SlabDocumentState, string[]>,
): SlabSaleFormRow {
  const normalizedDimension = normalizeDimension(row.dimension)
  const currentStateOptions = dimensionsByState[row.estado]

  if (currentStateOptions.includes(normalizedDimension)) {
    return { ...row, dimension: normalizedDimension }
  }

  if (currentStateOptions[0]) {
    return { ...row, dimension: currentStateOptions[0] }
  }

  const firstOption = getFirstPlanchaOption(dimensionsByState)
  if (!firstOption) {
    return { ...row, dimension: normalizedDimension }
  }

  return {
    ...row,
    estado: firstOption.estado,
    dimension: firstOption.dimension,
  }
}

export const useVentasPageState = () => {
  const { productos: inventarioProductos } = useInventarioStore()
  const [ventas, setVentas] = useState<Venta[]>([])
  const [bloques, setBloques] = useState<BloqueOLote[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null)
  const [slabCounter, setSlabCounter] = useState(2)
  const today = new Date().toISOString().split('T')[0]
  const [formData, setFormData] = useState<VentaFormState>(() => buildInitialForm(today))

  const productos = useMemo(
    () => inventarioProductos.filter((producto) => isProductoSellableForDocument(producto)),
    [inventarioProductos],
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY)
    if (!raw) return
    try {
      setCurrentUser(JSON.parse(raw) as AdminUser)
    } catch {
      window.localStorage.removeItem(ADMIN_STORAGE_KEY)
    }
  }, [])

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        setLoading(true)
        setLoadError(null)
        const [ventasData, bloquesData] = await Promise.all([getVentas(), getBloques()])
        if (!active) return
        setVentas(ventasData)
        setBloques(bloquesData.filter((bloque) => bloque.tipo === 'Bloque'))
      } catch (error) {
        if (!active) return
        setVentas([])
        setBloques([])
        setLoadError(
          error instanceof Error
            ? error.message
            : 'No se pudieron cargar las ventas o bloques desde el backend.',
        )
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  const blocksById = useMemo(() => new Map(bloques.map((bloque) => [bloque.id, bloque])), [bloques])
  const selectedBlock = formData.bloqueId ? (blocksById.get(formData.bloqueId) ?? null) : null
  const selectedBlockCode = selectedBlock ? getBloqueCodigo(selectedBlock) : ''
  const responsableVentasNombre = currentUser?.name ?? 'Usuario autenticado'
  const responsableValidacionNombre =
    formData.fechaLiquidacion && currentUser?.name ? currentUser.name : undefined

  const productosBloque = useMemo(
    () => productos.filter((producto) => producto.origenId === formData.bloqueId),
    [formData.bloqueId, productos],
  )

  const getProductoPiso = (row: FloorSaleFormRow): Producto | undefined =>
    productosBloque.find(
      (producto) =>
        producto.tipo === 'Piso' &&
        normalizeDimension(producto.dimension) === row.dimension &&
        producto.estado === resolveInventoryStateFromDocument(row.estado),
    )

  const getProductoPlancha = (row: SlabSaleFormRow): Producto | undefined =>
    productosBloque.find(
      (producto) =>
        producto.tipo === 'Plancha' &&
        producto.cantidadLosas > 0 &&
        producto.metrosCuadrados > 0 &&
        normalizeDimension(producto.dimension) === normalizeDimension(row.dimension) &&
        producto.estado === resolveInventoryStateFromDocument(row.estado),
    )

  const planchaDimensionsByState = useMemo(() => {
    return buildPlanchaDimensionsByState(productosBloque)
  }, [productosBloque])

  const hasSlabStockAvailable = useMemo(
    () => slabStateOrder.some((estado) => planchaDimensionsByState[estado].length > 0),
    [planchaDimensionsByState],
  )

  const resolvedFloorRows = useMemo(
    () =>
      formData.floorRows.map((row) => {
        const producto = getProductoPiso(row)
        return {
          ...row,
          producto,
          disponibleM2: producto?.metrosCuadrados ?? 0,
          total: round2(row.cantidadM2 * row.precioM2),
        }
      }),
    [formData.floorRows, productosBloque],
  )

  const resolvedSlabRows = useMemo(
    () =>
      formData.slabRows.map((row) => {
        const producto = getProductoPlancha(row)
        const area = getDimensionAreaM2(row.dimension)
        return {
          ...row,
          producto,
          areaM2: area,
          equivalenteM2: round2(Math.max(0, row.cantidadUnidades) * area),
          disponibleUnidades: producto?.cantidadLosas ?? 0,
          total: round2(row.cantidadUnidades * row.precioUnitario),
          dimensionOptions: planchaDimensionsByState[row.estado],
        }
      }),
    [formData.slabRows, planchaDimensionsByState, productosBloque],
  )

  const subtotalForm = useMemo(
    () =>
      round2(
        resolvedFloorRows.reduce((sum, row) => sum + row.total, 0) +
          resolvedSlabRows.reduce((sum, row) => sum + row.total, 0),
      ),
    [resolvedFloorRows, resolvedSlabRows],
  )

  const ventasFiltradas = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return ventas

    return ventas.filter((venta) => {
      const bloque = getVentaBloqueResumen(venta, productos).toLowerCase()
      const responsable = (venta.creadoPorNombre ?? '').toLowerCase()
      const observaciones = (venta.observaciones ?? '').toLowerCase()
      return (
        venta.id.toLowerCase().includes(query) ||
        bloque.includes(query) ||
        responsable.includes(query) ||
        observaciones.includes(query) ||
        venta.fecha.toLowerCase().includes(query)
      )
    })
  }, [productos, searchTerm, ventas])

  const groupedByDate = useMemo(
    () =>
      ventasFiltradas.reduce<Record<string, Venta[]>>((acc, venta) => {
        if (!acc[venta.fecha]) acc[venta.fecha] = []
        acc[venta.fecha].push(venta)
        return acc
      }, {}),
    [ventasFiltradas],
  )

  const orderedDates = useMemo(
    () => Object.keys(groupedByDate).sort((left, right) => right.localeCompare(left)),
    [groupedByDate],
  )

  const totalIngresos = useMemo(
    () => round2(ventas.reduce((sum, venta) => sum + venta.total, 0)),
    [ventas],
  )
  const totalBloques = useMemo(
    () => new Set(ventas.map((venta) => getVentaBloqueResumen(venta, productos))).size,
    [productos, ventas],
  )
  const totalLiquidaciones = useMemo(
    () => ventas.filter((venta) => Boolean(venta.fechaLiquidacion)).length,
    [ventas],
  )
  const recentVentas = useMemo(
    () => [...ventas].sort((left, right) => right.fecha.localeCompare(left.fecha)).slice(0, 4),
    [ventas],
  )

  const resetForm = (closeDialog = true) => {
    setFormData(buildInitialForm(today))
    setSlabCounter(2)
    setFormError(null)
    if (closeDialog) {
      setIsDialogOpen(false)
    }
  }

  const openCreateDialog = () => {
    resetForm(false)
    setIsDialogOpen(true)
  }

  const handleBlockChange = (bloqueId: string) => {
    setFormError(null)
    const nextPlanchaDimensions = buildPlanchaDimensionsByState(
      productos.filter((producto) => producto.origenId === bloqueId),
    )
    setFormData((prev) => ({
      ...prev,
      bloqueId,
      floorRows: createInitialFloorRows(),
      slabRows: buildInitialSlabRows(nextPlanchaDimensions, 1),
    }))
    setSlabCounter(2)
  }

  const updateFloorRow = (rowId: string, patch: Partial<FloorSaleFormRow>) => {
    setFormError(null)
    setFormData((prev) => ({
      ...prev,
      floorRows: prev.floorRows.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
    }))
  }

  const addSlabRow = () => {
    setFormError(null)
    const firstOption = getFirstPlanchaOption(planchaDimensionsByState)
    if (!firstOption) return

    setFormData((prev) => ({
      ...prev,
      slabRows: [
        ...prev.slabRows,
        {
          ...createSlabRow(slabCounter),
          estado: firstOption.estado,
          dimension: firstOption.dimension,
        },
      ],
    }))
    setSlabCounter((prev) => prev + 1)
  }

  const removeSlabRow = (rowId: string) => {
    setFormError(null)
    setFormData((prev) => ({
      ...prev,
      slabRows: prev.slabRows.length === 1
        ? prev.slabRows
        : prev.slabRows.filter((row) => row.id !== rowId),
    }))
  }

  const updateSlabRow = (rowId: string, patch: Partial<SlabSaleFormRow>) => {
    setFormError(null)
    setFormData((prev) => ({
      ...prev,
      slabRows: prev.slabRows.map((row) => {
        if (row.id !== rowId) return row
        const next = {
          ...row,
          ...patch,
          dimension: patch.dimension ? normalizeDimension(patch.dimension) : row.dimension,
        }
        return normalizeSlabRowWithStock(next, planchaDimensionsByState)
      }),
    }))
  }

  const getVentaSections = (venta: Venta) => resolveVentaSections(venta, productos)

  const handleSubmit = async () => {
    setFormError(null)

    if (!formData.bloqueId || !selectedBlock) {
      setFormError('Selecciona un bloque valido para registrar la venta.')
      return
    }

    const detalles: Venta['detallesProductos'] = []

    for (const row of resolvedFloorRows) {
      const touched = row.cantidadM2 > 0 || row.precioM2 > 0
      if (!touched) continue

      if (!row.producto) {
        setFormError(`No existe stock vendible para ${row.dimension} ${row.estado} en este bloque.`)
        return
      }
      if (row.cantidadM2 <= 0) {
        setFormError(`La cantidad de ${row.dimension} ${row.estado} debe ser mayor a 0.`)
        return
      }
      if (row.precioM2 <= 0) {
        setFormError(`El precio por m2 de ${row.dimension} ${row.estado} debe ser mayor a 0.`)
        return
      }
      if (row.cantidadM2 > row.disponibleM2 + 0.001) {
        setFormError(`La venta de ${row.dimension} ${row.estado} excede el stock disponible.`)
        return
      }

      detalles.push({
        productoId: row.producto.id,
        productoNombre: row.producto.nombre,
        origenId: row.producto.origenId,
        origenNombre: row.producto.origenNombre,
        dimension: row.producto.dimension,
        estado: row.producto.estado,
        metrosCuadrados: round2(row.cantidadM2),
        precioM2: round2(row.precioM2),
        subtotal: round2(row.cantidadM2 * row.precioM2),
      })
    }

    for (const row of resolvedSlabRows) {
      const touched = row.cantidadUnidades > 0 || row.precioUnitario > 0
      if (!touched) continue

      if (!row.producto) {
        setFormError(`No existe plancha ${row.dimension} ${row.estado} disponible en este bloque.`)
        return
      }
      if (!Number.isInteger(row.cantidadUnidades) || row.cantidadUnidades <= 0) {
        setFormError(`La cantidad de planchas ${row.dimension} ${row.estado} debe ser entera y mayor a 0.`)
        return
      }
      if (row.precioUnitario <= 0) {
        setFormError(`El precio por unidad de la plancha ${row.dimension} ${row.estado} debe ser mayor a 0.`)
        return
      }
      if (row.cantidadUnidades > row.disponibleUnidades) {
        setFormError(`La venta de planchas ${row.dimension} ${row.estado} excede el stock disponible.`)
        return
      }
      if (row.areaM2 <= 0) {
        setFormError(`La dimension ${row.dimension} no tiene un area valida para calcular la venta.`)
        return
      }

      detalles.push({
        productoId: row.producto.id,
        productoNombre: row.producto.nombre,
        origenId: row.producto.origenId,
        origenNombre: row.producto.origenNombre,
        dimension: row.producto.dimension,
        estado: row.producto.estado,
        cantidadUnidades: row.cantidadUnidades,
        metrosCuadrados: row.equivalenteM2,
        precioM2: round2(row.precioUnitario / row.areaM2),
        subtotal: round2(row.cantidadUnidades * row.precioUnitario),
      })
    }

    if (detalles.length === 0) {
      setFormError('Registra al menos una fila de piso o plancha para guardar la venta.')
      return
    }

    const cantidadM2 = round2(detalles.reduce((sum, detalle) => sum + detalle.metrosCuadrados, 0))
    const subtotal = round2(detalles.reduce((sum, detalle) => sum + detalle.subtotal, 0))
    const metrosPorDimension = detalles.reduce<Record<string, number>>((acc, detalle) => {
      acc[detalle.dimension] = round2((acc[detalle.dimension] ?? 0) + detalle.metrosCuadrados)
      return acc
    }, createEmptyMetros([...floorDimensionOrder, ...detalles.map((detalle) => detalle.dimension)]))

    const payload: Omit<Venta, 'id'> = {
      bloqueId: selectedBlock.id,
      bloqueCodigo: selectedBlockCode,
      productoId: detalles[0].productoId,
      productoNombre: detalles[0].productoNombre,
      detallesProductos: detalles,
      cantidadM2,
      metrosPorDimension,
      precioM2: cantidadM2 > 0 ? round2(subtotal / cantidadM2) : 0,
      descuento: 0,
      fondoDesgasteEquipos: 0,
      fondoTrabajadores: 0,
      fondoOperativo: 0,
      subtotal,
      total: subtotal,
      clienteNombre: INTERNAL_SALE_CONTACT.nombre,
      clienteEmail: INTERNAL_SALE_CONTACT.email,
      clienteTelefono: INTERNAL_SALE_CONTACT.telefono,
      observaciones: formData.observaciones.trim() || undefined,
      responsableValidacionId: formData.fechaLiquidacion ? currentUser?.id : undefined,
      responsableValidacionNombre,
      fechaLiquidacion: formData.fechaLiquidacion || undefined,
      fecha: formData.fecha,
      estado: 'pendiente_aprobacion_almacen',
      motivoMovimientoAlmacen: `Salida por venta del bloque ${selectedBlockCode || selectedBlock.nombre}`,
      creadoPorId: currentUser?.id,
      creadoPorNombre: responsableVentasNombre,
      movimientoInventarioId: undefined,
    }

    try {
      const created = await createVenta(payload)
      setVentas((prev) => [created, ...prev])
      resetForm()
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'No se pudo registrar la venta en el backend.',
      )
    }
  }

  return {
    bloques,
    currentUser,
    formData,
    formError,
    getVentaBloqueResumen,
    getVentaSections,
    groupedByDate,
    handleBlockChange,
    handleSubmit,
    isDialogOpen,
    loadError,
    loading,
    openCreateDialog,
    orderedDates,
    recentVentas,
    resetForm,
    resolvedFloorRows,
    resolvedSlabRows,
    hasSlabStockAvailable,
    responsableValidacionNombre,
    responsableVentasNombre,
    searchTerm,
    selectedBlock,
    selectedBlockCode,
    selectedVenta,
    setFormData,
    setIsDialogOpen,
    setSearchTerm,
    setSelectedVenta,
    subtotalForm,
    totalBloques,
    totalIngresos,
    totalLiquidaciones,
    updateFloorRow,
    updateSlabRow,
    addSlabRow,
    removeSlabRow,
    ventas: ventasFiltradas,
    rawVentas: ventas,
    formatMoney,
  }
}
