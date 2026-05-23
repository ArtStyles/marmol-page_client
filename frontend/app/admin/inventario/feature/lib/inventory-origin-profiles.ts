import { getBloqueCodigo } from '@/lib/bloque-codigo'
import {
  DIMENSIONES_PISO,
  isPlanchaDimension,
  getMonoHiloLosasDisponibles,
  hasMonoHiloRemainingRemanentes,
  losasAMetros,
  type AccionLosa,
  type BloqueOLote,
  type ConfiguracionSistema,
  type Dimension,
  type EstadoInventario,
  type Gasto,
  type Merma,
  type MonoHiloMasa,
  type PisoDimension,
  type Producto,
  type ProduccionDetalleAccion,
  type ProduccionDiaria,
  type ProduccionTrabajador,
  type Venta,
  type VentaDetalleProducto,
} from '@/lib/types'

const ACTION_ORDER: AccionLosa[] = ['picar', 'escuadrar', 'devastar', 'resinar', 'pulir']

const STATE_ORDER: Producto['estado'][] = [
  'Picado',
  'Escuadrado',
  'Devastado',
  'Resinado',
  'Pulido',
]

export const INVENTORY_ORIGIN_DIMENSION_ORDER: Dimension[] = ['80x40', '60x40', '40x40']

const FLOOR_DIMENSION_ORDER: PisoDimension[] = ['80x40', '60x40', '40x40']
const ANALYSIS_STATE_ORDER = ['Crudo', 'Escuadrado', 'Pulido'] as const

const STATE_BY_ACTION: Record<AccionLosa, Producto['estado']> = {
  picar: 'Picado',
  escuadrar: 'Escuadrado',
  devastar: 'Devastado',
  resinar: 'Resinado',
  pulir: 'Pulido',
}

const FICHA_STATE_BY_ACTION = {
  picar: 'Crudo',
  escuadrar: 'Escuadrado',
  devastar: 'Crudo',
  resinar: 'Crudo',
  pulir: 'Pulido',
} as const satisfies Record<AccionLosa, 'Crudo' | 'Escuadrado' | 'Pulido'>

const ANALYSIS_STATE_BY_INVENTORY_STATE: Partial<
  Record<EstadoInventario, 'Crudo' | 'Escuadrado' | 'Pulido'>
> = {
  Picado: 'Crudo',
  Escuadrado: 'Escuadrado',
  Pulido: 'Pulido',
}

const round2 = (value: number): number => Number(value.toFixed(2))

const resolveProductType = (dimension: Dimension): Producto['tipo'] =>
  isPlanchaDimension(dimension) ? 'Plancha' : 'Piso'

type SimplifiedFichaState = (typeof FICHA_STATE_BY_ACTION)[AccionLosa]
type AnalysisState = (typeof ANALYSIS_STATE_ORDER)[number]

type NormalizedProductionDetail = {
  action: AccionLosa
  slabs: number
  m2: number
  resinQty: number
}

export type InventoryOriginStateRow = {
  state: Producto['estado']
  slabs: number
  m2: number
}

export type InventoryOriginDimensionStockRow = {
  dimension: Dimension
  productType: Producto['tipo']
  slabs: number
  m2: number
  averagePriceM2: number
}

export type InventoryOriginProjectionRow = {
  dimension: Dimension
  productType: Producto['tipo']
  massCount: number
  averageLengthM: number
  totalLengthM: number
  estimatedSlabs: number
  estimatedM2: number
}

export type InventoryOriginProductionRow = {
  dimension: Dimension
  state: Producto['estado']
  slabs: number
  m2: number
}

export type InventoryOriginComparisonRow = {
  dimension: Dimension
  estimatedM2: number
  realM2: number
}

export type InventoryOriginMassRow = {
  id: string
  code: string
  date: string
  lengthCm: number
  widthCm: number
  depthCm: number
  location: MonoHiloMasa['ubicacion']
  observation: string
  estimatedByDimension: Array<{
    dimension: Dimension
    estimatedSlabs: number
    availableSlabs: number
    estimatedWastePercent: number
  }>
}

export type InventoryOriginMassRegisterRow = {
  massId: string
  massCode: string
  productType: Producto['tipo']
  dimension: Dimension
  lengthM: number
  estimatedSlabs: number
  estimatedM2: number
}

export type InventoryOriginMassControlRow = {
  id: string
  fecha: string
  massId: string
  massCode: string
  dimension: Dimension
  producedSlabs: number
  producedM2: number
  responsible: string
  observation: string
}

export type InventoryOriginFloorProductionRow = {
  dimension: PisoDimension
  crudoSlabs: number
  crudoM2: number
  escuadradoSlabs: number
  escuadradoM2: number
  pulidoSlabs: number
  pulidoM2: number
  totalM2: number
}

export type InventoryOriginSlabProductionRow = {
  dimension: Dimension
  units: number
  m2: number
  observation: string
}

export type InventoryOriginWasteRow = {
  dimension: Dimension
  wasteType: string
  totalM2: number
  recoveredM2: number
  lossM2: number
}

export type InventoryOriginMassEvaluationRow = {
  id: string
  massCode: string
  quality: 'Alta' | 'Media' | 'Baja' | 'Sin evaluar'
  productionObtained: string
  equivalentM2: number
  observation: string
}

export type InventoryOriginMassClosureRow = {
  id: string
  massCode: string
  initialDimension: Dimension | null
  estimatedSlabs: number
  realProducedSlabs: number
  realProducedM2: number
  differenceSlabs: number
  closureDate: string | null
  observation: string
}

export type InventoryOriginDirectExpenseItem = {
  id: string
  label: string
  amount: number
}

export type InventoryOriginStateAnalysisRow = {
  state: AnalysisState
  soldM2: number
  totalRevenue: number
  appliedCostPerM2: number
  estimatedCost: number
  estimatedProfit: number
  profitPerM2: number | null
  isBestTotalProfit: boolean
  isBestProfitPerM2: boolean
}

export type InventoryOriginStateAnalysis = {
  available: boolean
  reason: string | null
  rows: InventoryOriginStateAnalysisRow[]
  costInputs: ConfiguracionSistema['costosAnalisisEstado']
}

export type InventoryOriginProfile = {
  originId: string
  originName: string
  code: string
  entryDate: string
  provider: string
  blockType: BloqueOLote['tipo'] | null
  blockStatus: BloqueOLote['estado'] | null
  baseDimension: Dimension | null
  block: BloqueOLote | null
  visibleProducts: Producto[]
  allProducts: Producto[]
  visibleItemsCount: number
  totalVisibleSlabs: number
  totalVisibleM2: number
  totalStockSlabs: number
  totalStockM2: number
  totalStockValue: number
  massCount: number
  totalMassLengthM: number
  averageMassLengthM: number
  responsibleNames: string[]
  stateRows: InventoryOriginStateRow[]
  stockByDimensionRows: InventoryOriginDimensionStockRow[]
  projectionRows: InventoryOriginProjectionRow[]
  productionRows: InventoryOriginProductionRow[]
  comparisonRows: InventoryOriginComparisonRow[]
  massRows: InventoryOriginMassRow[]
  notes: string[]
  ficha: {
    closureDate: string | null
    productionType: string
    massRegisterRows: InventoryOriginMassRegisterRow[]
    massControlRows: InventoryOriginMassControlRow[]
    massClosureRows: InventoryOriginMassClosureRow[]
    floorRows: InventoryOriginFloorProductionRow[]
    floorTotals: {
      crudoM2: number
      escuadradoM2: number
      pulidoM2: number
      totalM2: number
    }
    slabRows: InventoryOriginSlabProductionRow[]
    wasteRows: InventoryOriginWasteRow[]
    massEvaluationRows: InventoryOriginMassEvaluationRow[]
    otherDirectExpenseItems: InventoryOriginDirectExpenseItem[]
    stateAnalysis: InventoryOriginStateAnalysis
  }
  summary: {
    initialCost: number
    transportCost: number
    totalInitialCost: number
    laborCost: number
    laborEntries: number
    resinQty: number
    resinEntries: number
    resinCost: number
    otherDirectCost: number
    totalDirectCost: number
    totalOperationalRecorded: number
    totalInvestedRecorded: number
    estimatedM2: number
    floorEstimatedM2: number
    slabEstimatedM2: number
    realM2: number
    floorRealM2: number
    slabRealM2: number
    generalRealM2: number
    differenceM2: number
    yieldRatio: number | null
    averageCostM2: number | null
    purchasedM2: number
    purchasedEquivalentM2: number | null
    vendibleM2: number
    producedSlabs: number
    lostSlabs: number
    recordedGain: number
    productionEntries: number
    wasteTotalM2: number
    wasteRecoveredM2: number
    wasteLossM2: number
  }
}

type BuildInventoryOriginProfilesInput = {
  blocks: BloqueOLote[]
  allProducts: Producto[]
  visibleProducts: Producto[]
  produccion: ProduccionDiaria[]
  produccionTrabajadores: ProduccionTrabajador[]
  monoHiloMasas: MonoHiloMasa[]
  mermas: Merma[]
  gastos: Gasto[]
  ventas: Venta[]
  config: Pick<ConfiguracionSistema, 'costosAnalisisEstado' | 'costoResinaLitro'>
  salesAnalysisEnabled: boolean
  resolveOriginCode: (originId: string, originName: string) => string
}

function getVentaDetalles(venta: Venta): VentaDetalleProducto[] {
  if (venta.detallesProductos && venta.detallesProductos.length > 0) {
    return venta.detallesProductos
  }

  return []
}

function resolveVentaDetalleM2(detalle: VentaDetalleProducto): number {
  if (detalle.metrosCuadrados > 0) {
    return round2(detalle.metrosCuadrados)
  }

  if ((detalle.cantidadUnidades ?? 0) > 0) {
    return round2(losasAMetros(detalle.cantidadUnidades ?? 0, detalle.dimension))
  }

  return 0
}

function buildStateAnalysis(params: {
  enabled: boolean
  originId: string
  ventas: Venta[]
  config: Pick<ConfiguracionSistema, 'costosAnalisisEstado'>
}): InventoryOriginStateAnalysis {
  const costInputs = {
    crudo: round2(params.config.costosAnalisisEstado.crudo),
    escuadrado: round2(params.config.costosAnalisisEstado.escuadrado),
    pulido: round2(params.config.costosAnalisisEstado.pulido),
  }

  const appliedCostsByState: Record<AnalysisState, number> = {
    Crudo: round2(costInputs.crudo),
    Escuadrado: round2(costInputs.crudo + costInputs.escuadrado),
    Pulido: round2(costInputs.crudo + costInputs.escuadrado + costInputs.pulido),
  }

  const requiredCostKeysByState: Record<
    AnalysisState,
    Array<keyof ConfiguracionSistema['costosAnalisisEstado']>
  > = {
    Crudo: ['crudo'],
    Escuadrado: ['crudo', 'escuadrado'],
    Pulido: ['crudo', 'escuadrado', 'pulido'],
  }

  const aggregated = new Map<AnalysisState, { soldM2: number; totalRevenue: number }>()
  let matchedDetailCount = 0

  params.ventas
    .filter((venta) => venta.estado !== 'cancelada')
    .forEach((venta) => {
      getVentaDetalles(venta)
        .filter((detalle) => detalle.origenId.trim() === params.originId)
        .forEach((detalle) => {
          const state = ANALYSIS_STATE_BY_INVENTORY_STATE[detalle.estado]
          if (!state) return

          const soldM2 = resolveVentaDetalleM2(detalle)
          if (soldM2 <= 0) return

          matchedDetailCount += 1
          const totalRevenue =
            detalle.subtotal > 0 ? round2(detalle.subtotal) : round2(soldM2 * detalle.precioM2)
          const current = aggregated.get(state) ?? { soldM2: 0, totalRevenue: 0 }

          aggregated.set(state, {
            soldM2: round2(current.soldM2 + soldM2),
            totalRevenue: round2(current.totalRevenue + totalRevenue),
          })
        })
    })

  const baseRows = ANALYSIS_STATE_ORDER.map((state) => {
    const sold = aggregated.get(state) ?? { soldM2: 0, totalRevenue: 0 }
    const appliedCostPerM2 = appliedCostsByState[state]
    const estimatedCost = round2(sold.soldM2 * appliedCostPerM2)
    const estimatedProfit = round2(sold.totalRevenue - estimatedCost)

    return {
      state,
      soldM2: round2(sold.soldM2),
      totalRevenue: round2(sold.totalRevenue),
      appliedCostPerM2,
      estimatedCost,
      estimatedProfit,
      profitPerM2: sold.soldM2 > 0 ? round2(estimatedProfit / sold.soldM2) : null,
      isBestTotalProfit: false,
      isBestProfitPerM2: false,
    } satisfies InventoryOriginStateAnalysisRow
  })

  if (!params.enabled) {
    return {
      available: false,
      reason: 'No tienes permisos de ventas para generar este analisis.',
      rows: baseRows,
      costInputs,
    }
  }

  const rowsWithSales = baseRows.filter((row) => row.soldM2 > 0)
  if (matchedDetailCount === 0 || rowsWithSales.length === 0) {
    return {
      available: false,
      reason: 'No hay ventas registradas por estado para este origen.',
      rows: baseRows,
      costInputs,
    }
  }

  const missingCosts = rowsWithSales.some((row) =>
    requiredCostKeysByState[row.state].some((key) => costInputs[key] <= 0),
  )
  if (missingCosts) {
    return {
      available: false,
      reason: 'Configura los costos por estado antes de analizar la rentabilidad del bloque.',
      rows: baseRows,
      costInputs,
    }
  }

  const bestTotalProfit = rowsWithSales.reduce(
    (max, row) => Math.max(max, row.estimatedProfit),
    Number.NEGATIVE_INFINITY,
  )
  const bestProfitPerM2 = rowsWithSales.reduce(
    (max, row) => Math.max(max, row.profitPerM2 ?? Number.NEGATIVE_INFINITY),
    Number.NEGATIVE_INFINITY,
  )

  return {
    available: true,
    reason: null,
    rows: baseRows.map((row) => ({
      ...row,
      isBestTotalProfit: row.soldM2 > 0 && row.estimatedProfit === bestTotalProfit,
      isBestProfitPerM2:
        row.soldM2 > 0 &&
        row.profitPerM2 !== null &&
        row.profitPerM2 === bestProfitPerM2,
    })),
    costInputs,
  }
}

function normalizeProductionDetails(registro: ProduccionDiaria): NormalizedProductionDetail[] {
  const details =
    registro.detallesAcciones
      ?.filter((detalle) => detalle.cantidadLosas > 0)
      .map((detalle) => ({
        action: detalle.accion,
        slabs: detalle.cantidadLosas,
        m2:
          detalle.metrosCuadrados > 0
            ? detalle.metrosCuadrados
            : losasAMetros(detalle.cantidadLosas, registro.dimension),
        resinQty: detalle.cantidadResina ?? 0,
      })) ?? []

  if (details.length > 0) return details

  return ACTION_ORDER.map((action) => {
    const slabs =
      action === 'picar'
        ? registro.cantidadPicar
        : action === 'escuadrar'
          ? registro.cantidadEscuadrar
          : action === 'devastar'
            ? registro.cantidadDevastar
            : action === 'resinar'
              ? registro.cantidadResinar
              : registro.cantidadPulir

    return {
      action,
      slabs,
      m2: slabs > 0 ? losasAMetros(slabs, registro.dimension) : 0,
      resinQty: 0,
    }
  }).filter((detail) => detail.slabs > 0)
}

function buildStateRows(products: Producto[]): InventoryOriginStateRow[] {
  return STATE_ORDER.map((state) => {
    const stateProducts = products.filter((product) => product.estado === state)
    return {
      state,
      slabs: stateProducts.reduce((sum, product) => sum + product.cantidadLosas, 0),
      m2: round2(stateProducts.reduce((sum, product) => sum + product.metrosCuadrados, 0)),
    }
  })
}

function buildStockByDimensionRows(products: Producto[]): InventoryOriginDimensionStockRow[] {
  return INVENTORY_ORIGIN_DIMENSION_ORDER.map((dimension) => {
    const dimensionProducts = products.filter((product) => product.dimension === dimension)
    const slabs = dimensionProducts.reduce((sum, product) => sum + product.cantidadLosas, 0)
    const m2 = dimensionProducts.reduce((sum, product) => sum + product.metrosCuadrados, 0)
    const stockValue = dimensionProducts.reduce(
      (sum, product) => sum + product.metrosCuadrados * product.precioM2,
      0,
    )

    return {
      dimension,
      productType: resolveProductType(dimension),
      slabs,
      m2: round2(m2),
      averagePriceM2: m2 > 0 ? round2(stockValue / m2) : 0,
    }
  })
}

function resolveMermaLabel(action: AccionLosa): string {
  if (action === 'picar') return 'Partida al picar'
  if (action === 'pulir') return 'Partida al pulir'
  return `Partida en ${action}`
}

function resolveLatestDate(values: string[]): string | null {
  let latestValue: string | null = null
  let latestTime = Number.NEGATIVE_INFINITY

  values.forEach((value) => {
    if (!value) return
    const time = new Date(value).getTime()
    if (!Number.isFinite(time)) return
    if (time > latestTime) {
      latestValue = value
      latestTime = time
    }
  })

  return latestValue
}

function resolveProductionTypeLabel(params: {
  productionRows: InventoryOriginProductionRow[]
  massRegisterRows: InventoryOriginMassRegisterRow[]
  baseDimension: Dimension | null
  blockType: BloqueOLote['tipo'] | null
}): string {
  const dimensions = new Set<Dimension>()

  params.productionRows.forEach((row) => dimensions.add(row.dimension))
  params.massRegisterRows.forEach((row) => dimensions.add(row.dimension))
  if (params.baseDimension) dimensions.add(params.baseDimension)

  const detected = Array.from(dimensions)
  const hasFloor = detected.some((dimension) => resolveProductType(dimension) === 'Piso')
  const hasSlab = detected.some((dimension) => resolveProductType(dimension) === 'Plancha')

  if (hasFloor && hasSlab) return 'Mixta'
  if (hasFloor) return 'Piso'
  if (hasSlab) return 'Plancha'
  if (params.blockType === 'Lote' && params.baseDimension) {
    return resolveProductType(params.baseDimension)
  }
  return 'Sin produccion registrada'
}

function resolveMassQuality(
  wastePercent: number,
  estimatedSlabs: number,
): InventoryOriginMassEvaluationRow['quality'] {
  if (estimatedSlabs <= 0) return 'Sin evaluar'
  if (wastePercent <= 12) return 'Alta'
  if (wastePercent <= 22) return 'Media'
  return 'Baja'
}

function resolveDetalleResponsables(
  createdByName: ProduccionDiaria['creadoPorNombre'],
  detalle: ProduccionDetalleAccion,
): string {
  const nombres = detalle?.trabajadores
    ?.map((trabajador) => trabajador.nombre.trim())
    .filter((nombre) => nombre.length > 0)
  if (nombres && nombres.length > 0) {
    return nombres.join(', ')
  }

  const trabajadorPrincipal = detalle?.trabajadorNombre?.trim()
  if (trabajadorPrincipal) {
    return trabajadorPrincipal
  }

  return createdByName?.trim() || 'Sin responsable'
}

function hasMassRemainingAvailability(masa: MonoHiloMasa): boolean {
  return hasMonoHiloRemainingRemanentes(masa)
}

function buildMassClosureObservation(params: {
  dimensions: Dimension[]
  lastObservation: string
  massObservation: string
  closureDate: string | null
}): string {
  const parts: string[] = []

  if (params.dimensions.length > 1) {
    parts.push(`Cambio de dimension: ${params.dimensions.join(' -> ')}.`)
  }

  if (params.lastObservation) {
    parts.push(params.lastObservation)
  } else if (params.massObservation) {
    parts.push(params.massObservation)
  }

  if (params.closureDate) {
    parts.push('Cierre automatico por consumo total registrado.')
  } else if (parts.length === 0) {
    parts.push('Masa aun en proceso o sin observaciones finales.')
  }

  return parts.join(' ')
}

export function buildInventoryOriginProfiles({
  blocks,
  allProducts,
  visibleProducts,
  produccion,
  produccionTrabajadores,
  monoHiloMasas,
  mermas,
  gastos,
  ventas,
  config,
  salesAnalysisEnabled,
  resolveOriginCode,
}: BuildInventoryOriginProfilesInput): InventoryOriginProfile[] {
  const blockById = new Map(blocks.map((block) => [block.id.trim(), block]))
  const originIds = Array.from(new Set(visibleProducts.map((product) => product.origenId.trim())))

  return originIds
    .map((originId) => {
      const block = blockById.get(originId) ?? null
      const visibleProductsForOrigin = visibleProducts.filter(
        (product) => product.origenId.trim() === originId,
      )
      const allProductsForOrigin = allProducts.filter((product) => product.origenId.trim() === originId)
      const productionRecords = produccion.filter((registro) => registro.origenId.trim() === originId)
      const laborRecords = produccionTrabajadores.filter((registro) => registro.origenId.trim() === originId)
      const masses = monoHiloMasas.filter((masa) => masa.bloqueId.trim() === originId)
      const mermasAprobadas = mermas.filter((item) => {
        if (item.origenId.trim() !== originId) return false
        return item.estadoInventario === 'aprobado' || item.estadoInventario == null
      })
      const gastosVinculados = gastos.filter(
        (item) => item.estado === 'activo' && item.referenciaId?.trim() === originId,
      )

      const originName =
        block?.nombre ??
        visibleProductsForOrigin[0]?.origenNombre ??
        allProductsForOrigin[0]?.origenNombre ??
        productionRecords[0]?.origenNombre ??
        originId

      const code = block ? getBloqueCodigo(block) : resolveOriginCode(originId, originName)

      const stateRows = buildStateRows(allProductsForOrigin)
      const stockByDimensionRows = buildStockByDimensionRows(allProductsForOrigin)

      const productionRowMap = new Map<string, InventoryOriginProductionRow>()
      const simplifiedRowsMap = new Map<string, { dimension: Dimension; state: SimplifiedFichaState; slabs: number; m2: number }>()
      let resinQty = 0
      let resinEntries = 0

      productionRecords.forEach((registro) => {
        normalizeProductionDetails(registro).forEach((detail) => {
          const state = STATE_BY_ACTION[detail.action]
          const key = `${registro.dimension}-${state}`
          const current = productionRowMap.get(key)
          if (current) {
            current.slabs += detail.slabs
            current.m2 = round2(current.m2 + detail.m2)
          } else {
            productionRowMap.set(key, {
              dimension: registro.dimension,
              state,
              slabs: detail.slabs,
              m2: round2(detail.m2),
            })
          }

          const fichaState = FICHA_STATE_BY_ACTION[detail.action]
          const fichaKey = `${registro.dimension}-${fichaState}`
          const fichaCurrent = simplifiedRowsMap.get(fichaKey)
          if (fichaCurrent) {
            fichaCurrent.slabs += detail.slabs
            fichaCurrent.m2 = round2(fichaCurrent.m2 + detail.m2)
          } else {
            simplifiedRowsMap.set(fichaKey, {
              dimension: registro.dimension,
              state: fichaState,
              slabs: detail.slabs,
              m2: round2(detail.m2),
            })
          }

          if (detail.resinQty > 0) {
            resinQty += detail.resinQty
            resinEntries += 1
          }
        })
      })

      const productionRows = Array.from(productionRowMap.values()).sort((left, right) => {
        const dimensionDelta =
          INVENTORY_ORIGIN_DIMENSION_ORDER.indexOf(left.dimension) -
          INVENTORY_ORIGIN_DIMENSION_ORDER.indexOf(right.dimension)
        if (dimensionDelta !== 0) return dimensionDelta
        return STATE_ORDER.indexOf(left.state) - STATE_ORDER.indexOf(right.state)
      })

      const totalMassLengthM = masses.reduce((sum, masa) => sum + masa.largoCm / 100, 0)
      const averageMassLengthM = masses.length > 0 ? totalMassLengthM / masses.length : 0

      const projectionRows = INVENTORY_ORIGIN_DIMENSION_ORDER.map((dimension) => {
        const estimatedSlabs = masses.reduce(
          (sum, masa) => sum + (masa.estimados[dimension]?.losasEstimadas ?? 0),
          0,
        )

        return {
          dimension,
          productType: resolveProductType(dimension),
          massCount: masses.length,
          averageLengthM: round2(averageMassLengthM),
          totalLengthM: round2(totalMassLengthM),
          estimatedSlabs,
          estimatedM2: round2(losasAMetros(estimatedSlabs, dimension)),
        }
      })

      const realM2ByDimension = new Map<Dimension, number>()
      productionRows.forEach((row) => {
        const current = realM2ByDimension.get(row.dimension) ?? 0
        realM2ByDimension.set(row.dimension, round2(current + row.m2))
      })

      const comparisonRows = INVENTORY_ORIGIN_DIMENSION_ORDER.map((dimension) => ({
        dimension,
        estimatedM2: projectionRows.find((row) => row.dimension === dimension)?.estimatedM2 ?? 0,
        realM2: realM2ByDimension.get(dimension) ?? 0,
      })).filter((row) => row.estimatedM2 > 0 || row.realM2 > 0)

      const massRows: InventoryOriginMassRow[] = [...masses]
        .sort(
          (left, right) =>
            right.fechaRegistro.localeCompare(left.fechaRegistro) || right.codigo.localeCompare(left.codigo),
        )
        .map((masa) => ({
          id: masa.id,
          code: masa.codigo,
          date: masa.fechaRegistro,
          lengthCm: masa.largoCm,
          widthCm: masa.anchoCm,
          depthCm: masa.profundidadCm,
          location: masa.ubicacion,
          observation: masa.observaciones?.trim() ?? '',
          estimatedByDimension: INVENTORY_ORIGIN_DIMENSION_ORDER.map((dimension) => {
            const estimated = masa.estimados[dimension]
            return {
              dimension,
              estimatedSlabs: estimated?.losasEstimadas ?? 0,
              availableSlabs: getMonoHiloLosasDisponibles(masa, dimension),
              estimatedWastePercent: estimated?.mermaEstimadaPorcentaje ?? 0,
            }
          }).filter((item) => item.estimatedSlabs > 0 || item.availableSlabs > 0),
        }))

      const massRegisterRows = [...masses]
        .sort(
          (left, right) =>
            right.fechaRegistro.localeCompare(left.fechaRegistro) || right.codigo.localeCompare(left.codigo),
        )
        .flatMap((masa) =>
          INVENTORY_ORIGIN_DIMENSION_ORDER.map((dimension) => {
            const estimatedSlabs = masa.estimados[dimension]?.losasEstimadas ?? 0
            if (estimatedSlabs <= 0) return null
            return {
              massId: masa.id,
              massCode: masa.codigo,
              productType: resolveProductType(dimension),
              dimension,
              lengthM: round2(masa.largoCm / 100),
              estimatedSlabs,
              estimatedM2: round2(losasAMetros(estimatedSlabs, dimension)),
            } satisfies InventoryOriginMassRegisterRow
          }).filter((item): item is InventoryOriginMassRegisterRow => item !== null),
        )
      const massesById = new Map(masses.map((masa) => [masa.id, masa]))
      const massControlRows = productionRecords
        .flatMap((registro) =>
          (registro.detallesAcciones ?? [])
            .filter((detalle) => detalle.accion === 'picar' && detalle.masaId)
            .map((detalle) => ({
              id: `${registro.id}-${detalle.id}`,
              fecha: registro.fecha,
              massId: detalle.masaId as string,
              massCode:
                detalle.masaCodigo?.trim() ||
                massesById.get(detalle.masaId as string)?.codigo ||
                'SIN-MASA',
              dimension: registro.dimension,
              producedSlabs: detalle.cantidadLosas,
              producedM2:
                detalle.metrosCuadrados > 0
                  ? round2(detalle.metrosCuadrados)
                  : round2(losasAMetros(detalle.cantidadLosas, registro.dimension)),
              responsible: resolveDetalleResponsables(registro.creadoPorNombre, detalle),
              observation: detalle.observacion?.trim() || '',
            })),
        )
        .sort((left, right) => left.fecha.localeCompare(right.fecha) || left.massCode.localeCompare(right.massCode))

      const massClosureRows: InventoryOriginMassClosureRow[] = [...masses]
        .map<InventoryOriginMassClosureRow | null>((masa) => {
          const registrosMasa = massControlRows.filter((row) => row.massId === masa.id)
          if (registrosMasa.length === 0) return null

          const dimensions = Array.from(new Set(registrosMasa.map((row) => row.dimension)))
          const initialDimension: Dimension | null = registrosMasa[0]?.dimension ?? null
          const estimatedSlabs = initialDimension
            ? masa.estimados[initialDimension]?.losasEstimadas ?? 0
            : 0
          const realProducedSlabs = registrosMasa.reduce((sum, row) => sum + row.producedSlabs, 0)
          const realProducedM2 = round2(registrosMasa.reduce((sum, row) => sum + row.producedM2, 0))
          const closureDate = hasMassRemainingAvailability(masa)
            ? null
            : registrosMasa[registrosMasa.length - 1]?.fecha ?? null
          const lastObservation =
            [...registrosMasa]
              .reverse()
              .find((row) => row.observation.trim().length > 0)
              ?.observation.trim() ?? ''

          return {
            id: masa.id,
            massCode: masa.codigo,
            initialDimension,
            estimatedSlabs,
            realProducedSlabs,
            realProducedM2,
            differenceSlabs: estimatedSlabs - realProducedSlabs,
            closureDate,
            observation: buildMassClosureObservation({
              dimensions,
              lastObservation,
              massObservation: masa.observaciones?.trim() ?? '',
              closureDate,
            }),
          } satisfies InventoryOriginMassClosureRow
        })
        .filter((row): row is InventoryOriginMassClosureRow => row !== null)
        .sort((left, right) => left.massCode.localeCompare(right.massCode))

      const floorRows = FLOOR_DIMENSION_ORDER.map((dimension) => {
        const crudo = simplifiedRowsMap.get(`${dimension}-Crudo`)
        const escuadrado = simplifiedRowsMap.get(`${dimension}-Escuadrado`)
        const pulido = simplifiedRowsMap.get(`${dimension}-Pulido`)

        return {
          dimension,
          crudoSlabs: crudo?.slabs ?? 0,
          crudoM2: round2(crudo?.m2 ?? 0),
          escuadradoSlabs: escuadrado?.slabs ?? 0,
          escuadradoM2: round2(escuadrado?.m2 ?? 0),
          pulidoSlabs: pulido?.slabs ?? 0,
          pulidoM2: round2(pulido?.m2 ?? 0),
          totalM2: round2((crudo?.m2 ?? 0) + (escuadrado?.m2 ?? 0) + (pulido?.m2 ?? 0)),
        }
      })

      const floorTotals = {
        crudoM2: round2(floorRows.reduce((sum, row) => sum + row.crudoM2, 0)),
        escuadradoM2: round2(floorRows.reduce((sum, row) => sum + row.escuadradoM2, 0)),
        pulidoM2: round2(floorRows.reduce((sum, row) => sum + row.pulidoM2, 0)),
        totalM2: round2(floorRows.reduce((sum, row) => sum + row.totalM2, 0)),
      }

      const slabDimensions = [...new Set(
        Array.from(simplifiedRowsMap.keys()).map((key) => key.split('-')[0]).filter(isPlanchaDimension)
      )].sort()

      const slabRows = slabDimensions.map((dimension) => {
        const entries = Array.from(simplifiedRowsMap.values()).filter((row) => row.dimension === dimension)
        const units = entries.reduce((sum, row) => sum + row.slabs, 0)
        const m2 = entries.reduce((sum, row) => sum + row.m2, 0)
        const observation = entries
          .filter((row) => row.slabs > 0)
          .map((row) => `${row.state}: ${row.slabs} losas`)
          .join(' | ')

        return {
          dimension,
          units,
          m2: round2(m2),
          observation: observation || '--',
        }
      }).filter((row) => row.units > 0 || row.m2 > 0)

      const wasteRowsMap = new Map<string, InventoryOriginWasteRow>()
      const pushWasteRow = (
        dimension: Dimension,
        wasteType: string,
        totalM2: number,
        recoveredM2: number,
        lossM2: number,
      ) => {
        if (totalM2 <= 0 && recoveredM2 <= 0 && lossM2 <= 0) return
        const key = `${dimension}::${wasteType}`
        const current = wasteRowsMap.get(key)
        if (current) {
          current.totalM2 = round2(current.totalM2 + totalM2)
          current.recoveredM2 = round2(current.recoveredM2 + recoveredM2)
          current.lossM2 = round2(current.lossM2 + lossM2)
          return
        }

        wasteRowsMap.set(key, {
          dimension,
          wasteType,
          totalM2: round2(totalM2),
          recoveredM2: round2(recoveredM2),
          lossM2: round2(lossM2),
        })
      }

      productionRecords.forEach((registro) => {
        ;(registro.detallesAcciones ?? []).forEach((detalle) => {
          const mermaLosas = detalle.losasMermaTotal ?? 0
          const reutilizableLosas = detalle.losasReutilizables ?? 0
          const lossM2 =
            mermaLosas > 0
              ? (detalle.metrosMermaTotal ?? 0) > 0
                ? detalle.metrosMermaTotal ?? 0
                : losasAMetros(mermaLosas, registro.dimension)
              : 0
          const recoveredM2 =
            reutilizableLosas > 0
              ? (detalle.metrosReutilizables ?? 0) > 0
                ? detalle.metrosReutilizables ?? 0
                : losasAMetros(reutilizableLosas, registro.dimension)
              : 0

          pushWasteRow(
            registro.dimension,
            resolveMermaLabel(detalle.accion),
            lossM2 + recoveredM2,
            recoveredM2,
            lossM2,
          )
        })
      })

      mermasAprobadas.forEach((item) => {
        const recoveredM2 = item.motivo === 'Recorte aprovechable' ? item.metrosCuadrados : 0
        const lossM2 = item.motivo === 'Recorte aprovechable' ? 0 : item.metrosCuadrados
        pushWasteRow(
          item.dimension,
          item.motivo,
          item.metrosCuadrados,
          recoveredM2,
          lossM2,
        )
      })

      const wasteRows = Array.from(wasteRowsMap.values()).sort((left, right) => {
        const dimensionDelta =
          INVENTORY_ORIGIN_DIMENSION_ORDER.indexOf(left.dimension) -
          INVENTORY_ORIGIN_DIMENSION_ORDER.indexOf(right.dimension)
        if (dimensionDelta !== 0) return dimensionDelta
        return left.wasteType.localeCompare(right.wasteType)
      })

      const otherDirectExpenseItems = gastosVinculados
        .filter((item) => item.tipo !== 'Materia prima' && item.tipo !== 'Transporte' && item.tipo !== 'Nomina')
        .map((item) => ({
          id: item.id,
          label: `${item.tipo}: ${item.descripcion}`,
          amount: round2(item.costo),
        }))

      const massEvaluationRows = [...masses]
        .sort(
          (left, right) =>
            right.fechaRegistro.localeCompare(left.fechaRegistro) || right.codigo.localeCompare(left.codigo),
        )
        .map((masa) => {
          const entries = INVENTORY_ORIGIN_DIMENSION_ORDER.map((dimension) => ({
            dimension,
            estimated: masa.estimados[dimension]?.losasEstimadas ?? 0,
            consumed: masa.estimados[dimension]?.losasConsumidas ?? 0,
            wastePercent: masa.estimados[dimension]?.mermaEstimadaPorcentaje ?? 0,
          })).filter((item) => item.estimated > 0)

          const estimatedSlabs = entries.reduce((sum, item) => sum + item.estimated, 0)
          const equivalentM2 = round2(
            entries.reduce((sum, item) => sum + losasAMetros(item.estimated, item.dimension), 0),
          )
          const weightedWastePercent =
            estimatedSlabs > 0
              ? entries.reduce((sum, item) => sum + item.wastePercent * item.estimated, 0) / estimatedSlabs
              : 0
          const productionObtained = entries.map((item) => `${item.dimension}: ${item.estimated}`).join(', ')
          const consumedSlabs = entries.reduce((sum, item) => sum + item.consumed, 0)
          const observationBase = masa.observaciones?.trim() ?? ''
          const observation =
            observationBase.length > 0
              ? observationBase
              : consumedSlabs > 0
                ? `Consumidas ${consumedSlabs} de ${estimatedSlabs} losas estimadas.`
                : 'Sin observaciones.'

          return {
            id: masa.id,
            massCode: masa.codigo,
            quality: resolveMassQuality(weightedWastePercent, estimatedSlabs),
            productionObtained: productionObtained || '--',
            equivalentM2,
            observation,
          }
        })

      const totalVisibleSlabs = visibleProductsForOrigin.reduce(
        (sum, product) => sum + product.cantidadLosas,
        0,
      )
      const totalVisibleM2 = visibleProductsForOrigin.reduce(
        (sum, product) => sum + product.metrosCuadrados,
        0,
      )
      const totalStockSlabs = allProductsForOrigin.reduce((sum, product) => sum + product.cantidadLosas, 0)
      const totalStockM2 = allProductsForOrigin.reduce((sum, product) => sum + product.metrosCuadrados, 0)
      const totalStockValue = allProductsForOrigin.reduce(
        (sum, product) => sum + product.metrosCuadrados * product.precioM2,
        0,
      )
      const laborCost = laborRecords.reduce((sum, record) => sum + record.pagoFinal, 0)
      const resinCost = round2(resinQty * config.costoResinaLitro)
      const otherDirectCost = otherDirectExpenseItems.reduce((sum, item) => sum + item.amount, 0)
      const totalDirectCost = laborCost + resinCost + otherDirectCost
      const totalInitialCost = (block?.costo ?? 0) + (block?.costoTransporte ?? 0)
      const totalOperationalRecorded = totalDirectCost
      const totalInvestedRecorded = totalInitialCost + totalOperationalRecorded
      const estimatedM2 = massRegisterRows.reduce((sum, row) => sum + row.estimatedM2, 0)
      const floorEstimatedM2 = massRegisterRows
        .filter((row) => row.productType === 'Piso')
        .reduce((sum, row) => sum + row.estimatedM2, 0)
      const slabEstimatedM2 = massRegisterRows
        .filter((row) => row.productType === 'Plancha')
        .reduce((sum, row) => sum + row.estimatedM2, 0)
      const realM2 = productionRows.reduce((sum, row) => sum + row.m2, 0)
      const slabRealM2 = slabRows.reduce((sum, row) => sum + row.m2, 0)
      const generalRealM2 = realM2
      const wasteTotalM2 = wasteRows.reduce((sum, row) => sum + row.totalM2, 0)
      const wasteRecoveredM2 = wasteRows.reduce((sum, row) => sum + row.recoveredM2, 0)
      const wasteLossM2 = wasteRows.reduce((sum, row) => sum + row.lossM2, 0)
      const differenceM2 = generalRealM2 - estimatedM2
      const yieldRatio = estimatedM2 > 0 ? generalRealM2 / estimatedM2 : null
      const averageCostM2 = generalRealM2 > 0 ? totalInvestedRecorded / generalRealM2 : null
      const purchasedEquivalentM2 =
        block?.tipo === 'Lote' && block.dimensionBase
          ? round2(losasAMetros(Math.max(0, Math.trunc(block.metrosComprados)), block.dimensionBase))
          : null

      const responsibleNames = Array.from(
        new Set(
          [
            ...masses.map((masa) => masa.creadoPorNombre?.trim() ?? ''),
            ...productionRecords.map((registro) => registro.creadoPorNombre?.trim() ?? ''),
            ...laborRecords.map((record) => record.trabajadorNombre?.trim() ?? ''),
          ].filter((name) => name.length > 0),
        ),
      )

      const closureDate =
        block?.estado && block.estado !== 'activo'
          ? resolveLatestDate([
              ...productionRecords.map((registro) => registro.fecha),
              ...masses.map((masa) => masa.fechaRegistro),
              ...mermasAprobadas.map((item) => item.fecha),
              block.fechaIngreso,
            ])
          : null

      const productionType = resolveProductionTypeLabel({
        productionRows,
        massRegisterRows,
        baseDimension: block?.dimensionBase ?? null,
        blockType: block?.tipo ?? null,
      })
      const stateAnalysis = buildStateAnalysis({
        enabled: salesAnalysisEnabled,
        originId,
        ventas,
        config,
      })

      const notes: string[] = []
      if (block?.estado === 'vendido') {
        notes.push('El origen ya fue vendido y la ficha permanece disponible solo para consulta.')
      }
      if (massRegisterRows.length === 0 && block?.tipo === 'Bloque') {
        notes.push('Todavia no hay masas registradas para este bloque.')
      }
      if (generalRealM2 <= 0) {
        notes.push('Todavia no hay produccion real consolidada para este origen.')
      }
      if (notes.length === 0) {
        notes.push('Ficha lista para seguimiento operativo.')
      }

      return {
        originId,
        originName,
        code,
        entryDate: block?.fechaIngreso ?? '',
        provider: block?.proveedor ?? 'Sin proveedor registrado',
        blockType: block?.tipo ?? null,
        blockStatus: block?.estado ?? null,
        baseDimension: block?.dimensionBase ?? null,
        block,
        visibleProducts: visibleProductsForOrigin,
        allProducts: allProductsForOrigin,
        visibleItemsCount: visibleProductsForOrigin.length,
        totalVisibleSlabs,
        totalVisibleM2: round2(totalVisibleM2),
        totalStockSlabs,
        totalStockM2: round2(totalStockM2),
        totalStockValue: round2(totalStockValue),
        massCount: masses.length,
        totalMassLengthM: round2(totalMassLengthM),
        averageMassLengthM: round2(averageMassLengthM),
        responsibleNames,
        stateRows,
        stockByDimensionRows,
        projectionRows,
        productionRows,
        comparisonRows,
        massRows,
        notes,
        ficha: {
          closureDate,
          productionType,
          massRegisterRows,
          massControlRows,
          massClosureRows,
          floorRows,
          floorTotals,
          slabRows,
          wasteRows,
          massEvaluationRows,
          otherDirectExpenseItems,
          stateAnalysis,
        },
        summary: {
          initialCost: block?.costo ?? 0,
          transportCost: block?.costoTransporte ?? 0,
          totalInitialCost: round2(totalInitialCost),
          laborCost: round2(laborCost),
          laborEntries: laborRecords.length,
          resinQty: round2(resinQty),
          resinEntries,
          resinCost,
          otherDirectCost: round2(otherDirectCost),
          totalDirectCost: round2(totalDirectCost),
          totalOperationalRecorded: round2(totalOperationalRecorded),
          totalInvestedRecorded: round2(totalInvestedRecorded),
          estimatedM2: round2(estimatedM2),
          floorEstimatedM2: round2(floorEstimatedM2),
          slabEstimatedM2: round2(slabEstimatedM2),
          realM2: round2(realM2),
          floorRealM2: round2(floorTotals.totalM2),
          slabRealM2: round2(slabRealM2),
          generalRealM2: round2(generalRealM2),
          differenceM2: round2(differenceM2),
          yieldRatio,
          averageCostM2: averageCostM2 === null ? null : round2(averageCostM2),
          purchasedM2: block?.metrosComprados ?? 0,
          purchasedEquivalentM2,
          vendibleM2: block?.metrosVendibles ?? 0,
          producedSlabs: block?.losasProducidas ?? 0,
          lostSlabs: block?.losasPerdidas ?? 0,
          recordedGain: block?.gananciaReal ?? 0,
          productionEntries: productionRecords.length,
          wasteTotalM2: round2(wasteTotalM2),
          wasteRecoveredM2: round2(wasteRecoveredM2),
          wasteLossM2: round2(wasteLossM2),
        },
      }
    })
    .sort((left, right) => {
      const dateDelta = right.entryDate.localeCompare(left.entryDate)
      if (dateDelta !== 0) return dateDelta
      return left.code.localeCompare(right.code)
    })
}
