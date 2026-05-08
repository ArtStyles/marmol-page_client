'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  approveProduccionAlmacen,
  cancelMonoHiloProduccion,
  approveProduccionTaller,
  createProduccion,
  deleteProduccion,
  getBloques,
  getEquipos,
  getMonoHiloMasas,
  getProductos,
  registerMonoHiloProduccion,
  getTrabajadores,
  updateProduccion,
} from '@/lib/resources-api'
import { useProduccionStore } from '@/hooks/use-produccion'
import { getBloqueCodigo } from '@/lib/bloque-codigo'
import {
  DIMENSIONES_PISO,
  isPlanchaDimension,
  isValidDimension,
  losasAMetros,
  normalizeDimension,
  PLANCHA_DIMENSION,
  PLANCHA_DIMENSIONES,
  TIPO_EQUIPO_POR_ACCION,
  type AccionLosa,
  type BloqueOLote,
  type Dimension,
  type Equipo,
  type MonoHiloMasa,
  type Producto,
  type ProduccionDetalleAccion,
  type ProduccionDiaria,
  type TipoProducto,
  type Trabajador,
} from '@/lib/types'
import { ADMIN_STORAGE_KEY, hasPermission, type AdminUser } from '@/lib/admin-auth'
import type {
  ActionUsageComboOption,
  ActionUsageDimensionForm,
  ActionUsageForm,
  FormData,
  PicarUsageOption,
  RegistrarMonoHiloDesdeProduccionInput,
} from '../model/types'
import {
  actionLabels,
  createInitialFormData,
  createUsageDimensionRow,
  createUsageRow,
  getAccionLosas,
  getDetalleMermaLosas,
  getDetalleReutilizableLosas,
  isProduccionAnulada,
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
const BASE_DIMENSION_OPTIONS: Dimension[] = [...DIMENSIONES_PISO, ...PLANCHA_DIMENSIONES]
const isPlanchaDimensionAllowed = (dimension: Dimension): boolean =>
  isPlanchaDimension(dimension)

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
    dimensionBase: null,
    costo: 0,
    costoTransporte: 0,
    metrosComprados: 0,
    fechaIngreso: '',
    proveedor: '',
    canteraOrigen: '',
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
  if (tipo === 'Plancha') {
    return isPlanchaDimensionAllowed(dimension) ? dimension : PLANCHA_DIMENSION
  }
  return dimension
}

const isMonoHiloRegistro = (registro: Pick<ProduccionDiaria, 'workflowTipo'>): boolean =>
  registro.workflowTipo === 'mono_hilo'

const isMonoHiloMasaActiva = (masa: MonoHiloMasa): boolean => masa.estado !== 'anulada'

export const useProduccionPageState = () => {
  const { produccion, replaceProduccion, reload: reloadProduccion } = useProduccionStore()
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
  const mountedRef = useRef(true)
  const dimensionOptions = useMemo(() => {
    const collected = new Set<Dimension>(BASE_DIMENSION_OPTIONS)

    productos.forEach((producto) => collected.add(normalizeDimension(producto.dimension)))
    produccion.forEach((registro) => collected.add(normalizeDimension(registro.dimension)))
    monoHiloMasas.forEach((masa) => {
      Object.keys(masa.estimados).forEach((dimension) => {
        if (isValidDimension(dimension)) {
          collected.add(normalizeDimension(dimension))
        }
      })
    })

    return Array.from(collected)
  }, [monoHiloMasas, produccion, productos])
  const monoHiloDimensions = useMemo(() => {
    const collected = new Set<Dimension>(dimensionOptions)

    monoHiloMasas.forEach((masa) => {
      Object.keys(masa.estimados).forEach((dimension) => {
        if (isValidDimension(dimension)) {
          collected.add(normalizeDimension(dimension))
        }
      })
    })

    return Array.from(collected)
  }, [dimensionOptions, monoHiloMasas])

  const loadDependencies = useCallback(async () => {
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

      if (!mountedRef.current) return
      setBloquesYLotes(bloquesData)
      setMonoHiloMasas(monoHiloData)
      setProductos(productosData)
      setEquipos(equiposData)
      setTrabajadores(trabajadoresData)
    } catch (error) {
      if (!mountedRef.current) return
      setDependenciesError(
        error instanceof Error ? error.message : 'No se pudieron cargar catalogos de produccion.',
      )
    } finally {
      if (mountedRef.current) setLoadingDependencies(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    void loadDependencies()

    return () => {
      mountedRef.current = false
    }
  }, [loadDependencies])

  const reloadProduccionContext = useCallback(async () => {
    await Promise.all([reloadProduccion(), loadDependencies()])
  }, [loadDependencies, reloadProduccion])

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
  const monoHiloMasasActivas = useMemo(
    () => monoHiloMasas.filter((masa) => isMonoHiloMasaActiva(masa)),
    [monoHiloMasas],
  )
  const produccionActiva = useMemo(
    () => produccion.filter((registro) => !isProduccionAnulada(registro)),
    [produccion],
  )

  const stockMonoHiloPorClave = useMemo(() => {
    const map = new Map<string, number>()

    for (const masa of monoHiloMasasActivas) {
      if (masa.ubicacion !== 'proceso') continue

    for (const dimension of monoHiloDimensions) {
        const disponibles = getMonoHiloLosasDisponibles(masa, dimension)
        if (disponibles <= 0) continue

        const key = `${masa.bloqueId}::${dimension}`
        map.set(key, (map.get(key) ?? 0) + disponibles)
      }
    }

    return map
  }, [monoHiloMasasActivas])

  const stockMonoHiloPorMasaDimension = useMemo(() => {
    const map = new Map<string, number>()

    for (const masa of monoHiloMasasActivas) {
      if (masa.ubicacion !== 'proceso') continue

      for (const dimension of monoHiloDimensions) {
        const disponibles = getMonoHiloLosasDisponibles(masa, dimension)
        if (disponibles <= 0) continue
        map.set(`${masa.id}::${dimension}`, disponibles)
      }
    }

    return map
  }, [monoHiloMasasActivas])

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

  const picarUsageOptions = useMemo<PicarUsageOption[]>(() => {
    const bloquesPorId = new Map(bloquesYLotes.map((bloque) => [bloque.id, bloque]))
    const origenesPermitidos = new Set(origenesActivosParaPicar.map((bloque) => bloque.id))
    const options: PicarUsageOption[] = []
    const tiposPorDimension = (dimension: Dimension): TipoProducto[] =>
      isPlanchaDimensionAllowed(dimension) ? ['Piso', 'Plancha'] : ['Piso']

    for (const masa of monoHiloMasasActivas) {
      if (masa.ubicacion !== 'proceso') continue
      if (!origenesPermitidos.has(masa.bloqueId)) continue

      const bloque = bloquesPorId.get(masa.bloqueId)
      const origenCodigo = bloque
        ? getBloqueCodigo(bloque)
        : masa.bloqueCodigo.trim() || masa.bloqueNombre.trim() || 'SIN-BLOQUE'

    for (const dimension of monoHiloDimensions) {
        const disponibleLosas = getMonoHiloLosasDisponibles(masa, dimension)
        if (disponibleLosas <= 0) continue

        const masaCodigo = masa.codigo.trim() || 'SIN-MASA'

        for (const tipo of tiposPorDimension(dimension)) {
          options.push({
            value: `${masa.id}::${tipo}::${dimension}`,
            masaId: masa.id,
            masaCodigo,
            origenId: masa.bloqueId,
            origenCodigo,
            tipo,
            dimension,
            disponibleLosas,
          })
        }
      }
    }

    return options.sort((a, b) => {
      const origenCompare = a.origenCodigo.localeCompare(b.origenCodigo)
      if (origenCompare !== 0) return origenCompare

      const masaCompare = a.masaCodigo.localeCompare(b.masaCodigo)
      if (masaCompare !== 0) return masaCompare

      const tipoCompare = a.tipo.localeCompare(b.tipo)
      if (tipoCompare !== 0) return tipoCompare

      return a.dimension.localeCompare(b.dimension)
    })
  }, [bloquesYLotes, monoHiloMasasActivas, origenesActivosParaPicar])

  const stockProcesoPorClave = useMemo(() => {
    const map = new Map<string, number>()
    for (const producto of stockProcesoDisponible) {
      const key = `${producto.origenId}::${producto.tipo}::${producto.dimension}::${producto.estado}`
      map.set(key, (map.get(key) ?? 0) + producto.cantidadLosas)
    }
    return map
  }, [stockProcesoDisponible])

  const usageComboOptionsByAccion = useMemo<Record<AccionLosa, ActionUsageComboOption[]>>(() => {
    const bloquesPorId = new Map(bloquesYLotes.map((bloque) => [bloque.id, bloque]))

    const buildProcessOptions = (
      accion: 'escuadrar' | 'devastar' | 'resinar' | 'pulir',
    ): ActionUsageComboOption[] => {
      const estadoRequerido = estadoProcesoRequeridoPorAccion[accion]
      const optionsByKey = new Map<string, ActionUsageComboOption>()

      stockProcesoDisponible
        .filter((producto) => producto.estado === estadoRequerido)
        .forEach((producto) => {
          const origen = buildPseudoOrigen(
            producto.origenId,
            producto.origenNombre,
            bloquesPorId.get(producto.origenId),
          )
          const dimension = resolveDimensionByTipo(producto.tipo, producto.dimension)
          const key = `${producto.origenId}::${producto.tipo}::${dimension}`

          const existing = optionsByKey.get(key)
          if (existing) {
            existing.disponibleLosas += producto.cantidadLosas
            return
          }

          optionsByKey.set(key, {
            value: key,
            origenId: producto.origenId,
            origenCodigo: getBloqueCodigo(origen),
            tipo: producto.tipo,
            dimension,
            disponibleLosas: producto.cantidadLosas,
          })
        })

      return Array.from(optionsByKey.values()).sort((a, b) => {
        const origenCompare = a.origenCodigo.localeCompare(b.origenCodigo)
        if (origenCompare !== 0) return origenCompare

        const tipoCompare = a.tipo.localeCompare(b.tipo)
        if (tipoCompare !== 0) return tipoCompare

        return a.dimension.localeCompare(b.dimension)
      })
    }

    return {
      picar: [],
      escuadrar: buildProcessOptions('escuadrar'),
      devastar: buildProcessOptions('devastar'),
      resinar: buildProcessOptions('resinar'),
      pulir: buildProcessOptions('pulir'),
    }
  }, [bloquesYLotes, stockProcesoDisponible])

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

    const baseDimension =
      uso.dimensiones.find((item) => isPlanchaDimensionAllowed(item.dimension)) ?? uso.dimensiones[0]
    if (!baseDimension) {
      return {
        ...uso,
        dimensiones: [createUsageDimensionRow(PLANCHA_DIMENSION)],
      }
    }

    const normalizedDimension = isPlanchaDimensionAllowed(baseDimension.dimension)
      ? baseDimension.dimension
      : PLANCHA_DIMENSION

    if (baseDimension.dimension === normalizedDimension && uso.dimensiones.length === 1) {
      return uso
    }

    return {
      ...uso,
      dimensiones: [{ ...baseDimension, dimension: normalizedDimension }],
    }
  }, [])

  const getLosasDisponiblesParaAccion = useCallback(
    (
      accion: AccionLosa,
      origenId: string,
      tipo: ProduccionDiaria['tipo'] | '',
      dimension: ProduccionDiaria['dimension'],
      masaId?: string,
    ): number | null => {
      if (!origenId) return null

      if (accion === 'picar') {
        const resolveDisponibilidadMonoHilo = (dimensionItem: ProduccionDiaria['dimension']): number => {
          if (tipo === 'Plancha' && !isPlanchaDimensionAllowed(dimensionItem)) return 0

          if (masaId) {
            return stockMonoHiloPorMasaDimension.get(`${masaId}::${dimensionItem}`) ?? 0
          }

          return stockMonoHiloPorClave.get(`${origenId}::${dimensionItem}`) ?? 0
        }

        if (!tipo) {
      return monoHiloDimensions.reduce(
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
        if (tipoItem === 'Plancha' && !isPlanchaDimensionAllowed(dimensionItem)) return 0
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
    [stockMonoHiloPorClave, stockMonoHiloPorMasaDimension, stockProcesoPorClave],
  )

  const filteredProduccion = produccionActiva.filter((registro) => {
    const query = searchTerm.toLowerCase().trim()
    const monoHiloSearch = isMonoHiloRegistro(registro)
      ? [
          'mono hilo',
          registro.monoHiloDetalle?.equipoNombre ?? '',
          ...(registro.monoHiloDetalle?.trabajadores.map((trabajador) => trabajador.nombre) ?? []),
          ...(registro.monoHiloDetalle?.masas.map((masa) => masa.masaCodigo) ?? []),
        ]
          .join(' ')
          .toLowerCase()
      : ''
    const matchesSearch =
      query.length === 0 ||
      registro.fecha.toLowerCase().includes(query) ||
      registro.origenNombre.toLowerCase().includes(query) ||
      registro.tipo.toLowerCase().includes(query) ||
      registro.dimension.toLowerCase().includes(query) ||
      monoHiloSearch.includes(query)
    const matchesDate = !dateFilter || registro.fecha === dateFilter
    return matchesSearch && matchesDate
  })

  const today = new Date().toISOString().split('T')[0]
  const fechaMasReciente = [...new Set(produccionActiva.map((registro) => registro.fecha))]
    .sort((a, b) => b.localeCompare(a))[0] ?? today
  const fechaResumen = dateFilter || fechaMasReciente
  const produccionResumen = produccionActiva.filter((registro) => registro.fecha === fechaResumen)

  const totalM2Resumen = produccionResumen.reduce((sum, item) => sum + item.totalM2, 0)
  const totalLosasResumen = produccionResumen.reduce((sum, item) => sum + item.totalLosas, 0)
  const totalMonoHiloResumen = produccionResumen.reduce(
    (sum, item) => sum + (isMonoHiloRegistro(item) ? (item.monoHiloDetalle?.masas.length ?? 0) : 0),
    0,
  )
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
    () => resolveDateEditPolicy(produccionActiva, formData.fecha),
    [produccionActiva, formData.fecha],
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
      const primeraOpcionPicar = picarUsageOptions[0]
      const primeraOpcionCombo = usageComboOptionsByAccion[accionInicial][0]
      nextForm.accionActiva = accionInicial
      if (accionInicial === 'picar' && primeraOpcionPicar) {
        nextForm.acciones[accionInicial].usos = [
          {
            ...nextForm.acciones[accionInicial].usos[0],
            masaId: primeraOpcionPicar.masaId,
            origenId: primeraOpcionPicar.origenId,
            tipo: primeraOpcionPicar.tipo,
            dimensiones: [createUsageDimensionRow(primeraOpcionPicar.dimension)],
          },
        ]
      } else if (primeraOpcionCombo) {
        nextForm.acciones[accionInicial].usos = [
          {
            ...nextForm.acciones[accionInicial].usos[0],
            masaId: '',
            origenId: primeraOpcionCombo.origenId,
            tipo: primeraOpcionCombo.tipo,
            dimensiones: [createUsageDimensionRow(primeraOpcionCombo.dimension)],
          },
        ]
      } else if (primerOrigen) {
        const dimensionInicial =
          (PROCESS_ACTIONS.includes(accionInicial) || accionInicial === 'picar')
        ? dimensionOptions.find(
                (dimension) =>
                  (getLosasDisponiblesParaAccion(accionInicial, primerOrigen.id, '', dimension, '') ?? 0) > 0,
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
      if (accion !== 'picar' && !PROCESS_ACTIONS.includes(accion)) return dimensionOptions
      if (!uso.origenId) return dimensionOptions

      const disponibles = dimensionOptions.filter(
        (dimension) =>
          (getLosasDisponiblesParaAccion(accion, uso.origenId, uso.tipo, dimension, uso.masaId) ?? 0) > 0,
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
          (
            getLosasDisponiblesParaAccion(
              accion,
              usoNormalizado.origenId,
              usoNormalizado.tipo,
              dimension,
              usoNormalizado.masaId,
            ) ?? 0
          ) <= 0
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
    if (accion === 'picar') {
      const primeraOpcionPicar = picarUsageOptions[0]
      const usoPicar: ActionUsageForm = primeraOpcionPicar
        ? {
            ...createUsageRow(),
            masaId: primeraOpcionPicar.masaId,
            origenId: primeraOpcionPicar.origenId,
            tipo: primeraOpcionPicar.tipo,
            dimensiones: [createUsageDimensionRow(primeraOpcionPicar.dimension)],
          }
        : createUsageRow()

      setFormData((prev) => ({
        ...prev,
        acciones: {
          ...prev.acciones,
          [accion]: {
            ...prev.acciones[accion],
            usos: [...prev.acciones[accion].usos, usoPicar],
            cantidadTouched: true,
          },
        },
      }))
      return
    }

    const primeraOpcionCombo = usageComboOptionsByAccion[accion][0]
    if (primeraOpcionCombo) {
      const usoCombo: ActionUsageForm = {
        ...createUsageRow(),
        masaId: '',
        origenId: primeraOpcionCombo.origenId,
        tipo: primeraOpcionCombo.tipo,
        dimensiones: [createUsageDimensionRow(primeraOpcionCombo.dimension)],
      }

      setFormData((prev) => ({
        ...prev,
        acciones: {
          ...prev.acciones,
          [accion]: {
            ...prev.acciones[accion],
            usos: [...prev.acciones[accion].usos, usoCombo],
            cantidadTouched: true,
          },
        },
      }))
      return
    }

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
      const primeraOpcionPicar = picarUsageOptions[0]
      const primeraOpcionCombo = usageComboOptionsByAccion[accion][0]
      const usoFallback: ActionUsageForm =
        accion === 'picar' && primeraOpcionPicar
          ? {
              ...createUsageRow(),
              masaId: primeraOpcionPicar.masaId,
              origenId: primeraOpcionPicar.origenId,
              tipo: primeraOpcionPicar.tipo,
              dimensiones: [createUsageDimensionRow(primeraOpcionPicar.dimension)],
            }
          : primeraOpcionCombo
            ? {
                ...createUsageRow(),
                masaId: '',
                origenId: primeraOpcionCombo.origenId,
                tipo: primeraOpcionCombo.tipo,
                dimensiones: [createUsageDimensionRow(primeraOpcionCombo.dimension)],
              }
          : createUsageRow()

      return {
        ...prev,
        acciones: {
          ...prev.acciones,
          [accion]: {
            ...prev.acciones[accion],
            usos: usosFiltrados.length > 0 ? usosFiltrados : [usoFallback],
            cantidadLosas: usosFiltrados.reduce((sum, uso) => sum + getUsageLosas(uso), 0),
            cantidadTouched: true,
          },
        },
      }
    })
  }

  const registrarMonoHiloDesdeProduccion = useCallback(
    async (input: RegistrarMonoHiloDesdeProduccionInput): Promise<MonoHiloMasa[]> => {
      if (!input.fecha) {
        throw new Error('Selecciona la fecha de produccion.')
      }

      if (input.fecha > today) {
        throw new Error('La fecha de produccion no puede ser futura.')
      }

      const bloqueId = input.bloqueId.trim()
      if (!bloqueId) {
        throw new Error('Selecciona el bloque de origen.')
      }

      const bloque = bloquesActivosMonoHilo.find((item) => item.id === bloqueId)
      if (!bloque) {
        throw new Error('El bloque seleccionado no esta activo para mono hilo.')
      }

      if (input.largoCm <= 0 || input.anchoCm <= 0 || input.profundidadCm <= 0) {
        throw new Error('Largo, ancho y profundidad deben ser mayores a 0.')
      }

      const equipo = equiposActivos.find((item) => item.id === input.equipoId)
      if (!equipo) {
        throw new Error('Selecciona un equipo activo.')
      }

      const trabajadoresSeleccionados = [...new Set(input.trabajadorIds)]
        .map((trabajadorId) => trabajadoresActivos.find((item) => item.id === trabajadorId))
        .filter((trabajador): trabajador is Trabajador => Boolean(trabajador))

      if (trabajadoresSeleccionados.length === 0) {
        throw new Error('Selecciona al menos un trabajador.')
      }

      if (trabajadoresSeleccionados.length !== new Set(input.trabajadorIds).size) {
        throw new Error('Uno de los trabajadores seleccionados no esta activo.')
      }

      const registro = await registerMonoHiloProduccion({
        fecha: input.fecha,
        bloqueId: bloque.id,
        largoCm: input.largoCm,
        anchoCm: input.anchoCm,
        profundidadCm: input.profundidadCm,
        observaciones: input.observaciones?.trim() || undefined,
        equipoId: equipo.id,
        trabajadorIds: trabajadoresSeleccionados.map((trabajador) => trabajador.id),
      })

      setMonoHiloMasas((prev) => {
        const ids = new Set(registro.masas.map((item) => item.id))
        return [...registro.masas, ...prev.filter((item) => !ids.has(item.id))]
      })
      replaceProduccion((prev) => [registro.produccion, ...prev])
      await reloadProduccionContext().catch(() => undefined)

      return registro.masas
    },
    [
      bloquesActivosMonoHilo,
      equiposActivos,
      reloadProduccionContext,
      replaceProduccion,
      today,
      trabajadoresActivos,
    ],
  )

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

          if (tipoUso === 'Plancha' && !isPlanchaDimensionAllowed(dimensionUso.dimension)) {
      setFormError('Plancha solo permite medidas validas distintas a los formatos de piso.')
            return
          }

          const dimensionUsoReal = resolveDimensionByTipo(tipoUso, dimensionUso.dimension)
          const masaSeleccionada =
            accion === 'picar'
              ? picarUsageOptions.find(
                  (option) =>
                    option.masaId === usoNormalizado.masaId &&
                    option.origenId === usoNormalizado.origenId &&
                    option.tipo === tipoUso &&
                    option.dimension === dimensionUsoReal,
                ) ?? picarUsageOptions.find((option) => option.masaId === usoNormalizado.masaId)
              : undefined

          if (accion === 'picar') {
            if (!usoNormalizado.masaId) {
              setFormError('Selecciona la masa de mono hilo para picar.')
              return
            }

            const stockKeyMonoHilo = `${usoNormalizado.masaId}::${dimensionUsoReal}`
            const disponibleMonoHilo = stockMonoHiloPorMasaDimension.get(stockKeyMonoHilo) ?? 0
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

            if (!masaSeleccionada) {
              setFormError('No se pudo resolver la masa seleccionada para registrar el picado.')
              return
            }
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
            masaId: accion === 'picar' ? usoNormalizado.masaId : undefined,
            masaCodigo: accion === 'picar' ? masaSeleccionada?.masaCodigo : undefined,
            observacion: accion === 'picar' ? usoNormalizado.observacion.trim() || undefined : undefined,
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
        try {
          const created = await createProduccion(payload)
          createdRecords.push(created)
        } catch (error) {
          if (createdRecords.length > 0) {
            replaceProduccion((prev) => [
              ...createdRecords,
              ...prev.filter((registro) => !createdRecords.some((created) => created.id === registro.id)),
            ])
            await reloadProduccionContext().catch(() => undefined)
          }

          const baseMessage =
            error instanceof Error
              ? error.message
              : 'No se pudo registrar la produccion en el backend.'
          setFormError(
            createdRecords.length > 0
              ? `${baseMessage} Se registraron ${createdRecords.length} entrada(s) antes del error.`
              : baseMessage,
          )
          return
        }
      }

      replaceProduccion((prev) => [...createdRecords, ...prev])
      await reloadProduccionContext().catch(() => undefined)
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
      await reloadProduccionContext().catch(() => undefined)

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
      await reloadProduccionContext().catch(() => undefined)

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
      await reloadProduccionContext().catch(() => undefined)
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
      await reloadProduccionContext().catch(() => undefined)
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

  const cancelMonoHiloProduccionRegistro = async (
    produccionId: string,
    motivo: string,
  ): Promise<boolean> => {
    setEntryActionError(null)
    setEntryDeleteLoadingById((prev) => ({ ...prev, [produccionId]: true }))

    try {
      const result = await cancelMonoHiloProduccion(produccionId, { motivo })
      replaceProduccion((prev) =>
        prev.map((registro) => (registro.id === result.produccion.id ? result.produccion : registro)),
      )
      setMonoHiloMasas((prev) => {
        const masasById = new Map(prev.map((masa) => [masa.id, masa]))
        result.masas.forEach((masa) => {
          masasById.set(masa.id, masa)
        })
        return Array.from(masasById.values())
      })
      await reloadProduccionContext().catch(() => undefined)
      return true
    } catch (error) {
      setEntryActionError(
        error instanceof Error ? error.message : 'No se pudo anular el registro de mono hilo.',
      )
      return false
    } finally {
      setEntryDeleteLoadingById((prev) => ({ ...prev, [produccionId]: false }))
    }
  }

  const getDatePolicy = (fecha: string) => resolveDateEditPolicy(produccionActiva, fecha)

  return {
    addUsage,
    almacenApprovalLoadingById,
    approvalError,
    cancelMonoHiloProduccionRegistro,
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
    registrarMonoHiloDesdeProduccion,
    origenesActivosByAccion,
    picarUsageOptions,
    usageComboOptionsByAccion,
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
    totalMonoHiloResumen,
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

