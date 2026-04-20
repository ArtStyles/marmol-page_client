import type { AccionLosa, Dimension, RolConSalarioFijo } from '../domain/entities/index.js'

export const TARIFAS_ACCION_DEFAULT: Record<AccionLosa, number> = {
  picar: 400,
  escuadrar: 100,
  devastar: 250,
  resinar: 250,
  pulir: 250,
}

export const SALARIOS_FIJOS_POR_ROL_DEFAULT: Record<RolConSalarioFijo, number> = {
  Administrador: 28000,
  'Gestor de Ventas': 18000,
  'Jefe de Almacen': 20000,
  'Jefe de Turno de Producci\u00f3n': 22000,
}

export const PRECIOS_M2_DEFAULT: Record<Dimension, { crudo: number; pulido: number }> = {
  '40x40': { crudo: 120, pulido: 180 },
  '60x40': { crudo: 140, pulido: 200 },
  '80x40': { crudo: 160, pulido: 220 },
  '160x60': { crudo: 160, pulido: 220 },
  '160x65': { crudo: 160, pulido: 220 },
}
