'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  approveProduccionAlmacen,
  approveProduccionTaller,
  createProduccion,
  deleteProduccion,
  getBloques,
  getEquipos,
  getMonoHiloMasas,
  getProductos,
  getTrabajadores,
  updateProduccion,
} from '@/lib/resources-api'
import { useProduccionStore } from '@/hooks/use-produccion'
import { getBloqueCodigo } from '@/lib/bloque-codigo'
import {
  losasAMetros,
  PLANCHA_DIMENSION,
  TIPO_EQUIPO_POR_ACCION,
  type AccionLosa,
  type BloqueOLote,
  type Dimension,
  type Equipo,
  type MonoHiloMasa,
  type Producto,
  type ProduccionDetalleAccion,
  type ProduccionDiaria,
  type Trabajador,
} from '@/lib/types'
import { ADMIN_STORAGE_KEY, hasPermission, type AdminUser } from '@/lib/admin-auth'
import type { ActionUsageDimensionForm, ActionUsageForm, FormData } from '../model/types'
import {
  actionLabels,
  createInitialFormData,
  createUsageDimensionRow,
  createUsageRow,
  getAccionLosas,
  getDetalleMermaLosas,
  getDetalleReutilizableLosas,
  resolveDateEditPolicy,
} from '../lib/produccion-helpers'

const estadoProcesoRequeridoPorAccion: Record<
  'escuadrar' | 'devastar' | 'resinar' | 'pulir',
  Producto['estado']
> = {
  escuadrar: 'Picado',
  devastar: 'Escuadrado',
  resinar: 'Devastado',
  pulir: 'Resinado',
}

const PROCESS_ACTIONS: AccionLosa[] = ['escuadrar', 'devastar', 'resinar', 'pulir']
const ACTION_ORDER: AccionLosa[] = ['picar', 'escuadrar', 'devastar', 'resinar', 'pulir']
const DIMENSION_OPTIONS: Dimension[] = ['40x40', '60x40', '80x40']
const MONO_HILO_DIMENSIONS: Dimension[] = ['40x40', '60x40', '80x40']

const getMonoHiloLosasDisponibles = (masa: MonoHiloMasa, dimension: Dimension): number => {
  const estimado = masa.estimados[dimension]
  if (!estimado) return 0
  return Math.max(0, estimado.losasEstimadas - estimado.losasConsumidas)
}

const isProcessAction = (
  accion: AccionLosa,
): accion is 'escuadrar' | 'devastar' | 'resinar' | 'pulir' => PROCESS_ACTIONS.includes(accion)

const buildPseudoOrigen = (
  origenId: string,
  origenNombre: string,
  existing?: BloqueOLote,
): BloqueOLote => {
  if (existing) return existing
  return {
    id: origenId,
    codigo: origenNombre,
    nombre: origenNombre,
    tipo: 'Bloque',
    dimensionBase: '60x40',
    costo: 0,
    costoTransporte: 0,
    metrosComprados: 0,
    fechaIngreso: '',
    proveedor: '',
    losasProducidas: 0,
    losasPerdidas: 0,
    metrosVendibles: 0,
    gananciaReal: 0,
    estado: 'activo',
  }
}

const resolveDimensionByTipo = (
  tipo: ProduccionDiaria['tipo'] | '',
  dimension: ProduccionDiaria['dimension'],
): ProduccionDiaria['dimension'] => {
  if (tipo === 'Plancha') return PLANCHA_DIMENSION
  return dimension
}

export const useProduccionPageState = () => {
  const { produccion, replaceProduccion } = useProduccionStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loadingDependencies, setLoadingDependencies] = useState(true)
  const [dependenciesError, setDependenciesError] = useState<string | null>(null)
  const [bloquesYLotes, setBloquesYLotes] = useState<BloqueOLote[]>([])
  const [monoHiloMasas, setMonoHiloMasas] = useState<MonoHiloMasa[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([])
  const [formError, setFormError] = useState('')
  const [formData, setFormData] = useState<FormData>(createInitialFormData)
  const [approvalError, setApprovalError] = useState<string | null>(null)
  const [tallerApprovalLoadingById, setTallerApprovalLoadingById] = useState<Record<string, boolean>>({})
  const [almacenApprovalLoadingById, setAlmacenApprovalLoadingById] = useState<Record<string, boolean>>({})
  const [entryActionError, setEntryActionError] = useState<string | null>(null)
  const [entryUpdateLoadingById, setEntryUpdateLoadingById] = useState<Record<string, boolean>>({})
  const [entryDeleteLoadingById, setEntryDeleteLoadingById] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let alive = true

    const load = async () => {
      setLoadingDependencies(true)
      setDependenciesError(null)
      try {
        const sessionUser = (() => {
          if (typeof window === 'undefined') return null
          const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY)
          if (!raw) return null
          try {
            return JSON.parse(raw) as AdminUser
          } catch {
            return null
          }
        })()

        const canReadBloques = hasPermission(sessionUser, 'bloques:read')
        const canReadInventario = hasPermission(sessionUser, 'inventario:read')
        const canReadProduccion = hasPermission(sessionUser, 'produccion:read')
        const canReadEquipos = hasPermission(sessionUser, 'equipos:read')
        const canReadTrabajadores = hasPermission(sessionUser, 'trabajadores:read')

        const [bloquesData, monoHiloData, productosData, equiposData, trabajadoresData] = await Promise.all([
          canReadBloques ? getBloques() : Promise.resolve<BloqueOLote[]>([]),
          canReadProduccion ? getMonoHiloMasas() : Promise.resolve<MonoHiloMasa[]>([]),
          canReadInventario ? getProductos() : Promise.resolve<Producto[]>([]),
          canReadEquipos ? getEquipos() : Promise.resolve<Equipo[]>([]),
          canReadTrabajadores ? getTrabajadores() : Promise.resolve<Trabajador[]>([]),
        ])

        if (!alive) return
        setBloquesYLotes(bloquesData)
        setMonoHiloMasas(monoHiloData)
        setProductos(productosData)
        setEquipos(equiposData)
        setTrabajadores(trabajadoresData)
      } catch (error) {
        if (!alive) return
        setDependenciesError(
          error instanceof Error ? error.message : 'No se pudieron cargar catalogos de produccion.',
        )
      } finally {
        if (alive) setLoadingDependencies(false)
      }
    }

    void load()

    return () => {
      alive = false
    }
  }, [])

  const trabajadoresActivos = useMemo(
    () =>
      trabajadores.filter(
        (trabajador) =>
          trabajador.estado === 'activo' &&
          trabajador.rol.trim().toLowerCase() === 'obrero',
      ),
    [trabajadores],
  )
  const equiposActivos = useMemo(() => equipos.filter((equipo) => equipo.estado === 'activo'), [equipos])
  const codigosEquipoPorId = useMemo(() => {
    const map = new Map<string, string>()
    equiposActivos.forEach((equipo) => {
      const codigo = equipo.codigoInterno.trim()
      if (!codigo) return
      map.set(equipo.id, codigo)
    })
    return map
  }, [equiposActivos])
  const bloquesActivosMonoHilo = useMemo(
    () =>
      bloquesYLotes.filter(
        (bloque) => bloque.estado === 'activo' && bloque.tipo === 'Bloque',
      ),
    [bloquesYLotes],
  )

  const stockMonoHiloPorClave = useMemo(() => {
    const map = new Map<string, number>()

    for (const masa of monoHiloMasas) {
      if (masa.ubicacion !== 'proceso') continue

      for (const dimension of MONO_HILO_DIMENSIONS) {
        const disponibles = getMonoHiloLosasDisponibles(masa, dimension)
        if (disponibles <= 0) continue

        const key = `${masa.bloqueId}::${dimension}`
        map.set(key, (map.get(key) ?? 0) + disponibles)
      }
    }

    return map
  }, [monoHiloMasas])

  const origenesActivosParaPicar = useMemo(() => {
    const idsConStock = new Set<string>()

    for (const key of stockMonoHiloPorClave.keys()) {
      const [bloqueId] = key.split('::')
      if (bloqueId) idsConStock.add(bloqueId)
    }

    return bloquesActivosMonoHilo.filter((bloque) => idsConStock.has(bloque.id))
  }, [bloquesActivosMonoHilo, stockMonoHiloPorClave])

  const stockProcesoDisponible = useMemo(
    () =>
      productos.filter((producto) => producto.ubicacion === 'proceso' && producto.cantidadLosas > 0),
    [productos],
  )

  const origenesActivosByAccion = useMemo<Record<AccionLosa, BloqueOLote[]>>(() => {
    const bloquesPorId = new Map(bloquesYLotes.map((bloque) => [bloque.id, bloque]))

    const procesoEscuadrar = stockProcesoDisponible
      .filter((producto) => producto.estado === estadoProcesoRequeridoPorAccion.escuadrar)
      .map((producto) =>
        buildPseudoOrigen(
          producto.origenId,
          producto.origenNombre,
          bloquesPorId.get(producto.origenId),
        ),
      )
    const procesoDevastar = stockProcesoDisponible
      .filter((producto) => producto.estado === estadoProcesoRequeridoPorAccion.devastar)
      .map((producto) =>
        buildPseudoOrigen(
          producto.origenId,
          producto.origenNombre,
          bloquesPorId.get(producto.origenId),
        ),
      )
    const procesoResinar = stockProcesoDisponible
      .filter((producto) => producto.estado === estadoProcesoRequeridoPorAccion.resinar)
      .map((producto) =>
        buildPseudoOrigen(
          producto.origenId,
          producto.origenNombre,
          bloquesPorId.get(producto.origenId),
        ),
      )
    const procesoPulir = stockProcesoDisponible
      .filter((producto) => producto.estado === estadoProcesoRequeridoPorAccion.pulir)
      .map((producto) =>
        buildPseudoOrigen(
          producto.origenId,
          producto.origenNombre,
          bloquesPorId.get(producto.origenId),
        ),
      )

    const dedupe = (items: BloqueOLote[]) =>
      Array.from(new Map(items.map((item) => [item.id, item])).values())

    return {
      picar: origenesActivosParaPicar,
      escuadrar: dedupe(procesoEscuadrar),
      devastar: dedupe(procesoDevastar),
      resinar: dedupe(procesoResinar),
      pulir: dedupe(procesoPulir),
    }
  }, [bloquesYLotes, origenesActivosParaPicar, stockProcesoDisponible])

  const stockProcesoPorClave = useMemo(() => {
    const map = new Map<string, number>()
    for (const producto of stockProcesoDisponible) {
      const key = `${producto.origenId}::${producto.tipo}::${producto.dimension}::${producto.estado}`
      map.set(key, (map.get(key) ?? 0) + producto.cantidadLosas)
    }
    return map
  }, [stockProcesoDisponible])

  const codigosOrigenPorId = useMemo(() => {
    const map = new Map<string, string>()
    bloquesYLotes.forEach((bloque) => {
      const codigo = getBloqueCodigo(bloque).trim().toUpperCase()
      if (!codigo) return

      map.set(bloque.id.trim(), codigo)
      map.set((bloque.nombre ?? '').trim().toLowerCase(), codigo)
      map.set((bloque.codigo ?? '').trim().toLowerCase(), codigo)
    })
    return map
  }, [bloquesYLotes])

  const resolveLegacyCodigo = (value: string): string | null => {
    const normalized = value.trim().toUpperCase()
    if (!normalized) return null
    if (/^[AL]-\d{3}$/.test(normalized)) return normalized

    const bloqueMatch = normalized.match(/^BL(\d+)$/)
    if (bloqueMatch) {
      return `A-${bloqueMatch[1].padStart(3, '0')}`
    }

    const loteMatch = normalized.match(/^LT(\d+)$/)
    if (loteMatch) {
      return `L-${loteMatch[1].padStart(3, '0')}`
    }

    const bloqueNombreMatch = normalized.match(/^BLOQUE\s+(\d+)$/)
    if (bloqueNombreMatch) {
      return `A-${bloqueNombreMatch[1].padStart(3, '0')}`
    }

    const loteNombreMatch = normalized.match(/^LOTE\s+(\d+)$/)
    if (loteNombreMatch) {
      return `L-${loteNombreMatch[1].padStart(3, '0')}`
    }

    return null
  }

  const resolveOrigenCodigo = useCallback(
    (origenId: string, origenNombre: string): string => {
      const byId = codigosOrigenPorId.get(origenId.trim()) || codigosOrigenPorId.get(origenId.trim().toLowerCase())
      if (byId) return byId

      const byNombre = codigosOrigenPorId.get(origenNombre.trim().toLowerCase())
      if (byNombre) return byNombre

      const legacyFromId = resolveLegacyCodigo(origenId)
      if (legacyFromId) return legacyFromId

      const legacyFromNombre = resolveLegacyCodigo(origenNombre)
      if (legacyFromNombre) return legacyFromNombre

      return 'SIN-CODIGO'
    },
    [codigosOrigenPorId],
  )

  const resolveEquipoCodigo = useCallback(
    (equipoId: string, equipoNombre: string): string => {
      if (!equipoId || equipoId === 'EQUIPO-N/A' || equipoId === 'sin-equipo' || equipoId === 'legacy') {
        return 'SIN-EQUIPO'
      }

      const codigo = codigosEquipoPorId.get(equipoId.trim())
      if (codigo) return codigo

      const fallback = equipoNombre.trim()
      if (!fallback) return 'SIN-EQUIPO'
      return fallback
    },
    [codigosEquipoPorId],
  )

  const normalizeUsageForPlancha = useCallback((uso: ActionUsageForm): ActionUsageForm => {
    if (uso.tipo !== 'Plancha') return uso

    const baseDimension = uso.dimensiones.find((item) => item.dimension === PLANCHA_DIMENSION) ?? uso.dimensiones[0]
    if (!baseDimension) {
      return {
        ...uso,
        dimensiones: [createUsageDimensionRow(PLANCHA_DIMENSION)],
      }
    }

    if (baseDimension.dimension === PLANCHA_DIMENSION && uso.dimensiones.length === 1) {
      return uso
    }

    return {
      ...uso,
      dimensiones: [{ ...baseDimension, dimension: PLANCHA_DIMENSION }],
    }
  }, [])

  const getLosasDisponiblesParaAccion = useCallback(
    (
      accion: AccionLosa,
      origenId: string,
      tipo: ProduccionDiaria['tipo'] | '',
      dimension: ProduccionDiaria['dimension'],
    ): number | null => {
      if (!origenId) return null

      if (accion === 'picar') {
        const resolveDisponibilidadMonoHilo = (dimensionItem: ProduccionDiaria['dimension']): number => {
          if (tipo === 'Plancha' && dimensionItem !== PLANCHA_DIMENSION) return 0
          return stockMonoHiloPorClave.get(`${origenId}::${dimensionItem}`) ?? 0
        }

        if (!tipo) {
          return MONO_HILO_DIMENSIONS.reduce(
            (maxValue, dimensionItem) =>
              Math.max(maxValue, resolveDisponibilidadMonoHilo(dimensionItem)),
            0,
          )
        }

        const dimensionNormalizada = resolveDimensionByTipo(tipo, dimension)
        return resolveDisponibilidadMonoHilo(dimensionNormalizada)
      }

      if (!isProcessAction(accion)) return null

      const estadoRequerido = estadoProcesoRequeridoPorAccion[accion]
      const resolveDisponibilidad = (
        tipoItem: ProduccionDiaria['tipo'],
        dimensionItem: ProduccionDiaria['dimension'],
      ): number => {
        if (tipoItem === 'Plancha' && dimensionItem !== PLANCHA_DIMENSION) return 0
        const dimensionNormalizada = resolveDimensionByTipo(tipoItem, dimensionItem)
        const stockKey = `${origenId}::${tipoItem}::${dimensionNormalizada}::${estadoRequerido}`
        return stockProcesoPorClave.get(stockKey) ?? 0
      }

      if (!tipo) {
        return (['Piso', 'Plancha'] as const).reduce(
          (maxValue, tipoItem) => Math.max(maxValue, resolveDisponibilidad(tipoItem, dimension)),
          0,
        )
      }

      return resolveDisponibilidad(tipo, dimension)
    },
    [stockMonoHiloPorClave, stockProcesoPorClave],
  )

  const filteredProduccion = produccion.filter((registro) => {
    const query = searchTerm.toLowerCase().trim()
    const matchesSearch =
      registro.fecha.toLowerCase().includes(query) ||
      registro.origenNombre.toLowerCase().includes(query) ||
      registro.tipo.toLowerCase().includes(query) ||
      registro.dimension.toLowerCase().includes(query)
    const matchesDate = !dateFilter || registro.fecha === dateFilter
    return matchesSearch && matchesDate
  })

  const today = new Date().toISOString().split('T')[0]
  const fechaMasReciente = [...new Set(produccion.map((registro) => registro.fecha))]
    .sort((a, b) => b.localeCompare(a))[0] ?? today
  const fechaResumen = dateFilter || fechaMasReciente
  const produccionResumen = produccion.filter((registro) => registro.fecha === fechaResumen)

  const totalM2Resumen = produccionResumen.reduce((sum, item) => sum + item.totalM2, 0)
  const totalLosasResumen = produccionResumen.reduce((sum, item) => sum + item.totalLosas, 0)
  const origenesActivosResumen = new Set(produccionResumen.map((item) => item.origenId)).size

  const resumenAcciones = produccionResumen.reduce<Record<AccionLosa, number>>(
    (acc, item) => {
      acc.picar += losasAMetros(getAccionLosas(item, 'picar'), item.dimension)
      acc.escuadrar += losasAMetros(getAccionLosas(item, 'escuadrar'), item.dimension)
      acc.devastar += losasAMetros(getAccionLosas(item, 'devastar'), item.dimension)
      acc.resinar += losasAMetros(getAccionLosas(item, 'resinar'), item.dimension)
      acc.pulir += losasAMetros(getAccionLosas(item, 'pulir'), item.dimension)
      return acc
    },
    { picar: 0, escuadrar: 0, devastar: 0, resinar: 0, pulir: 0 },
  )

  const topOrigenesResumen = useMemo(
    () =>
      [...produccionResumen]
        .sort((a, b) => b.totalM2 - a.totalM2)
        .slice(0, 3)
        .map((item) => ({
          ...item,
          origenNombre: resolveOrigenCodigo(item.origenId, item.origenNombre),
        })),
    [produccionResumen, resolveOrigenCodigo],
  )

  const resumenPartidas = useMemo(() => {
    return produccionResumen.reduce(
      (acc, item) => {
        const detalles = item.detallesAcciones ?? []

        detalles.forEach((detalle) => {
          const mermaLosas = getDetalleMermaLosas(detalle)
          const reutilizableLosas = getDetalleReutilizableLosas(detalle)
          const mermaM2Detalle =
            detalle.accion === 'picar'
              ? 0
              : (detalle.metrosMermaTotal ?? 0) > 0
                ? detalle.metrosMermaTotal ?? 0
                : losasAMetros(mermaLosas, item.dimension)

          acc.mermaLosas += mermaLosas
          acc.mermaM2 += mermaM2Detalle

          acc.reutilizableLosas += reutilizableLosas
          acc.reutilizableM2 +=
            (detalle.metrosReutilizables ?? 0) > 0
              ? detalle.metrosReutilizables ?? 0
              : losasAMetros(reutilizableLosas, item.dimension)
        })

        return acc
      },
      { mermaLosas: 0, mermaM2: 0, reutilizableLosas: 0, reutilizableM2: 0 },
    )
  }, [produccionResumen])

  const dateEditPolicy = useMemo(
    () => resolveDateEditPolicy(produccion, formData.fecha),
    [produccion, formData.fecha],
  )

  const groupedByDate = filteredProduccion.reduce<Record<string, ProduccionDiaria[]>>((acc, item) => {
    if (!acc[item.fecha]) {
      acc[item.fecha] = []
    }
    acc[item.fecha].push(item)
    return acc
  }, {})

  const fechasOrdenadas = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a))

  const prepareNewForm = () => {
    const nextForm = createInitialFormData()
    const accionInicial = ACTION_ORDER.find(
      (accion) => (origenesActivosByAccion[accion]?.length ?? 0) > 0,
    )

    if (accionInicial) {
      const primerOrigen = origenesActivosByAccion[accionInicial][0]
      nextForm.accionActiva = accionInicial
      if (primerOrigen) {
        const dimensionInicial =
          (PROCESS_ACTIONS.includes(accionInicial) || accionInicial === 'picar')
            ? DIMENSION_OPTIONS.find(
                (dimension) =>
                  (getLosasDisponiblesParaAccion(accionInicial, primerOrigen.id, '', dimension) ?? 0) > 0,
              ) ?? PLANCHA_DIMENSION
            : '60x40'

        nextForm.acciones[accionInicial].usos = [
          {
            ...nextForm.acciones[accionInicial].usos[0],
            origenId: primerOrigen.id,
            dimensiones: [createUsageDimensionRow(dimensionInicial)],
          },
        ]
      }
    }

    setFormData(nextForm)
    setFormError('')
  }

  const resetFormAndClose = () => {
    prepareNewForm()
    setIsDialogOpen(false)
  }

  const getUsageLosas = (uso: ActionUsageForm): number =>
    uso.dimensiones.reduce((sum, dimensionUso) => sum + dimensionUso.cantidadLosas, 0)

  const resolveAvailableDimensionsForUsage = useCallback(
    (accion: AccionLosa, uso: ActionUsageForm): Dimension[] => {
      if (accion !== 'picar' && !PROCESS_ACTIONS.includes(accion)) return DIMENSION_OPTIONS
      if (!uso.origenId) return DIMENSION_OPTIONS

      const disponibles = DIMENSION_OPTIONS.filter(
        (dimension) =>
          (getLosasDisponiblesParaAccion(accion, uso.origenId, uso.tipo, dimension) ?? 0) > 0,
      )

      return disponibles
    },
    [getLosasDisponiblesParaAccion],
  )

  const updateUsage = (
    accion: AccionLosa,
    usageId: string,
    patch: Partial<ActionUsageForm>,
  ) => {
    setFormData((prev) => {
      const usosActualizados = prev.acciones[accion].usos.map((uso) => {
        if (uso.id !== usageId) return uso

        const usoNormalizado = normalizeUsageForPlancha({ ...uso, ...patch })
        const dimensionesDisponibles = resolveAvailableDimensionsForUsage(accion, usoNormalizado)
        const dimensionesFiltradas = usoNormalizado.dimensiones.filter((dimensionUso) =>
          dimensionesDisponibles.includes(dimensionUso.dimension),
        )

        if (dimensionesFiltradas.length > 0) {
          return {
            ...usoNormalizado,
            dimensiones: dimensionesFiltradas,
          }
        }

        if (dimensionesDisponibles.length > 0) {
          return {
            ...usoNormalizado,
            dimensiones: [createUsageDimensionRow(dimensionesDisponibles[0])],
          }
        }

        return usoNormalizado
      })
      const cantidadLosas = usosActualizados.reduce((sum, uso) => sum + getUsageLosas(uso), 0)

      return {
        ...prev,
        acciones: {
          ...prev.acciones,
          [accion]: {
            ...prev.acciones[accion],
            usos: usosActualizados,
            cantidadLosas,
            cantidadTouched: true,
          },
        },
      }
    })
  }

  const updateUsageDimension = (
    accion: AccionLosa,
    usageId: string,
    dimensionUsageId: string,
    patch: Partial<ActionUsageDimensionForm>,
  ) => {
    setFormData((prev) => {
      const usosActualizados = prev.acciones[accion].usos.map((uso) => {
        if (uso.id !== usageId) return uso

        return {
          ...uso,
          dimensiones: uso.dimensiones.map((dimensionUso) =>
            dimensionUso.id === dimensionUsageId ? { ...dimensionUso, ...patch } : dimensionUso,
          ),
        }
      })
      const cantidadLosas = usosActualizados.reduce((sum, uso) => sum + getUsageLosas(uso), 0)

      return {
        ...prev,
        acciones: {
          ...prev.acciones,
          [accion]: {
            ...prev.acciones[accion],
            usos: usosActualizados,
            cantidadLosas,
            cantidadTouched: true,
          },
        },
      }
    })
  }

  const toggleUsageDimension = (
    accion: AccionLosa,
    usageId: string,
    dimension: Dimension,
    enabled: boolean,
  ) => {
    setFormData((prev) => {
      const usosActualizados = prev.acciones[accion].usos.map((uso) => {
        if (uso.id !== usageId) return uso
        const usoNormalizado = normalizeUsageForPlancha(uso)
        if (usoNormalizado.tipo === 'Plancha') {
          return usoNormalizado
        }

        const esAccionConStock = accion === 'picar' || PROCESS_ACTIONS.includes(accion)
        if (
          esAccionConStock &&
          enabled &&
          (getLosasDisponiblesParaAccion(accion, usoNormalizado.origenId, usoNormalizado.tipo, dimension) ?? 0) <= 0
        ) {
          return usoNormalizado
        }

        const alreadyExists = usoNormalizado.dimensiones.some(
          (dimensionUso) => dimensionUso.dimension === dimension,
        )

        if (enabled && !alreadyExists) {
          return {
            ...usoNormalizado,
            dimensiones: [...usoNormalizado.dimensiones, createUsageDimensionRow(dimension)],
          }
        }

        if (!enabled && alreadyExists) {
          return {
            ...usoNormalizado,
            dimensiones: usoNormalizado.dimensiones.filter(
              (dimensionUso) => dimensionUso.dimension !== dimension,
            ),
          }
        }

        return usoNormalizado
      })
      const cantidadLosas = usosActualizados.reduce((sum, uso) => sum + getUsageLosas(uso), 0)

      return {
        ...prev,
        acciones: {
          ...prev.acciones,
          [accion]: {
            ...prev.acciones[accion],
            usos: usosActualizados,
            cantidadLosas,
            cantidadTouched: true,
          },
        },
      }
    })
  }

  const addUsage = (accion: AccionLosa) => {
    const primerOrigen = origenesActivosByAccion[accion]?.[0]
    const usoBase: ActionUsageForm = {
      ...createUsageRow(),
      origenId: primerOrigen?.id ?? '',
      dimensiones: PROCESS_ACTIONS.includes(accion) ? [] : [createUsageDimensionRow('60x40')],
    }
    const dimensionesDisponibles = resolveAvailableDimensionsForUsage(accion, usoBase)
    const usoConDisponibilidad: ActionUsageForm =
      dimensionesDisponibles.length > 0
        ? { ...usoBase, dimensiones: [createUsageDimensionRow(dimensionesDisponibles[0])] }
        : usoBase

    setFormData((prev) => ({
      ...prev,
      acciones: {
        ...prev.acciones,
        [accion]: {
          ...prev.acciones[accion],
          usos: [...prev.acciones[accion].usos, usoConDisponibilidad],
          cantidadTouched: true,
        },
      },
    }))
  }

  const removeUsage = (accion: AccionLosa, usageId: string) => {
    setFormData((prev) => {
      const usosFiltrados = prev.acciones[accion].usos.filter((uso) => uso.id !== usageId)
      return {
        ...prev,
        acciones: {
          ...prev.acciones,
          [accion]: {
            ...prev.acciones[accion],
            usos: usosFiltrados.length > 0 ? usosFiltrados : [createUsageRow()],
            cantidadLosas: usosFiltrados.reduce((sum, uso) => sum + getUsageLosas(uso), 0),
            cantidadTouched: true,
          },
        },
      }
    })
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError('')

    if (!formData.fecha) {
      setFormError('Selecciona la fecha de produccion.')
      return
    }

    if (formData.fecha > today) {
      setFormError('La fecha de produccion no puede ser futura.')
      return
    }

    if (dateEditPolicy.hasRecords && !dateEditPolicy.canMutate) {
      setFormError(dateEditPolicy.message)
      return
    }

    if (!formData.accionActiva) {
      setFormError('Selecciona primero la accion a registrar.')
      return
    }

    const workersById = new Map(trabajadoresActivos.map((worker) => [worker.id, worker]))
    const equiposById = new Map(equiposActivos.map((equipo) => [equipo.id, equipo]))
    const origenesById = new Map(
      [
        ...bloquesYLotes,
        ...origenesActivosByAccion.escuadrar,
        ...origenesActivosByAccion.devastar,
        ...origenesActivosByAccion.resinar,
        ...origenesActivosByAccion.pulir,
      ].map((origen) => [origen.id, origen]),
    )
    const registrosPorCombo = new Map<
      string,
      {
        origenId: string
        origenNombre: string
        tipo: ProduccionDiaria['tipo']
        dimension: ProduccionDiaria['dimension']
        actionTotals: Record<AccionLosa, number>
        detallesAcciones: ProduccionDetalleAccion[]
      }
    >()
    const consumoProcesoReservado = new Map<string, number>()
    const consumoMonoHiloReservado = new Map<string, number>()

    for (const accion of [formData.accionActiva] as AccionLosa[]) {
      const accionState = formData.acciones[accion]
      const includeMermaEnAccion = accion !== 'picar' && accion !== 'resinar'
      const includeReutilizableEnAccion = accion !== 'resinar'

      const usosCapturados = accionState.usos.filter(
        (uso) =>
          uso.origenId ||
          uso.tipo ||
          uso.trabajadorIds.length > 0 ||
          uso.equipoId ||
          uso.dimensiones.some(
            (dimensionUso) =>
              dimensionUso.cantidadLosas > 0 ||
              (includeMermaEnAccion && dimensionUso.mermaTotalLosas > 0) ||
              (includeReutilizableEnAccion && dimensionUso.reutilizableLosas > 0),
          ),
      )

      if (usosCapturados.length === 0) {
        continue
      }

      for (const uso of usosCapturados) {
        const usoNormalizado = normalizeUsageForPlancha(uso)

        if (!usoNormalizado.origenId) {
          setFormError(`Completa bloque/lote en ${actionLabels[accion]}.`)
          return
        }

        const trabajadoresEquipo = [...new Set(usoNormalizado.trabajadorIds)]
          .map((trabajadorId) => workersById.get(trabajadorId))
          .filter((trabajador): trabajador is (typeof trabajadoresActivos)[number] => Boolean(trabajador))

        if (trabajadoresEquipo.length !== new Set(usoNormalizado.trabajadorIds).size) {
          setFormError('Uno de los trabajadores seleccionados no esta activo.')
          return
        }

        const origen = origenesById.get(usoNormalizado.origenId)
        if (!origen) {
          setFormError('Uno de los bloques/lotes seleccionados no es valido.')
          return
        }

        const equipoDetalle: { id: string; codigoInterno: string } = {
          id: 'EQUIPO-N/A',
          codigoInterno: 'SIN-EQUIPO',
        }

        if (accion !== 'resinar') {
          const tipoEsperado = TIPO_EQUIPO_POR_ACCION[accion]

          if (!usoNormalizado.equipoId) {
            setFormError(`Selecciona un equipo en ${actionLabels[accion]}.`)
            return
          }

          const equipoSeleccionado = equiposById.get(usoNormalizado.equipoId)
          if (!equipoSeleccionado) {
            setFormError('Uno de los equipos seleccionados no es valido o no esta activo.')
            return
          }

          if (equipoSeleccionado.tipo !== tipoEsperado) {
            setFormError(`${actionLabels[accion]} solo permite equipos tipo ${tipoEsperado}.`)
            return
          }

          equipoDetalle.id = equipoSeleccionado.id
          equipoDetalle.codigoInterno = equipoSeleccionado.codigoInterno
        }

        const dimensionesCapturadas = usoNormalizado.dimensiones.filter(
          (dimensionUso) =>
            dimensionUso.cantidadLosas > 0 ||
            (includeMermaEnAccion && dimensionUso.mermaTotalLosas > 0) ||
            (includeReutilizableEnAccion && dimensionUso.reutilizableLosas > 0),
        )

        if (dimensionesCapturadas.length === 0) {
          setFormError(`Selecciona al menos una dimension con losas en ${actionLabels[accion]}.`)
          return
        }

        for (const dimensionUso of dimensionesCapturadas) {
          const mermaTotalLosas = includeMermaEnAccion ? dimensionUso.mermaTotalLosas : 0
          const reutilizableLosas = includeReutilizableEnAccion ? dimensionUso.reutilizableLosas : 0
          let tipoUso = usoNormalizado.tipo as ProduccionDiaria['tipo'] | ''

          if (!Number.isInteger(dimensionUso.cantidadLosas) || dimensionUso.cantidadLosas <= 0) {
            setFormError(
              `Las losas de ${actionLabels[accion]} en dimension ${dimensionUso.dimension} deben ser enteras y mayores a 0.`,
            )
            return
          }

          if (
            !Number.isInteger(mermaTotalLosas) ||
            !Number.isInteger(reutilizableLosas)
          ) {
            setFormError(
              `Merma y reutilizable en ${actionLabels[accion]} (${dimensionUso.dimension}) deben ser numeros enteros.`,
            )
            return
          }

          if (mermaTotalLosas < 0 || reutilizableLosas < 0) {
            setFormError(
              `Merma y reutilizable en ${actionLabels[accion]} (${dimensionUso.dimension}) no pueden ser negativos.`,
            )
            return
          }

          if (mermaTotalLosas + reutilizableLosas > dimensionUso.cantidadLosas) {
            setFormError(
              `En ${actionLabels[accion]} (${dimensionUso.dimension}) la suma de merma + reutilizable no puede superar las losas procesadas.`,
            )
            return
          }

          if (!tipoUso) {
            setFormError(`Selecciona el tipo (Piso o Plancha) en ${actionLabels[accion]}.`)
            return
          }

          if (tipoUso === 'Plancha' && dimensionUso.dimension !== PLANCHA_DIMENSION) {
            setFormError(`Plancha solo permite dimension ${PLANCHA_DIMENSION}.`)
            return
          }

          const dimensionUsoReal = resolveDimensionByTipo(tipoUso, dimensionUso.dimension)

          if (accion === 'picar') {
            const stockKeyMonoHilo = `${usoNormalizado.origenId}::${dimensionUsoReal}`
            const disponibleMonoHilo = stockMonoHiloPorClave.get(stockKeyMonoHilo) ?? 0
            const reservadoMonoHilo = consumoMonoHiloReservado.get(stockKeyMonoHilo) ?? 0
            const restanteMonoHilo = disponibleMonoHilo - reservadoMonoHilo

            if (restanteMonoHilo < dimensionUso.cantidadLosas) {
              setFormError(
                `Masas de mono hilo insuficientes para picar (${dimensionUsoReal}). Disponible en proceso: ${Math.max(0, restanteMonoHilo)} losas estimadas.`,
              )
              return
            }

            consumoMonoHiloReservado.set(
              stockKeyMonoHilo,
              reservadoMonoHilo + dimensionUso.cantidadLosas,
            )
          }

          if (accion === 'escuadrar' || accion === 'devastar' || accion === 'resinar' || accion === 'pulir') {
            const estadoRequerido = estadoProcesoRequeridoPorAccion[accion]
            const stockKey = `${usoNormalizado.origenId}::${tipoUso}::${dimensionUsoReal}::${estadoRequerido}`
            const disponible = stockProcesoPorClave.get(stockKey) ?? 0
            const reservado = consumoProcesoReservado.get(stockKey) ?? 0
            const restante = disponible - reservado

            if (restante < dimensionUso.cantidadLosas) {
              setFormError(
                `Stock fuera de almacen insuficiente para ${actionLabels[accion]} (${dimensionUsoReal}, estado ${estadoRequerido}). Disponible: ${Math.max(0, restante)} losas.`,
              )
              return
            }

            consumoProcesoReservado.set(
              stockKey,
              reservado + dimensionUso.cantidadLosas,
            )
          }

          if (accion === 'resinar') {
            if (!Number.isFinite(dimensionUso.cantidadResina) || dimensionUso.cantidadResina <= 0) {
              setFormError(
                `Debes indicar la cantidad de resina consumida en ${actionLabels[accion]} (${dimensionUsoReal}).`,
              )
              return
            }
          }

          const comboKey = `${usoNormalizado.origenId}::${tipoUso}::${dimensionUsoReal}`
          const comboActual =
            registrosPorCombo.get(comboKey) ??
            {
              origenId: usoNormalizado.origenId,
              origenNombre: getBloqueCodigo(origen),
              tipo: tipoUso,
              dimension: dimensionUsoReal,
              actionTotals: {
                picar: 0,
                escuadrar: 0,
                devastar: 0,
                resinar: 0,
                pulir: 0,
              },
              detallesAcciones: [],
            }

          comboActual.actionTotals[accion] += dimensionUso.cantidadLosas

          comboActual.detallesAcciones.push({
            id: `PGA-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
            accion,
            trabajadorId: trabajadoresEquipo[0]?.id,
            trabajadorNombre: trabajadoresEquipo[0]?.nombre,
            trabajadores: trabajadoresEquipo.map((trabajador) => ({
              id: trabajador.id,
              nombre: trabajador.nombre,
            })),
            equipoId: equipoDetalle.id,
            equipoNombre: equipoDetalle.codigoInterno,
            cantidadLosas: dimensionUso.cantidadLosas,
            metrosCuadrados: losasAMetros(dimensionUso.cantidadLosas, dimensionUsoReal),
            losasMermaTotal: mermaTotalLosas,
            metrosMermaTotal: losasAMetros(mermaTotalLosas, dimensionUsoReal),
            losasReutilizables: reutilizableLosas,
            metrosReutilizables: losasAMetros(reutilizableLosas, dimensionUsoReal),
            cantidadResina: accion === 'resinar' ? dimensionUso.cantidadResina : undefined,
          })

          registrosPorCombo.set(comboKey, comboActual)
        }
      }
    }

    if (registrosPorCombo.size === 0) {
      setFormError('Ingresa al menos una cantidad de losas.')
      return
    }

    const fecha = formData.fecha
    const payloads: Array<Omit<ProduccionDiaria, 'id'>> = []
    for (const combo of registrosPorCombo.values()) {
      const cantidadPicar = combo.actionTotals.picar
      const cantidadEscuadrar = combo.actionTotals.escuadrar
      const cantidadDevastar = combo.actionTotals.devastar
      const cantidadResinar = combo.actionTotals.resinar
      const cantidadPulir = combo.actionTotals.pulir
      const totalLosas =
        cantidadPicar + cantidadEscuadrar + cantidadDevastar + cantidadResinar + cantidadPulir

      if (totalLosas <= 0) continue

      payloads.push({
        fecha,
        origenId: combo.origenId,
        origenNombre: combo.origenNombre,
        tipo: combo.tipo,
        dimension: combo.dimension,
        cantidadPicar,
        cantidadEscuadrar,
        cantidadDevastar,
        cantidadResinar,
        cantidadPulir,
        totalLosas,
        totalM2: losasAMetros(totalLosas, combo.dimension),
        detallesAcciones: combo.detallesAcciones,
      })
    }

    if (payloads.length === 0) {
      setFormError('Ingresa al menos una cantidad de losas.')
      return
    }

    try {
      const createdRecords: ProduccionDiaria[] = []
      for (const payload of payloads) {
        const created = await createProduccion(payload)
        createdRecords.push(created)
      }

      replaceProduccion((prev) => [...createdRecords, ...prev])
      resetFormAndClose()
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : 'No se pudo registrar la produccion en el backend.',
      )
    }
  }

  const approveProduccionTallerRegistro = async (
    produccionId: string,
    aprobado: boolean,
    motivoRechazo?: string,
  ): Promise<boolean> => {
    if (!aprobado && (!motivoRechazo || motivoRechazo.trim().length < 5)) {
      setApprovalError('Debes indicar un motivo de rechazo de al menos 5 caracteres.')
      return false
    }

    setApprovalError(null)
    setTallerApprovalLoadingById((prev) => ({ ...prev, [produccionId]: true }))

    try {
      const updated = await approveProduccionTaller(produccionId, {
        aprobado,
        motivoRechazo: motivoRechazo?.trim(),
      })

      replaceProduccion((prev) =>
        prev.map((registro) => (registro.id === updated.id ? updated : registro)),
      )

      return true
    } catch (error) {
      setApprovalError(
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar la aprobacion de taller.',
      )
      return false
    } finally {
      setTallerApprovalLoadingById((prev) => ({ ...prev, [produccionId]: false }))
    }
  }

  const approveProduccionAlmacenRegistro = async (produccionId: string): Promise<boolean> => {
    setApprovalError(null)
    setAlmacenApprovalLoadingById((prev) => ({ ...prev, [produccionId]: true }))

    try {
      const updated = await approveProduccionAlmacen(produccionId, {
        motivo: 'Aprobacion confirmada en modal',
      })

      replaceProduccion((prev) =>
        prev.map((registro) => (registro.id === updated.id ? updated : registro)),
      )

      return true
    } catch (error) {
      setApprovalError(
        error instanceof Error
          ? error.message
          : 'No se pudo registrar la entrada de almacen para esta produccion.',
      )
      return false
    } finally {
      setAlmacenApprovalLoadingById((prev) => ({ ...prev, [produccionId]: false }))
    }
  }

  const updateProduccionRegistro = async (
    produccionId: string,
    patch: Partial<ProduccionDiaria>,
  ): Promise<ProduccionDiaria | null> => {
    setEntryActionError(null)
    setEntryUpdateLoadingById((prev) => ({ ...prev, [produccionId]: true }))

    try {
      const updated = await updateProduccion(produccionId, patch)
      replaceProduccion((prev) =>
        prev.map((registro) => (registro.id === updated.id ? updated : registro)),
      )
      return updated
    } catch (error) {
      setEntryActionError(
        error instanceof Error ? error.message : 'No se pudo actualizar la entrada de produccion.',
      )
      return null
    } finally {
      setEntryUpdateLoadingById((prev) => ({ ...prev, [produccionId]: false }))
    }
  }

  const deleteProduccionRegistro = async (produccionId: string): Promise<boolean> => {
    setEntryActionError(null)
    setEntryDeleteLoadingById((prev) => ({ ...prev, [produccionId]: true }))

    try {
      await deleteProduccion(produccionId)
      replaceProduccion((prev) => prev.filter((registro) => registro.id !== produccionId))
      return true
    } catch (error) {
      setEntryActionError(
        error instanceof Error ? error.message : 'No se pudo eliminar la entrada de produccion.',
      )
      return false
    } finally {
      setEntryDeleteLoadingById((prev) => ({ ...prev, [produccionId]: false }))
    }
  }

  const getDatePolicy = (fecha: string) => resolveDateEditPolicy(produccion, fecha)

  return {
    addUsage,
    almacenApprovalLoadingById,
    approvalError,
    deleteProduccionRegistro,
    approveProduccionAlmacenRegistro,
    approveProduccionTallerRegistro,
    dependenciesError,
    dateEditPolicy,
    dateFilter,
    equiposActivos,
    entryActionError,
    entryDeleteLoadingById,
    entryUpdateLoadingById,
    fechaResumen,
    fechasOrdenadas,
    formData,
    formError,
    getLosasDisponiblesParaAccion,
    getDatePolicy,
    groupedByDate,
    handleSubmit,
    isDialogOpen,
    loadingDependencies,
    bloquesActivosMonoHilo,
    monoHiloMasas,
    setMonoHiloMasas,
    origenesActivosByAccion,
    origenesActivosResumen,
    prepareNewForm,
    produccion,
    removeUsage,
    resetFormAndClose,
    resumenAcciones,
    resumenPartidas,
    searchTerm,
    setDateFilter,
    setFormData,
    setIsDialogOpen,
    setSearchTerm,
    stockProcesoDisponible,
    topOrigenesResumen,
    today,
    totalLosasResumen,
    tallerApprovalLoadingById,
    totalM2Resumen,
    toggleUsageDimension,
    trabajadoresActivos,
    resolveOrigenCodigo,
    resolveEquipoCodigo,
    setEntryActionError,
    updateProduccionRegistro,
    updateUsage,
    updateUsageDimension,
  }
}
