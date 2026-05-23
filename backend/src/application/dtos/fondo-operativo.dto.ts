export interface FondoCategoriaDto {
  categoria: string
  total: number
  porcentaje: number
}

export interface FondoOperativoResponseDto {
  periodo: string
  fondoInicial: number
  totalGastado: number
  balanceActual: number
  configurado: boolean
  porCategoria: FondoCategoriaDto[]
  creadoPorId?: string
  creadoPorNombre?: string
}
