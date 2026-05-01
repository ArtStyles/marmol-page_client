import { getBloqueCodigo } from '@/lib/bloque-codigo'
import {
  PLANCHA_DIMENSIONES,
  losasAMetros,
  type AccionLosa,
  type BloqueOLote,
  type Dimension,
  type MonoHiloMasa,
  type Producto,
  type ProduccionDiaria,
  type ProduccionTrabajador,
} from '@/lib/types'

const ACTION_ORDER: AccionLosa[] = ['picar', 'escuadrar', 'devastar', 'resinar', 'pulir']

const STATE_ORDER: Producto['estado'][] = [
  'Picado',
  'Escuadrado',
  'Devastado',
  'Resinado',
  'Pulido',
]

export const INVENTORY_ORIGIN_DIMENSION_ORDER: Dimension[] = [
  '160x65',
  '160x60',
  '80x40',
  '60x40',
  '40x40',
]

const STATE_BY_ACTION: Record<AccionLosa, Producto['estado']> = {
  picar: 'Picado',
  escuadrar: 'Escuadrado',
  devastar: 'Devastado',
  resinar: 'Resinado',
  pulir: 'Pulido',
}

const round2 = (value: number): number => Number(value.toFixed(2))

const resolveProductType = (dimension: Dimension): Producto['tipo'] =>
  PLANCHA_DIMENSIONES.includes(dimension as (typeof PLANCHA_DIMENSIONES)[number])
    ? 'Plancha'
    : 'Piso'

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
  summary: {
    initialCost: number
    transportCost: number
    totalInitialCost: number
    laborCost: number
    laborEntries: number
    resinQty: number
    resinEntries: number
    totalOperationalRecorded: number
    totalInvestedRecorded: number
    estimatedM2: number
    realM2: number
    differenceM2: number
    yieldRatio: number | null
    averageCostM2: number | null
    purchasedM2: number
    vendibleM2: number
    producedSlabs: number
    lostSlabs: number
    recordedGain: number
    productionEntries: number
  }
}

type BuildInventoryOriginProfilesInput = {
  blocks: BloqueOLote[]
  allProducts: Producto[]
  visibleProducts: Producto[]
  produccion: ProduccionDiaria[]
  produccionTrabajadores: ProduccionTrabajador[]
  monoHiloMasas: MonoHiloMasa[]
  resolveOriginCode: (originId: string, originName: string) => string
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

export function buildInventoryOriginProfiles({
  blocks,
  allProducts,
  visibleProducts,
  produccion,
  produccionTrabajadores,
  monoHiloMasas,
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
              availableSlabs: Math.max(
                0,
                (estimated?.losasEstimadas ?? 0) - (estimated?.losasConsumidas ?? 0),
              ),
              estimatedWastePercent: estimated?.mermaEstimadaPorcentaje ?? 0,
            }
          }).filter((item) => item.estimatedSlabs > 0 || item.availableSlabs > 0),
        }))

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
      const totalInitialCost = (block?.costo ?? 0) + (block?.costoTransporte ?? 0)
      const totalOperationalRecorded = laborCost
      const totalInvestedRecorded = totalInitialCost + totalOperationalRecorded
      const estimatedM2 = projectionRows.reduce((sum, row) => sum + row.estimatedM2, 0)
      const realM2 = productionRows.reduce((sum, row) => sum + row.m2, 0)
      const differenceM2 = realM2 - estimatedM2
      const yieldRatio = estimatedM2 > 0 ? realM2 / estimatedM2 : null
      const averageCostM2 = realM2 > 0 ? totalInvestedRecorded / realM2 : null

      const massObservations = Array.from(
        new Set(
          massRows
            .filter((row) => row.observation.trim().length > 0)
            .map((row) => `Produccion mono hilo / masa ${row.code}: ${row.observation.trim()}`),
        ),
      )

      const responsibleNames = Array.from(
        new Set(
          [
            ...masses.map((masa) => masa.creadoPorNombre?.trim() ?? ''),
            ...productionRecords.map((registro) => registro.creadoPorNombre?.trim() ?? ''),
            ...laborRecords.map((record) => record.trabajadorNombre?.trim() ?? ''),
          ].filter((name) => name.length > 0),
        ),
      )

      const notes: string[] = []
      if (block?.estado === 'vendido') {
        notes.push('El bloque ya figura como vendido y mantiene su historico para consulta.')
      }
      if (estimatedM2 <= 0) {
        notes.push('Todavia no hay masas suficientes para proyectar rendimiento por formato.')
      }
      if (estimatedM2 > 0 && realM2 > 0) {
        notes.push(
          differenceM2 >= 0
            ? 'La produccion real supera o iguala la proyeccion registrada.'
            : 'La produccion real aun esta por debajo de la proyeccion registrada.',
        )
      }
      if (massObservations.length > 0) {
        notes.push(...massObservations.slice(0, 2))
      }
      if (notes.length === 0) {
        notes.push('Sin observaciones registradas para este bloque o lote.')
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
        summary: {
          initialCost: block?.costo ?? 0,
          transportCost: block?.costoTransporte ?? 0,
          totalInitialCost,
          laborCost: round2(laborCost),
          laborEntries: laborRecords.length,
          resinQty: round2(resinQty),
          resinEntries,
          totalOperationalRecorded: round2(totalOperationalRecorded),
          totalInvestedRecorded: round2(totalInvestedRecorded),
          estimatedM2: round2(estimatedM2),
          realM2: round2(realM2),
          differenceM2: round2(differenceM2),
          yieldRatio,
          averageCostM2: averageCostM2 === null ? null : round2(averageCostM2),
          purchasedM2: block?.metrosComprados ?? 0,
          vendibleM2: block?.metrosVendibles ?? 0,
          producedSlabs: block?.losasProducidas ?? 0,
          lostSlabs: block?.losasPerdidas ?? 0,
          recordedGain: block?.gananciaReal ?? 0,
          productionEntries: productionRecords.length,
        },
      }
    })
    .sort((left, right) => {
      const dateDelta = right.entryDate.localeCompare(left.entryDate)
      if (dateDelta !== 0) return dateDelta
      return left.code.localeCompare(right.code)
    })
}

