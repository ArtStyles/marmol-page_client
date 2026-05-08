import type {
  BloqueRepositoryPort,
  ConfiguracionPort,
  GastoRepositoryPort,
  HistorialPagoRepositoryPort,
  MermaRepositoryPort,
  ProduccionRepositoryPort,
  ProduccionTrabajadorRepositoryPort,
  TrabajadorRepositoryPort,
  VentaRepositoryPort,
} from '../../../domain/ports/index.js'
import type {
  FinancialBreakdownItemDto,
  FinancialSummaryResponseDto,
} from '../../dtos/index.js'
import type { RolConSalarioFijo } from '../../../domain/entities/index.js'
import { resolveGastoLedger, isManualGastoTipo } from '../gastos/gasto.helpers.js'

const PORC_RESERVA_FIJOS_MANTENIMIENTO = 0.11
const PORC_GASTO_CORRIENTE = 0.06
const PORC_GASTO_AGUA = 0.02
const PORC_GASTO_OTROS = 0.03
const PORC_REINVERSION = 0.4
const PORC_PAGO_DIRECTIVOS = 0.6

export class GetFinancialSummaryUseCase {
  constructor(
    private readonly configuracionPort: ConfiguracionPort,
    private readonly gastoRepository: GastoRepositoryPort,
    private readonly bloqueRepository: BloqueRepositoryPort,
    private readonly historialPagoRepository: HistorialPagoRepositoryPort,
    private readonly trabajadorRepository: TrabajadorRepositoryPort,
    private readonly mermaRepository: MermaRepositoryPort,
    private readonly produccionRepository: ProduccionRepositoryPort,
    private readonly produccionTrabajadorRepository: ProduccionTrabajadorRepositoryPort,
    private readonly ventaRepository: VentaRepositoryPort,
  ) {}

  async execute(): Promise<FinancialSummaryResponseDto> {
    const [
      config,
      gastos,
      bloquesYLotes,
      historialPagos,
      trabajadores,
      mermas,
      produccionDiaria,
      produccionTrabajadores,
      ventas,
    ] = await Promise.all([
      this.configuracionPort.get(),
      resolveGastoLedger({
        gastoRepository: this.gastoRepository,
        bloqueRepository: this.bloqueRepository,
        historialPagoRepository: this.historialPagoRepository,
        trabajadorRepository: this.trabajadorRepository,
      }),
      this.bloqueRepository.findAll(),
      this.historialPagoRepository.findAll(),
      this.trabajadorRepository.findAll(),
      this.mermaRepository.findAll(),
      this.produccionRepository.findAll(),
      this.produccionTrabajadorRepository.findAll(),
      this.ventaRepository.findAll(),
    ])

    const periodoActual = new Date().toISOString().slice(0, 7)
    const gastosActivos = gastos.filter((item) => item.estado === 'activo')
    const gastosMesActual = gastosActivos.filter((item) => item.fecha.startsWith(periodoActual))
    const gastosManualesActivos = gastosActivos.filter((item) => item.origen === 'manual')
    const gastosSistemaActivos = gastosActivos.filter((item) => item.origen === 'sistema')
    const gastosManualesOperativos = gastosManualesActivos.filter((item) => isManualGastoTipo(item.tipo))

    const ventasCompletadas = ventas.filter((venta) => venta.estado === 'completada')
    const totalSubtotal = ventasCompletadas.reduce((sum, venta) => sum + venta.subtotal, 0)
    const totalDescuentos = ventasCompletadas.reduce(
      (sum, venta) => sum + venta.subtotal * (venta.descuento / 100),
      0,
    )
    const ingresosTotales = round2(ventasCompletadas.reduce((sum, venta) => sum + venta.total, 0))
    const fondosDesgasteEquipos = round2(
      ventasCompletadas.reduce((sum, venta) => sum + (venta.fondoDesgasteEquipos ?? 0), 0),
    )
    const fondosTrabajadores = round2(
      ventasCompletadas.reduce((sum, venta) => sum + (venta.fondoTrabajadores ?? 0), 0),
    )
    const fondosOperativos = round2(
      ventasCompletadas.reduce((sum, venta) => sum + (venta.fondoOperativo ?? 0), 0),
    )
    const ingresosOperativos = round2(Math.max(0, ingresosTotales - fondosOperativos))
    const totalMetrosVendidos = round2(ventasCompletadas.reduce((sum, venta) => sum + venta.cantidadM2, 0))
    const produccionTotalM2 = round2(produccionDiaria.reduce((sum, registro) => sum + registro.totalM2, 0))

    const totalCostoBloques = round2(bloquesYLotes.reduce((sum, bloque) => sum + bloque.costo, 0))
    const totalCostoTransporteMateriaPrima = round2(
      bloquesYLotes.reduce((sum, bloque) => sum + bloque.costoTransporte, 0),
    )
    const metrosReferenciaCosteo = produccionTotalM2 > 0 ? produccionTotalM2 : totalMetrosVendidos
    const costoMaterialM2 = metrosReferenciaCosteo > 0 ? round2(totalCostoBloques / metrosReferenciaCosteo) : 0
    const costoBloqueAsignado = round2(totalMetrosVendidos * costoMaterialM2)

    const trabajadoresPorId = new Map(trabajadores.map((trabajador) => [trabajador.id, trabajador]))
    const produccionObreros = produccionTrabajadores.filter((registro) => {
      const rol = trabajadoresPorId.get(registro.trabajadorId)?.rol
      return rol === 'Obrero'
    })

    const manoObraObreros = round2(produccionObreros.reduce((sum, registro) => sum + registro.pagoFinal, 0))
    const manoObraPagada = round2(
      produccionObreros.filter((registro) => registro.pagado).reduce((sum, registro) => sum + registro.pagoFinal, 0),
    )
    const manoObraPendiente = round2(Math.max(0, manoObraObreros - manoObraPagada))
    const bonosObreros = round2(produccionObreros.reduce((sum, registro) => sum + registro.bono, 0))

    const trabajadoresFijosActivos = trabajadores.filter(
      (trabajador) => trabajador.estado === 'activo' && trabajador.rol !== 'Obrero',
    )
    const salariosFijosReferencia = round2(
      trabajadoresFijosActivos.reduce((sum, trabajador) => {
        const rol = trabajador.rol as RolConSalarioFijo
        return sum + (config.salariosFijosPorRol[rol] ?? 0)
      }, 0),
    )

    const pagosNominaRealizados = round2(historialPagos.reduce((sum, pago) => sum + pago.totalPagado, 0))
    const pagosNominaPendientes = round2(
      produccionTrabajadores.filter((registro) => !registro.pagado).reduce((sum, registro) => sum + registro.pagoFinal, 0),
    )

    const reservaFijosMantenimiento = round2(ingresosOperativos * PORC_RESERVA_FIJOS_MANTENIMIENTO)
    const baseDespuesReserva = round2(ingresosOperativos - reservaFijosMantenimiento)
    const gastoCorriente = round2(ingresosOperativos * PORC_GASTO_CORRIENTE)
    const gastoAgua = round2(ingresosOperativos * PORC_GASTO_AGUA)
    const gastoOtros = round2(ingresosOperativos * PORC_GASTO_OTROS)
    const gastoManualRegistrado = round2(
      gastosManualesOperativos.reduce((sum, gasto) => sum + gasto.costo, 0),
    )
    const utilidadAntesServicios = round2(baseDespuesReserva - manoObraObreros - costoBloqueAsignado)
    const gastosServicios = round2(
      totalCostoTransporteMateriaPrima + gastoCorriente + gastoAgua + gastoOtros + gastoManualRegistrado,
    )
    const gananciaNeta = round2(utilidadAntesServicios - gastosServicios)
    const reinversion = gananciaNeta > 0 ? round2(gananciaNeta * PORC_REINVERSION) : 0
    const pagoDirectivos = gananciaNeta > 0 ? round2(gananciaNeta * PORC_PAGO_DIRECTIVOS) : 0
    const margenOperativo = ingresosOperativos > 0 ? utilidadAntesServicios / ingresosOperativos : 0
    const margenNeto = ingresosOperativos > 0 ? gananciaNeta / ingresosOperativos : 0
    const ticketPromedio = ventasCompletadas.length > 0 ? ingresosOperativos / ventasCompletadas.length : 0
    const ingresoPorM2 = totalMetrosVendidos > 0 ? ingresosOperativos / totalMetrosVendidos : 0

    const totalMermasM2 = round2(mermas.reduce((sum, merma) => sum + merma.metrosCuadrados, 0))
    const costoMerma = round2(totalMermasM2 * costoMaterialM2)
    const mermaRatio = metrosReferenciaCosteo > 0 ? totalMermasM2 / metrosReferenciaCosteo : 0
    const ratioVentaProduccion = produccionTotalM2 > 0 ? totalMetrosVendidos / produccionTotalM2 : 0

    const ventasRecientes = [...ventasCompletadas]
      .sort((left, right) => left.fecha.localeCompare(right.fecha))
      .slice(-7)
      .map((venta) => ({
        fecha: venta.fecha,
        total: round2(venta.total),
      }))

    const ultimaVenta = [...ventasCompletadas].sort((left, right) => right.fecha.localeCompare(left.fecha))[0]?.fecha
    const ultimaProduccion = [...produccionDiaria]
      .sort((left, right) => right.fecha.localeCompare(left.fecha))[0]?.fecha

    const gastoTotalActivo = round2(gastosActivos.reduce((sum, gasto) => sum + gasto.costo, 0))
    const gastoTotalMesActual = round2(gastosMesActual.reduce((sum, gasto) => sum + gasto.costo, 0))
    const gastoTotalManualActivo = round2(gastosManualesActivos.reduce((sum, gasto) => sum + gasto.costo, 0))
    const gastoTotalSistemaActivo = round2(gastosSistemaActivos.reduce((sum, gasto) => sum + gasto.costo, 0))
    const gastoPromedioActivo = gastosActivos.length > 0 ? round2(gastoTotalActivo / gastosActivos.length) : 0
    const ratioContraIngresos = ingresosOperativos > 0 ? gastoTotalActivo / ingresosOperativos : 0
    const balanceContraIngresos = round2(ingresosOperativos - gastoTotalActivo)

    const alertas = [
      gananciaNeta < 0 ? 'Ganancia neta negativa. Revisar costos operativos.' : null,
      manoObraObreros > 0 && manoObraPendiente / manoObraObreros > 0.35
        ? 'Pago pendiente de obreros alto. Priorizar liquidacion de mano de obra.'
        : null,
      mermaRatio > 0.05 ? 'Merma elevada. Ajustar procesos de corte y pulido.' : null,
    ].filter(Boolean) as string[]

    return {
      periodoActual,
      gastos: {
        totalActivo: gastoTotalActivo,
        totalMesActual: gastoTotalMesActual,
        promedioActivo: gastoPromedioActivo,
        cantidadActivos: gastosActivos.length,
        cantidadMesActual: gastosMesActual.length,
        totalManualActivo: gastoTotalManualActivo,
        totalSistemaActivo: gastoTotalSistemaActivo,
        balanceContraIngresos,
        ratioContraIngresos,
        porTipo: buildBreakdown(gastosActivos, (item) => item.tipo),
        porFlujo: buildBreakdown(gastosActivos, (item) => item.flujo),
        porOrigen: buildBreakdown(gastosActivos, (item) => item.origen, {
          manual: 'Manual',
          sistema: 'Sistema',
        }),
        topEncargados: Object.entries(
          gastosActivos.reduce<Record<string, number>>((acc, gasto) => {
            const key = gasto.encargado.trim() || 'Sin encargado'
            acc[key] = round2((acc[key] ?? 0) + gasto.costo)
            return acc
          }, {}),
        )
          .map(([encargado, total]) => ({ encargado, total }))
          .sort((left, right) => right.total - left.total)
          .slice(0, 4),
      },
      nomina: {
        pagado: pagosNominaRealizados,
        pendiente: pagosNominaPendientes,
        bonos: bonosObreros,
        salariosFijosReferencia,
      },
      materiales: {
        inventarioComprado: totalCostoBloques,
        transporteMateriaPrima: totalCostoTransporteMateriaPrima,
        costoBloqueAsignado,
        costoMaterialM2,
        costoMerma,
        metrosReferenciaCosteo: round2(metrosReferenciaCosteo),
      },
      operacion: {
        ingresosOperativos,
        ingresosTotales,
        descuentos: round2(totalDescuentos),
        fondosDesgasteEquipos,
        fondosTrabajadores,
        fondosOperativos,
        totalMetrosVendidos,
        produccionTotalM2,
        totalMermasM2,
        mermaRatio: round4(mermaRatio),
        ratioVentaProduccion: round4(ratioVentaProduccion),
      },
      rentabilidad: {
        reservaFijosMantenimiento,
        baseDespuesReserva,
        manoObraObreros,
        manoObraPagada,
        manoObraPendiente,
        gastoManualRegistrado,
        gastoCorriente,
        gastoAgua,
        gastoOtros,
        gastosServicios,
        utilidadAntesServicios,
        gananciaNeta,
        reinversion,
        pagoDirectivos,
        margenOperativo: round4(margenOperativo),
        margenNeto: round4(margenNeto),
        ticketPromedio: round2(ticketPromedio),
        ingresoPorM2: round2(ingresoPorM2),
      },
      ventasRecientes,
      alertas,
      fechas: {
        ultimaVenta,
        ultimaProduccion,
      },
    }
  }
}

function buildBreakdown<T extends { costo: number }>(
  gastos: T[],
  resolver: (item: T) => string,
  labels: Record<string, string> = {},
): FinancialBreakdownItemDto[] {
  const grouped = new Map<string, { total: number; count: number }>()

  for (const gasto of gastos) {
    const key = resolver(gasto)
    const current = grouped.get(key)
    grouped.set(key, {
      total: round2((current?.total ?? 0) + gasto.costo),
      count: (current?.count ?? 0) + 1,
    })
  }

  return [...grouped.entries()]
    .map(([key, value]) => ({
      key,
      label: labels[key] ?? key,
      total: value.total,
      count: value.count,
    }))
    .sort((left, right) => right.total - left.total)
}

function round2(value: number): number {
  return Number(value.toFixed(2))
}

function round4(value: number): number {
  return Number(value.toFixed(4))
}
