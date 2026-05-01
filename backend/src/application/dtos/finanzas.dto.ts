export interface FinancialSeriesPointDto {
  fecha: string
  total: number
}

export interface FinancialBreakdownItemDto {
  key: string
  label: string
  total: number
  count: number
}

export interface FinancialExpenseSummaryDto {
  totalActivo: number
  totalMesActual: number
  promedioActivo: number
  cantidadActivos: number
  cantidadMesActual: number
  totalManualActivo: number
  totalSistemaActivo: number
  balanceContraIngresos: number
  ratioContraIngresos: number
  porTipo: FinancialBreakdownItemDto[]
  porFlujo: FinancialBreakdownItemDto[]
  porOrigen: FinancialBreakdownItemDto[]
  topEncargados: Array<{
    encargado: string
    total: number
  }>
}

export interface FinancialPayrollSummaryDto {
  pagado: number
  pendiente: number
  bonos: number
  salariosFijosReferencia: number
}

export interface FinancialMaterialSummaryDto {
  inventarioComprado: number
  transporteMateriaPrima: number
  costoBloqueAsignado: number
  costoMaterialM2: number
  costoMerma: number
  metrosReferenciaCosteo: number
}

export interface FinancialOperationsSummaryDto {
  ingresosOperativos: number
  ingresosTotales: number
  descuentos: number
  fondosOperativos: number
  totalMetrosVendidos: number
  produccionTotalM2: number
  totalMermasM2: number
  mermaRatio: number
  ratioVentaProduccion: number
}

export interface FinancialProfitabilitySummaryDto {
  reservaFijosMantenimiento: number
  baseDespuesReserva: number
  manoObraObreros: number
  manoObraPagada: number
  manoObraPendiente: number
  gastoManualRegistrado: number
  gastoCorriente: number
  gastoAgua: number
  gastoOtros: number
  gastosServicios: number
  utilidadAntesServicios: number
  gananciaNeta: number
  reinversion: number
  pagoDirectivos: number
  margenOperativo: number
  margenNeto: number
  ticketPromedio: number
  ingresoPorM2: number
}

export interface FinancialSummaryResponseDto {
  periodoActual: string
  gastos: FinancialExpenseSummaryDto
  nomina: FinancialPayrollSummaryDto
  materiales: FinancialMaterialSummaryDto
  operacion: FinancialOperationsSummaryDto
  rentabilidad: FinancialProfitabilitySummaryDto
  ventasRecientes: FinancialSeriesPointDto[]
  alertas: string[]
  fechas: {
    ultimaVenta?: string
    ultimaProduccion?: string
  }
}
