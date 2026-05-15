'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/admin/admin-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { AdminShell, AdminPanelCard } from '@/components/admin/admin-shell'
import { Card, CardContent } from '@/components/ui/card'
import {
  DIMENSIONES_PISO,
  losasAMetros,
  normalizeDimension,
  parseDimension,
  type BloqueOLote,
  type Dimension,
} from '@/lib/types'
import {
  createBloque,
  deleteBloque,
  getBloques,
  updateBloque,
} from '@/lib/resources-api'
import { ADMIN_STORAGE_KEY, hasPermission, type AdminUser } from '@/lib/admin-auth'
import { getBloqueCodigo } from '@/lib/bloque-codigo'
import { cn } from '@/lib/utils'
import { Plus, Search, Eye, Edit, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { BloquesTrazabilidadSection } from './feature/components/bloques-trazabilidad-section'

const LOTE_SELECCION_PLANCHA_KEY = 'plancha' as const

type LoteSeleccionPisoKey = (typeof DIMENSIONES_PISO)[number]
type LoteSeleccionKey = LoteSeleccionPisoKey | typeof LOTE_SELECCION_PLANCHA_KEY

type LoteSeleccionValores = {
  metrosComprados: number
  costo: number
}

type LoteSeleccionTouched = {
  metrosComprados: boolean
  costo: boolean
}

type LotePlanchaDraft = {
  largo: string
  ancho: string
}

const LOTE_SELECCION_OPCIONES: LoteSeleccionKey[] = [...DIMENSIONES_PISO, LOTE_SELECCION_PLANCHA_KEY]

const LOTE_SELECCION_CONFIG: Record<
  LoteSeleccionKey,
  {
    label: string
  }
> = {
  '40x40': {
    label: '40x40',
  },
  '60x40': {
    label: '60x40',
  },
  '80x40': {
    label: '80x40',
  },
  plancha: {
    label: 'Plancha',
  },
}

const createLoteValoresIniciales = (): Record<LoteSeleccionKey, LoteSeleccionValores> => ({
  '40x40': { metrosComprados: 0, costo: 0 },
  '60x40': { metrosComprados: 0, costo: 0 },
  '80x40': { metrosComprados: 0, costo: 0 },
  plancha: { metrosComprados: 0, costo: 0 },
})

const createLoteTouchedInicial = (): Record<LoteSeleccionKey, LoteSeleccionTouched> => ({
  '40x40': { metrosComprados: false, costo: false },
  '60x40': { metrosComprados: false, costo: false },
  '80x40': { metrosComprados: false, costo: false },
  plancha: { metrosComprados: false, costo: false },
})

const createPlanchaDraftInicial = (): LotePlanchaDraft => ({
  largo: '',
  ancho: '',
})

const splitPlanchaDimension = (dimension: string): LotePlanchaDraft => {
  const normalized = dimension.trim().toLowerCase().replace(/\s+/g, '')
  const separatorIndex = normalized.indexOf('x')

  if (separatorIndex < 0) {
    return { largo: normalized, ancho: '' }
  }

  return {
    largo: normalized.slice(0, separatorIndex),
    ancho: normalized.slice(separatorIndex + 1),
  }
}

const buildPlanchaDimension = (largoRaw: string, anchoRaw: string): Dimension => {
  const largo = largoRaw.trim().replace(',', '.')
  const ancho = anchoRaw.trim().replace(',', '.')

  if (!largo && !ancho) return ''
  if (!largo) return `x${ancho}`
  if (!ancho) return `${largo}x`

  return normalizeDimension(`${largo}x${ancho}`)
}

const isLoteSeleccionPisoKey = (
  dimension: Dimension | null | undefined,
): dimension is LoteSeleccionPisoKey => {
  if (!dimension) return false
  return DIMENSIONES_PISO.includes(normalizeDimension(dimension) as LoteSeleccionPisoKey)
}

const resolveLoteDimensionBase = (
  option: LoteSeleccionKey,
  planchaDimension: Dimension,
): Dimension => (option === LOTE_SELECCION_PLANCHA_KEY ? planchaDimension : option)

const resolveLoteSeleccionKey = (dimension: Dimension | null | undefined): LoteSeleccionKey => {
  if (!dimension) return '60x40'
  return isLoteSeleccionPisoKey(dimension)
    ? (normalizeDimension(dimension) as LoteSeleccionPisoKey)
    : LOTE_SELECCION_PLANCHA_KEY
}

const resolveLoteOptionLabel = (option: LoteSeleccionKey, planchaDimension: Dimension): string => {
  if (option !== LOTE_SELECCION_PLANCHA_KEY) {
    return LOTE_SELECCION_CONFIG[option].label
  }

  return parseDimension(planchaDimension) ? `Plancha (${planchaDimension})` : 'Plancha'
}

const roundCurrency = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100

const distribuirTransporteLote = (
  opciones: LoteSeleccionKey[],
  valores: Record<LoteSeleccionKey, LoteSeleccionValores>,
  transporteTotal: number,
  planchaDimension: Dimension,
): Record<LoteSeleccionKey, number> => {
  const cantidades = opciones.map((option) => {
    const cantidadLosas = Math.max(0, Math.trunc(valores[option].metrosComprados))
    const dimensionBase = resolveLoteDimensionBase(option, planchaDimension)
    return {
      option,
      cantidadLosas,
      metrosCuadrados: losasAMetros(cantidadLosas, dimensionBase),
    }
  })

  const totalMetrosCuadrados = cantidades.reduce((sum, item) => sum + item.metrosCuadrados, 0)
  const totalLosas = cantidades.reduce((sum, item) => sum + item.cantidadLosas, 0)
  const usarMetrosCuadrados = totalMetrosCuadrados > 0
  const totalPeso = usarMetrosCuadrados ? totalMetrosCuadrados : totalLosas
  const distribucion = {} as Record<LoteSeleccionKey, number>
  let acumulado = 0

  cantidades.forEach((item, index) => {
    const esUltimo = index === cantidades.length - 1
    if (esUltimo) {
      distribucion[item.option] = roundCurrency(Math.max(0, transporteTotal - acumulado))
      return
    }

    const peso = usarMetrosCuadrados ? item.metrosCuadrados : item.cantidadLosas
    const monto = totalPeso > 0 ? roundCurrency((transporteTotal * peso) / totalPeso) : 0
    distribucion[item.option] = monto
    acumulado += monto
  })

  return distribucion
}
const bloqueEstadoLabel: Record<BloqueOLote['estado'], string> = {
  activo: 'Activo',
  agotado: 'Agotado',
  vendido: 'Vendido',
}

const bloqueEstadoBadgeClass: Record<BloqueOLote['estado'], string> = {
  activo: '',
  agotado: 'border-amber-200 bg-amber-50 text-amber-700',
  vendido: 'border-emerald-300 bg-emerald-50 text-emerald-800',
}

const isBloqueVendido = (bloque: BloqueOLote): boolean => bloque.estado === 'vendido'
export default function BloquesPage() {
  const [bloques, setBloques] = useState<BloqueOLote[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedBloque, setSelectedBloque] = useState<BloqueOLote | null>(null)
  const [editingBloque, setEditingBloque] = useState<BloqueOLote | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<BloqueOLote | null>(null)
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [numericTouched, setNumericTouched] = useState({
    metrosComprados: false,
    costo: false,
    costoTransporte: false,
  })
  const [formData, setFormData] = useState({
    tipo: 'Bloque' as 'Bloque' | 'Lote',
    dimensionBase: '60x40' as Dimension,
    metrosComprados: 0,
    costo: 0,
    costoTransporte: 0,
    proveedor: '',
    canteraOrigen: '',
  })
  const [loteSeleccionado, setLoteSeleccionado] = useState<LoteSeleccionKey[]>(['60x40'])
  const [loteValores, setLoteValores] = useState<Record<LoteSeleccionKey, LoteSeleccionValores>>(
    createLoteValoresIniciales,
  )
  const [loteTouched, setLoteTouched] = useState<Record<LoteSeleccionKey, LoteSeleccionTouched>>(
    createLoteTouchedInicial,
  )
  const [lotePlanchaDraft, setLotePlanchaDraft] = useState<LotePlanchaDraft>(
    createPlanchaDraftInicial,
  )

  const isCreatingLoteMulti = formData.tipo === 'Lote' && !editingBloque
  const lotePlanchaDimension = buildPlanchaDimension(lotePlanchaDraft.largo, lotePlanchaDraft.ancho)
  const loteDimensionKind = isLoteSeleccionPisoKey(formData.dimensionBase) ? 'Piso' : 'Plancha'

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
    let alive = true

    const load = async () => {
      setLoading(true)
      setActionError(null)
      try {
        const data = await getBloques()
        if (!alive) return
        setBloques(data)
      } catch (error) {
        if (!alive) return
        setActionError(error instanceof Error ? error.message : 'No se pudo cargar bloques/lotes.')
      } finally {
        if (alive) setLoading(false)
      }
    }

    void load()

    return () => {
      alive = false
    }
  }, [])

  const canWriteBloques = currentUser ? hasPermission(currentUser, 'bloques:write') : false
  const canReadVentas = currentUser ? hasPermission(currentUser, 'ventas:read') : false
  const today = new Date().toISOString().split('T')[0]

  const filteredBloques = useMemo(
    () =>
      bloques.filter(
        (bloque) =>
          getBloqueCodigo(bloque).toLowerCase().includes(searchTerm.toLowerCase()) ||
          bloque.proveedor.toLowerCase().includes(searchTerm.toLowerCase()) ||
          bloque.canteraOrigen.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [bloques, searchTerm],
  )

  const bloquesActivos = useMemo(
    () => bloques.filter((bloque) => bloque.estado === 'activo'),
    [bloques],
  )
  const totalCostoMaterial = useMemo(
    () => bloques.reduce((sum, bloque) => sum + bloque.costo, 0),
    [bloques],
  )
  const totalCostoTransporte = useMemo(
    () => bloques.reduce((sum, bloque) => sum + bloque.costoTransporte, 0),
    [bloques],
  )
  const totalInversion = totalCostoMaterial + totalCostoTransporte
  const proveedores = useMemo(() => new Set(bloques.map((bloque) => bloque.proveedor)).size, [bloques])

  const totalMetrosComprados = useMemo(
    () =>
      bloques
        .filter((bloque) => bloque.tipo === 'Bloque')
        .reduce((sum, bloque) => sum + bloque.metrosComprados, 0),
    [bloques],
  )

  const totalLosasLotes = useMemo(
    () =>
      bloques
        .filter((bloque) => bloque.tipo === 'Lote')
        .reduce((sum, bloque) => sum + bloque.metrosComprados, 0),
    [bloques],
  )

  const canModify = (_fechaIngreso: string) => canWriteBloques

  const recentBloques = [...bloques]
    .sort((a, b) => b.fechaIngreso.localeCompare(a.fechaIngreso))
    .slice(0, 3)

  const rightPanel = (
    <div className="space-y-4">
      <AdminPanelCard title="Resumen bloques y lotes" meta={`${bloques.length} registros`}>
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>Activos</span>
            <span className="font-semibold">{bloquesActivos.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Costo material</span>
            <span className="font-semibold">${totalCostoMaterial.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Costo transporte</span>
            <span className="font-semibold">${totalCostoTransporte.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Inversion total</span>
            <span className="font-semibold">${totalInversion.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Proveedores</span>
            <span className="font-semibold">{proveedores}</span>
          </div>
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Volumen comprado" meta="bloques y lotes">
        <div className="space-y-2 text-sm text-slate-700">
          <div className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2">
            <span>Total bloques (m3)</span>
            <span className="font-semibold">{totalMetrosComprados.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2">
            <span>Total lotes (losas)</span>
            <span className="font-semibold">{Math.trunc(totalLosasLotes).toLocaleString()}</span>
          </div>
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Entradas recientes" meta="Ultimos registros">
        <div className="space-y-2 text-sm text-slate-700">
          {recentBloques.length === 0 ? (
            <p className="text-xs text-slate-500">Sin registros recientes.</p>
          ) : (
            recentBloques.map((bloque) => (
              <div key={bloque.id} className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2">
                <div>
                  <p className="text-xs font-semibold text-slate-900">{getBloqueCodigo(bloque)}</p>
                  <p className="text-[11px] text-slate-500">{bloque.fechaIngreso}</p>
                </div>
                <Badge variant="outline" className="text-[11px]">
                  {bloque.tipo === 'Lote'
                    ? `${Math.trunc(bloque.metrosComprados).toLocaleString()} losas`
                    : `${bloque.metrosComprados.toLocaleString()} m3`}
                </Badge>
              </div>
            ))
          )}
        </div>
      </AdminPanelCard>
    </div>
  )

  const toggleLoteSeleccion = (option: LoteSeleccionKey, checked: boolean) => {
    setLoteSeleccionado((prev) => {
      if (checked) {
        return prev.includes(option) ? prev : [...prev, option]
      }
      return prev.filter((item) => item !== option)
    })
  }

  const updateLoteValor = (
    option: LoteSeleccionKey,
    field: keyof LoteSeleccionValores,
    rawValue: string,
  ) => {
    const value = rawValue === '' ? 0 : Number(rawValue)
    setLoteTouched((prev) => ({
      ...prev,
      [option]: {
        ...prev[option],
        [field]: rawValue !== '',
      },
    }))
    setLoteValores((prev) => ({
      ...prev,
      [option]: {
        ...prev[option],
        [field]: value,
      },
    }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setActionError(null)
    setIsSaving(true)

    if (formData.tipo === 'Lote' && parseDimension(formData.dimensionBase) === null) {
      setActionError('Debes indicar una medida valida para el lote.')
      setIsSaving(false)
      return
    }

    if (editingBloque) {
      if (!canModify(editingBloque.fechaIngreso)) {
        setIsSaving(false)
        return
      }
      try {
        const updated = await updateBloque(editingBloque.id, {
          dimensionBase: formData.dimensionBase,
          metrosComprados: formData.metrosComprados,
          costo: formData.costo,
          costoTransporte: formData.costoTransporte,
          proveedor: formData.proveedor,
          canteraOrigen: formData.canteraOrigen,
        })
        setBloques((prev) => prev.map((bloque) => (bloque.id === updated.id ? updated : bloque)))
        resetForm()
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'No se pudo actualizar el bloque/lote.')
      } finally {
        setIsSaving(false)
      }
      return
    }

    if (!canWriteBloques) {
      setActionError('No tienes permiso para registrar bloques o lotes.')
      setIsSaving(false)
      return
    }

    try {
      if (isCreatingLoteMulti) {
        if (loteSeleccionado.length === 0) {
          setActionError('Selecciona al menos una medida o plancha para registrar el lote.')
          return
        }

        const opcionesSinCantidad = loteSeleccionado.filter(
          (option) => Math.trunc(loteValores[option].metrosComprados) <= 0,
        )

        if (opcionesSinCantidad.length > 0) {
          const etiquetas = opcionesSinCantidad
            .map((option) => resolveLoteOptionLabel(option, lotePlanchaDimension))
            .join(', ')
          setActionError(`Completa la cantidad de losas para: ${etiquetas}.`)
          return
        }

        if (
          loteSeleccionado.includes(LOTE_SELECCION_PLANCHA_KEY) &&
          parseDimension(lotePlanchaDimension) === null
        ) {
          setActionError('Completa largo y ancho validos para la plancha.')
          return
        }

        const transporteDistribuido = distribuirTransporteLote(
          loteSeleccionado,
          loteValores,
          formData.costoTransporte,
          lotePlanchaDimension,
        )
        const nuevosLotes: BloqueOLote[] = []

        for (const option of loteSeleccionado) {
          const optionValores = loteValores[option]
          const cantidadLosas = Math.max(0, Math.trunc(optionValores.metrosComprados))
          const dimensionBase = resolveLoteDimensionBase(option, lotePlanchaDimension)

          const newBloque = await createBloque({
            tipo: 'Lote',
            dimensionBase,
            costo: optionValores.costo,
            costoTransporte: transporteDistribuido[option] ?? 0,
            metrosComprados: cantidadLosas,
            fechaIngreso: today,
            proveedor: formData.proveedor,
            canteraOrigen: formData.canteraOrigen,
          })

          nuevosLotes.push(newBloque)
        }

        setBloques((prev) => [...nuevosLotes, ...prev])
        resetForm()
        return
      }

      const newBloque = await createBloque({
        tipo: formData.tipo,
        dimensionBase: formData.dimensionBase,
        costo: formData.costo,
        costoTransporte: formData.costoTransporte,
        metrosComprados: formData.metrosComprados,
        fechaIngreso: today,
        proveedor: formData.proveedor,
        canteraOrigen: formData.canteraOrigen,
      })

      setBloques((prev) => [newBloque, ...prev])
      resetForm()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'No se pudo crear el bloque/lote.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = (bloque: BloqueOLote) => {
    if (!canModify(bloque.fechaIngreso) || bloque.canEdit === false || isBloqueVendido(bloque)) return
    setEditingBloque(bloque)
    const dimensionEditable = resolveLoteSeleccionKey(bloque.dimensionBase)
    const planchaDraftInicial =
      bloque.tipo === 'Lote' && bloque.dimensionBase && !isLoteSeleccionPisoKey(bloque.dimensionBase)
        ? splitPlanchaDimension(bloque.dimensionBase)
        : createPlanchaDraftInicial()
    setFormData({
      tipo: bloque.tipo,
      dimensionBase: bloque.dimensionBase ?? '60x40',
      metrosComprados: bloque.metrosComprados,
      costo: bloque.costo,
      costoTransporte: bloque.costoTransporte,
      proveedor: bloque.proveedor,
      canteraOrigen: bloque.canteraOrigen,
    })
    setNumericTouched({
      metrosComprados: true,
      costo: true,
      costoTransporte: true,
    })

    const loteValoresIniciales = createLoteValoresIniciales()
    const loteTouchedInicial = createLoteTouchedInicial()

    if (bloque.tipo === 'Lote') {
      const key = dimensionEditable
      loteValoresIniciales[key] = {
        metrosComprados: bloque.metrosComprados,
        costo: bloque.costo,
      }
      loteTouchedInicial[key] = {
        metrosComprados: true,
        costo: true,
      }
      setLoteSeleccionado([key])
    } else {
      setLoteSeleccionado(['60x40'])
    }

    setLoteValores(loteValoresIniciales)
    setLoteTouched(loteTouchedInicial)
    setLotePlanchaDraft(planchaDraftInicial)
    setIsDialogOpen(true)
  }

  const openDeleteConfirm = (bloque: BloqueOLote) => {
    if (!canModify(bloque.fechaIngreso) || bloque.canDelete === false || isBloqueVendido(bloque)) return
    setDeleteTarget(bloque)
  }

  const confirmDelete = async (bloque: BloqueOLote) => {
    setIsDeleting(true)
    setActionError(null)
    try {
      await deleteBloque(bloque.id)
      setBloques((prev) => prev.filter((item) => item.id !== bloque.id))
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'No se pudo eliminar el bloque/lote.')
    } finally {
      setIsDeleting(false)
      setDeleteTarget(null)
    }
  }

  const resetForm = () => {
    setEditingBloque(null)
    setFormData({
      tipo: 'Bloque',
      dimensionBase: '60x40',
      metrosComprados: 0,
      costo: 0,
      costoTransporte: 0,
      proveedor: '',
      canteraOrigen: '',
    })
    setNumericTouched({
      metrosComprados: false,
      costo: false,
      costoTransporte: false,
    })
    setLoteSeleccionado(['60x40'])
    setLoteValores(createLoteValoresIniciales())
    setLoteTouched(createLoteTouchedInicial())
    setLotePlanchaDraft(createPlanchaDraftInicial())
    setIsDialogOpen(false)
  }

  const renderEstado = (bloque: BloqueOLote) => (
    <Badge
      variant={bloque.estado === 'activo' ? 'default' : 'outline'}
      className={cn(bloqueEstadoBadgeClass[bloque.estado])}
    >
      {bloqueEstadoLabel[bloque.estado]}
    </Badge>
  )

  const renderAcciones = (bloque: BloqueOLote) => {
    const bloqueVendido = isBloqueVendido(bloque)
    const canEditItem = canModify(bloque.fechaIngreso) && !bloqueVendido && bloque.canEdit !== false
    const canDeleteItem = canModify(bloque.fechaIngreso) && !bloqueVendido && bloque.canDelete !== false
    const blockedTitle = bloqueVendido
      ? 'Bloque vendido: acciones bloqueadas'
      : bloque.lockReason || 'Registro bloqueado por historial operativo'

    return (
      <div className="flex w-fit items-center gap-1 justify-self-start lg:justify-self-end">
        <Button size="icon" variant="ghost" onClick={() => setSelectedBloque(bloque)} title="Ver detalle">
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => handleEdit(bloque)}
          disabled={!canEditItem}
          title={canEditItem ? 'Editar' : blockedTitle}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => openDeleteConfirm(bloque)}
          disabled={!canDeleteItem}
          title={canDeleteItem ? 'Eliminar' : blockedTitle}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    )
  }

  return (
    <AdminShell rightPanel={rightPanel}>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground font-sans">Bloques y lotes</h1>
            <p className="mt-1 text-sm text-slate-500">
              Entrada de bloques/lotes y trazabilidad del flujo de mono hilo desde cada origen.
            </p>
            {actionError ? <p className="mt-2 text-sm text-destructive">{actionError}</p> : null}
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => resetForm()}
                disabled={!canWriteBloques}
                title={canWriteBloques ? 'Nuevo Bloque/Lote' : 'Sin permiso de edicion'}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Bloque/Lote
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingBloque ? 'Editar Bloque/Lote' : 'Registrar Nuevo Bloque/Lote'}</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
	                  <Select
	                    value={formData.tipo}
	                    disabled={Boolean(editingBloque)}
	                    onValueChange={(value: 'Bloque' | 'Lote') =>
	                      setFormData((prev) => ({
	                        ...prev,
                        tipo: value,
                        dimensionBase: value === 'Lote' ? prev.dimensionBase : '60x40',
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bloque">Bloque</SelectItem>
                      <SelectItem value="Lote">Lote</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isCreatingLoteMulti ? (
                  <div className="space-y-3">
                    <Label>Medidas / tipo de lote</Label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {LOTE_SELECCION_OPCIONES.map((option) => {
                        const checked = loteSeleccionado.includes(option)
                        return (
                          <label
                            key={option}
                            className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(state) => toggleLoteSeleccion(option, state === true)}
                            />
                            <span className="text-sm text-slate-700">
                              {resolveLoteOptionLabel(option, lotePlanchaDimension)}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ) : formData.tipo === 'Lote' ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Tipo de medida</Label>
                      <Select
                        value={loteDimensionKind}
                        onValueChange={(value: 'Piso' | 'Plancha') => {
                          if (value === 'Piso') {
                            setFormData((prev) => ({
                              ...prev,
                              dimensionBase: isLoteSeleccionPisoKey(prev.dimensionBase)
                                ? normalizeDimension(prev.dimensionBase)
                                : DIMENSIONES_PISO[0],
                            }))
                            return
                          }

                          setFormData((prev) => ({
                            ...prev,
                            dimensionBase: buildPlanchaDimension(
                              lotePlanchaDraft.largo,
                              lotePlanchaDraft.ancho,
                            ),
                          }))
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Piso">Piso</SelectItem>
                          <SelectItem value="Plancha">Plancha</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {loteDimensionKind === 'Plancha' ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Largo (cm)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="160"
                            value={lotePlanchaDraft.largo}
                            onChange={(event) => {
                              const nextDraft = {
                                ...lotePlanchaDraft,
                                largo: event.target.value,
                              }
                              setLotePlanchaDraft(nextDraft)
                              setFormData((prev) => ({
                                ...prev,
                                dimensionBase: buildPlanchaDimension(nextDraft.largo, nextDraft.ancho),
                              }))
                            }}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Ancho (cm)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="60"
                            value={lotePlanchaDraft.ancho}
                            onChange={(event) => {
                              const nextDraft = {
                                ...lotePlanchaDraft,
                                ancho: event.target.value,
                              }
                              setLotePlanchaDraft(nextDraft)
                              setFormData((prev) => ({
                                ...prev,
                                dimensionBase: buildPlanchaDimension(nextDraft.largo, nextDraft.ancho),
                              }))
                            }}
                            required
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Medida base</Label>
                        <Select
                          value={isLoteSeleccionPisoKey(formData.dimensionBase) ? formData.dimensionBase : '60x40'}
                          onValueChange={(value: Dimension) =>
                            setFormData({ ...formData, dimensionBase: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DIMENSIONES_PISO.map((dimensionValue) => (
                              <SelectItem key={dimensionValue} value={dimensionValue}>
                                {dimensionValue}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                ) : null}

                {isCreatingLoteMulti ? (
                  <>
                    <div className="space-y-2">
                      <Label>Proveedor</Label>
                      <Input
                        value={formData.proveedor}
                        onChange={(event) => setFormData({ ...formData, proveedor: event.target.value })}
                        placeholder="Nombre del proveedor"
                        required
	                      />
	                    </div>

	                    <div className="space-y-2">
	                      <Label>Cantera / origen</Label>
	                      <Input
	                        value={formData.canteraOrigen}
	                        onChange={(event) =>
	                          setFormData({ ...formData, canteraOrigen: event.target.value })
	                        }
	                        placeholder="Cantera, mina u origen del material"
	                      />
	                    </div>

	                    <div className="space-y-2">
	                      <Label>Costo transporte total del lote ($)</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={
                          numericTouched.costoTransporte || formData.costoTransporte > 0
                            ? formData.costoTransporte
                            : ''
                        }
                        onChange={(event) => {
                          const value = event.target.value
                          setNumericTouched((prev) => ({ ...prev, costoTransporte: value !== '' }))
                          setFormData({ ...formData, costoTransporte: value === '' ? 0 : Number(value) })
                        }}
                        required
                      />
                      <p className="text-xs text-slate-500">
                        Se registra una sola vez y se reparte entre las medidas seleccionadas.
                      </p>
                    </div>

                    {loteSeleccionado.length === 0 ? (
                      <p className="text-xs text-amber-700">Selecciona al menos una medida o plancha.</p>
                    ) : (
                      <div className="space-y-3">
                        {loteSeleccionado.map((option) => {
                          const optionValues = loteValores[option]
                          const optionTouched = loteTouched[option]

                          return (
                            <div key={option} className="space-y-3 rounded-xl border border-slate-200 p-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                {resolveLoteOptionLabel(option, lotePlanchaDimension)}
                              </p>
                              <div className="grid gap-3 sm:grid-cols-2">
                                {option === LOTE_SELECCION_PLANCHA_KEY ? (
                                  <>
                                    <div className="space-y-2">
                                      <Label>Largo (cm)</Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="160"
                                        value={lotePlanchaDraft.largo}
                                        onChange={(event) =>
                                          setLotePlanchaDraft((prev) => ({
                                            ...prev,
                                            largo: event.target.value,
                                          }))
                                        }
                                        required
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Ancho (cm)</Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="60"
                                        value={lotePlanchaDraft.ancho}
                                        onChange={(event) =>
                                          setLotePlanchaDraft((prev) => ({
                                            ...prev,
                                            ancho: event.target.value,
                                          }))
                                        }
                                        required
                                      />
                                    </div>
                                  </>
                                ) : null}
                                <div className="space-y-2">
                                  <Label>Cantidad losas</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="1"
                                    placeholder="0"
                                    value={
                                      optionTouched.metrosComprados || optionValues.metrosComprados > 0
                                        ? optionValues.metrosComprados
                                        : ''
                                    }
                                    onChange={(event) =>
                                      updateLoteValor(option, 'metrosComprados', event.target.value)
                                    }
                                    required
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Costo material ($)</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    value={optionTouched.costo || optionValues.costo > 0 ? optionValues.costo : ''}
                                    onChange={(event) => updateLoteValor(option, 'costo', event.target.value)}
                                    required
                                  />
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <>
	                    <div className="grid gap-4 sm:grid-cols-2">
	                      <div className="space-y-2">
	                        <Label>{formData.tipo === 'Lote' ? 'Cantidad losas' : 'Dimension (m3)'}</Label>
                        <Input
                          type="number"
                          min="0"
                          step={formData.tipo === 'Lote' ? '1' : '0.01'}
                          placeholder="0"
                          value={
                            editingBloque || numericTouched.metrosComprados || formData.metrosComprados > 0
                              ? formData.metrosComprados
                              : ''
                          }
                          onChange={(event) => {
                            const value = event.target.value
                            setNumericTouched((prev) => ({ ...prev, metrosComprados: value !== '' }))
                            setFormData({ ...formData, metrosComprados: value === '' ? 0 : Number(value) })
                          }}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Proveedor</Label>
	                        <Input
	                          value={formData.proveedor}
	                          onChange={(event) => setFormData({ ...formData, proveedor: event.target.value })}
	                          placeholder="Nombre del proveedor"
	                          required
	                        />
	                      </div>
	                    </div>

	                    <div className="space-y-2">
	                      <Label>Cantera / origen</Label>
	                      <Input
	                        value={formData.canteraOrigen}
	                        onChange={(event) =>
	                          setFormData({ ...formData, canteraOrigen: event.target.value })
	                        }
	                        placeholder="Cantera, mina u origen del material"
	                      />
	                    </div>

	                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Costo material ($)</Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={editingBloque || numericTouched.costo || formData.costo > 0 ? formData.costo : ''}
                          onChange={(event) => {
                            const value = event.target.value
                            setNumericTouched((prev) => ({ ...prev, costo: value !== '' }))
                            setFormData({ ...formData, costo: value === '' ? 0 : Number(value) })
                          }}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Costo transporte ($)</Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={
                            editingBloque || numericTouched.costoTransporte || formData.costoTransporte > 0
                              ? formData.costoTransporte
                              : ''
                          }
                          onChange={(event) => {
                            const value = event.target.value
                            setNumericTouched((prev) => ({ ...prev, costoTransporte: value !== '' }))
                            setFormData({ ...formData, costoTransporte: value === '' ? 0 : Number(value) })
                          }}
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm} className="flex-1 bg-transparent">
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isSaving}>
                    {isSaving ? 'Guardando...' : editingBloque ? 'Guardar' : 'Registrar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-[var(--agent-radius-panel)] border border-white/60 bg-white/70 p-4 shadow-[var(--dash-shadow)] backdrop-blur-xl">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Buscar</p>
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por codigo, proveedor u origen..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <Card className="bg-transparent border-none outline-none shadow-none p-0">
          <CardContent className="p-0">
            {loading ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                Cargando bloques/lotes...
              </div>
            ) : filteredBloques.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                No hay bloques o lotes registrados
              </div>
            ) : (
              <div className="space-y-3">
                <div className="overflow-x-auto">
                  <div className="space-y-3 lg:min-w-[940px]">
                    <div className="hidden rounded-[var(--agent-radius-control)] border border-slate-200/70 bg-slate-50/70 px-4 py-2 lg:grid lg:grid-cols-[220px_100px_140px_120px_110px_140px] lg:gap-x-3">
                      <span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Codigo</span>
                      <span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Cantidad</span>
                      <span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Costo bloque/lote</span>
                      <span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Transporte</span>
                      <span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Estado</span>
                      <span className="text-[10px] uppercase tracking-[0.28em] text-right text-slate-500">Acciones</span>
                    </div>

                    <div className="divide-y divide-slate-200/60 overflow-hidden rounded-[var(--agent-radius-panel-tight)] border border-slate-200/70 bg-white/80 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.3)] backdrop-blur-xl">
                      {filteredBloques.map((bloque) => (
                        <div key={bloque.id} className="px-4 py-3">
                          <div className="grid gap-2 lg:grid-cols-[220px_100px_140px_120px_110px_140px] lg:items-center lg:gap-x-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{getBloqueCodigo(bloque)}</p>
                              <p className="text-[11px] text-slate-500">Ingreso {bloque.fechaIngreso}</p>
                            </div>

                            <div className="text-sm font-semibold text-slate-800">
                              {bloque.tipo === 'Lote'
                                ? `${Math.trunc(bloque.metrosComprados).toLocaleString()} losas`
                                : `${bloque.metrosComprados.toLocaleString()} m3`}
                            </div>

                            <div className="flex items-center justify-between text-sm lg:block">
                              <span className="text-[10px] uppercase tracking-[0.24em] text-slate-500 lg:hidden">Costo bloque/lote</span>
                              <span className="font-semibold text-slate-900">
                                ${bloque.costo.toLocaleString()}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-sm lg:block">
                              <span className="text-[10px] uppercase tracking-[0.24em] text-slate-500 lg:hidden">Transporte</span>
                              <span className="font-semibold text-slate-900">
                                ${bloque.costoTransporte.toLocaleString()}
                              </span>
                            </div>

                            <div>{renderEstado(bloque)}</div>

                            <div>{renderAcciones(bloque)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <BloquesTrazabilidadSection
          blocks={bloques}
          canReadVentas={canReadVentas}
          searchTerm={searchTerm}
        />

        <AlertDialog
          open={!!deleteTarget}
          onOpenChange={(open) => {
            if (!open && !isDeleting) setDeleteTarget(null)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar bloque/lote</AlertDialogTitle>
              <AlertDialogDescription>
                Esta accion eliminara el registro definitivamente y no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {deleteTarget ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <p>
                  Codigo: <span className="font-semibold">{getBloqueCodigo(deleteTarget)}</span>
                </p>
                <p>
                  Estado actual: <span className="font-semibold">{deleteTarget.estado}</span>
                </p>
              </div>
            ) : null}

            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-rose-600 hover:bg-rose-700"
                disabled={!deleteTarget || isDeleting}
                onClick={(event) => {
                  event.preventDefault()
                  if (deleteTarget) void confirmDelete(deleteTarget)
                }}
              >
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={!!selectedBloque} onOpenChange={() => setSelectedBloque(null)}>
          <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
            {selectedBloque && (
              <>
                <DialogHeader>
                  <DialogTitle>Codigo {getBloqueCodigo(selectedBloque)}</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Codigo</p>
                      <p className="font-medium">{getBloqueCodigo(selectedBloque)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tipo</p>
                      <p className="font-medium">{selectedBloque.tipo}</p>
                    </div>
                    {selectedBloque.tipo === 'Lote' ? (
                      <div>
                        <p className="text-muted-foreground">Medida base</p>
                        <p className="font-medium">{selectedBloque.dimensionBase}</p>
                      </div>
                    ) : null}
                    <div>
                      <p className="text-muted-foreground">Estado</p>
                      <Badge
                        variant={selectedBloque.estado === 'activo' ? 'default' : 'outline'}
                        className={cn(bloqueEstadoBadgeClass[selectedBloque.estado])}
                      >
                        {bloqueEstadoLabel[selectedBloque.estado]}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Fecha de Ingreso</p>
                      <p className="font-medium">{selectedBloque.fechaIngreso}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">
                        {selectedBloque.tipo === 'Lote' ? 'Cantidad losas' : 'Dimension (m3)'}
                      </p>
                      <p className="font-medium">
                        {selectedBloque.tipo === 'Lote'
                          ? `${Math.trunc(selectedBloque.metrosComprados).toLocaleString()} losas`
                          : `${selectedBloque.metrosComprados.toLocaleString()} m3`}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Proveedor</p>
                      <p className="font-medium">{selectedBloque.proveedor}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Cantera / origen</p>
                      <p className="font-medium">{selectedBloque.canteraOrigen || '--'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Costo material</p>
                      <p className="font-medium">${selectedBloque.costo.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Costo transporte</p>
                      <p className="font-medium">${selectedBloque.costoTransporte.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Costo total</p>
                      <p className="font-medium">
                        ${(selectedBloque.costo + selectedBloque.costoTransporte).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminShell>
  )
}


