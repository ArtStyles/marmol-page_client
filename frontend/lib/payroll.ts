import type { HistorialPago, RolConSalarioFijo, Trabajador } from './types'

function round2(value: number): number {
  return Number(value.toFixed(2))
}

function resolveMonthKeyFromDate(rawDate: string): string {
  const normalized = rawDate.trim()
  if (/^\d{4}-\d{2}/.test(normalized)) {
    return normalized.slice(0, 7)
  }

  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return ''

  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`
}

export function getPayrollMonthKey(referenceDate: Date = new Date()): string {
  return `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, '0')}`
}

export function getFixedSalaryBaseForWorker(
  worker: Pick<Trabajador, 'rol' | 'estado'>,
  salariosFijosPorRol: Record<RolConSalarioFijo, number>,
): number {
  if (worker.rol === 'Obrero' || worker.estado !== 'activo') return 0
  return salariosFijosPorRol[worker.rol as RolConSalarioFijo] ?? 0
}

export function getFixedSalaryPaidInMonth(
  historial: HistorialPago[],
  trabajadorId: string,
  monthKey: string,
): number {
  return round2(
    historial
      .filter((item) => item.trabajadorId === trabajadorId)
      .filter((item) => item.produccionIds.length === 0)
      .filter((item) => resolveMonthKeyFromDate(item.fecha) === monthKey)
      .reduce((sum, item) => sum + item.montoAcciones, 0),
  )
}

export function getFixedSalaryPendingForMonth(
  worker: Pick<Trabajador, 'id' | 'rol' | 'estado'>,
  salariosFijosPorRol: Record<RolConSalarioFijo, number>,
  historial: HistorialPago[],
  monthKey: string = getPayrollMonthKey(),
): number {
  const salarioBase = getFixedSalaryBaseForWorker(worker, salariosFijosPorRol)
  if (salarioBase <= 0) return 0

  const pagadoEnMes = getFixedSalaryPaidInMonth(historial, worker.id, monthKey)
  return round2(Math.max(0, salarioBase - pagadoEnMes))
}
