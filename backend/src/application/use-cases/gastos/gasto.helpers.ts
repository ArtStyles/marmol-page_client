import { DomainError } from '../../errors/domain.error.js'
import type {
  BloqueRepositoryPort,
  GastoRepositoryPort,
  HistorialPagoRepositoryPort,
  TrabajadorRepositoryPort,
} from '../../../domain/ports/index.js'
import type {
  BloqueOLote,
  Gasto,
  GastoFlujo,
  GastoManualTipo,
  GastoTipo,
  HistorialPago,
  Trabajador,
} from '../../../domain/entities/index.js'
import { GASTO_TIPOS_MANUALES } from '../../../domain/entities/index.js'
import type { CreateGastoDto, UpdateGastoDto } from '../../dtos/index.js'

export interface GastoActor {
  userId: string
  userName: string
}

type LedgerDependencies = {
  gastoRepository: GastoRepositoryPort
  bloqueRepository: BloqueRepositoryPort
  historialPagoRepository: HistorialPagoRepositoryPort
  trabajadorRepository: TrabajadorRepositoryPort
}

export function isManualGastoTipo(value: GastoTipo): value is GastoManualTipo {
  return (GASTO_TIPOS_MANUALES as readonly string[]).includes(value)
}

export function buildManualGasto(dto: CreateGastoDto, actor: GastoActor): Omit<Gasto, 'id'> {
  if (!isManualGastoTipo(dto.tipo)) {
    throw new DomainError(
      `El tipo ${dto.tipo} se genera automaticamente desde su modulo origen.`,
      409,
      'GASTO_TIPO_AUTOMATICO_BLOQUEADO',
    )
  }

  return {
    createdAt: new Date().toISOString(),
    fecha: normalizeDateOnly(dto.fecha, 'La fecha del gasto no es valida.'),
    costo: normalizeCurrency(dto.costo, 'El costo del gasto debe ser mayor que 0.'),
    tipo: dto.tipo,
    flujo: dto.flujo,
    descripcion: normalizeRequiredText(dto.descripcion, 6, 'Describe el motivo del gasto con al menos 6 caracteres.'),
    encargado: normalizeRequiredText(dto.encargado, 1, 'Indica la persona encargada del gasto.'),
    origen: 'manual',
    origenModulo: 'gastos',
    referenciaId: undefined,
    creadoPorId: actor.userId,
    creadoPorNombre: actor.userName,
    estado: 'activo',
    anuladoPorId: undefined,
    anuladoPorNombre: undefined,
    anuladoFecha: undefined,
    motivoAnulacion: undefined,
  }
}

export function buildUpdatedManualGasto(actual: Gasto, dto: UpdateGastoDto): Partial<Gasto> {
  if (actual.origen !== 'manual') {
    throw new DomainError(
      'Los gastos generados por el sistema deben ajustarse desde su modulo origen.',
      409,
      'GASTO_SISTEMA_NO_EDITABLE',
    )
  }

  if (actual.estado !== 'activo') {
    throw new DomainError(
      'El gasto ya fue anulado y no admite mas modificaciones.',
      409,
      'GASTO_ANULADO_NO_EDITABLE',
    )
  }

  if (dto.tipo && !isManualGastoTipo(dto.tipo)) {
    throw new DomainError(
      `El tipo ${dto.tipo} se genera automaticamente desde su modulo origen.`,
      409,
      'GASTO_TIPO_AUTOMATICO_BLOQUEADO',
    )
  }

  const patch: Partial<Gasto> = {}

  if (dto.fecha !== undefined) patch.fecha = normalizeDateOnly(dto.fecha, 'La fecha del gasto no es valida.')
  if (dto.costo !== undefined) patch.costo = normalizeCurrency(dto.costo, 'El costo del gasto debe ser mayor que 0.')
  if (dto.tipo !== undefined) patch.tipo = dto.tipo
  if (dto.flujo !== undefined) patch.flujo = dto.flujo
  if (dto.descripcion !== undefined) {
    patch.descripcion = normalizeRequiredText(dto.descripcion, 6, 'Describe el motivo del gasto con al menos 6 caracteres.')
  }
  if (dto.encargado !== undefined) {
    patch.encargado = normalizeRequiredText(dto.encargado, 1, 'Indica la persona encargada del gasto.')
  }

  return patch
}

export function buildCancelledGasto(actual: Gasto, actor: GastoActor, reason: string): Partial<Gasto> {
  if (actual.origen !== 'manual') {
    throw new DomainError(
      'Los gastos generados por el sistema deben corregirse desde su modulo origen.',
      409,
      'GASTO_SISTEMA_NO_ANULABLE',
    )
  }

  if (actual.estado !== 'activo') {
    throw new DomainError('El gasto ya se encuentra anulado.', 409, 'GASTO_YA_ANULADO')
  }

  return {
    estado: 'anulado',
    motivoAnulacion: normalizeRequiredText(reason, 6, 'Debes indicar el motivo de la anulacion.'),
    anuladoPorId: actor.userId,
    anuladoPorNombre: actor.userName,
    anuladoFecha: new Date().toISOString(),
  }
}

export function buildGastosCompraMateriaPrima(
  bloque: BloqueOLote,
  actor?: GastoActor,
): Array<Omit<Gasto, 'id'>> {
  const fecha = normalizeDateOnly(bloque.fechaIngreso, 'La fecha de ingreso del bloque no es valida.')
  const responsable = normalizeOptionalText(bloque.proveedor) ?? normalizeOptionalText(actor?.userName) ?? 'Sistema'
  const etiqueta = `${bloque.tipo.toLowerCase()} ${bloque.nombre}`
  const proveedor = normalizeOptionalText(bloque.proveedor)
  const referenciaProveedor = proveedor ? `proveedor ${proveedor}` : 'proveedor no especificado'
  const createdAt = new Date().toISOString()

  const gastos: Array<Omit<Gasto, 'id'>> = []

  if (bloque.costo > 0) {
    gastos.push({
      createdAt,
      fecha,
      costo: normalizeCurrency(bloque.costo, 'El costo del bloque debe ser mayor que 0.'),
      tipo: 'Materia prima',
      flujo: 'Inventario',
      descripcion: `Compra de ${etiqueta} (${referenciaProveedor}).`,
      encargado: responsable,
      origen: 'sistema',
      origenModulo: 'bloques',
      referenciaId: bloque.id,
      creadoPorId: actor?.userId,
      creadoPorNombre: actor?.userName,
      estado: 'activo',
      anuladoPorId: undefined,
      anuladoPorNombre: undefined,
      anuladoFecha: undefined,
      motivoAnulacion: undefined,
    })
  }

  if (bloque.costoTransporte > 0) {
    gastos.push({
      createdAt,
      fecha,
      costo: normalizeCurrency(bloque.costoTransporte, 'El transporte del bloque debe ser mayor que 0.'),
      tipo: 'Transporte',
      flujo: 'Inventario',
      descripcion: `Transporte de ${etiqueta} (${referenciaProveedor}).`,
      encargado: responsable,
      origen: 'sistema',
      origenModulo: 'bloques',
      referenciaId: bloque.id,
      creadoPorId: actor?.userId,
      creadoPorNombre: actor?.userName,
      estado: 'activo',
      anuladoPorId: undefined,
      anuladoPorNombre: undefined,
      anuladoFecha: undefined,
      motivoAnulacion: undefined,
    })
  }

  return gastos
}

export function buildGastoNomina(
  pago: HistorialPago,
  trabajador: Trabajador | undefined,
  actor?: GastoActor,
): Omit<Gasto, 'id'> {
  const nombreTrabajador = normalizeOptionalText(pago.trabajadorNombre) ?? normalizeOptionalText(trabajador?.nombre) ?? 'Trabajador no identificado'
  const periodo = resolveMonthKey(pago.fecha)
  const flujo = resolvePayrollFlow(trabajador?.rol)
  const descripcionBase =
    pago.produccionIds.length > 0
      ? `Pago de nomina ligado a produccion para ${nombreTrabajador} (${periodo}).`
      : `Pago de nomina para ${nombreTrabajador} (${periodo}).`

  return {
    createdAt: pago.createdAt ?? new Date().toISOString(),
    fecha: normalizeDateOnly(pago.fecha, 'La fecha del pago no es valida.'),
    costo: normalizeCurrency(pago.totalPagado, 'El total pagado de la nomina debe ser mayor que 0.'),
    tipo: 'Nomina',
    flujo,
    descripcion: descripcionBase,
    encargado: nombreTrabajador,
    origen: 'sistema',
    origenModulo: 'pagos',
    referenciaId: pago.id,
    creadoPorId: pago.creadoPorId ?? actor?.userId,
    creadoPorNombre: pago.creadoPorNombre ?? actor?.userName,
    estado: 'activo',
    anuladoPorId: undefined,
    anuladoPorNombre: undefined,
    anuladoFecha: undefined,
    motivoAnulacion: undefined,
  }
}

export async function resolveGastoLedger(deps: LedgerDependencies): Promise<Gasto[]> {
  const [stored, bloques, historialPagos, trabajadores] = await Promise.all([
    deps.gastoRepository.findAll(),
    deps.bloqueRepository.findAll(),
    deps.historialPagoRepository.findAll(),
    deps.trabajadorRepository.findAll(),
  ])

  const normalizedStored = stored.map(normalizeStoredGasto)
  const ledger = normalizedStored.filter((item) => item.origen !== 'sistema')
  const storedSystemByKey = new Map(
    normalizedStored
      .filter((item) => item.origen === 'sistema' && item.referenciaId)
      .map((item) => [buildSystemExpenseKey(item.origenModulo, item.referenciaId as string, item.tipo), item]),
  )

  for (const bloque of bloques) {
    for (const gasto of buildGastosCompraMateriaPrima(bloque)) {
      const key = buildSystemExpenseKey(gasto.origenModulo, gasto.referenciaId as string, gasto.tipo)
      const storedSystem = storedSystemByKey.get(key)
      ledger.push(mergeDerivedSystemExpense(gasto, storedSystem))
    }
  }

  const trabajadoresPorId = new Map(trabajadores.map((item) => [item.id, item]))
  for (const pago of historialPagos) {
    const gasto = buildGastoNomina(pago, trabajadoresPorId.get(pago.trabajadorId))
    const key = buildSystemExpenseKey(gasto.origenModulo, gasto.referenciaId as string, gasto.tipo)
    const storedSystem = storedSystemByKey.get(key)
    ledger.push(mergeDerivedSystemExpense(gasto, storedSystem))
  }

  return ledger.sort(compareGastosDesc)
}

function normalizeStoredGasto(input: Gasto): Gasto {
  return {
    ...input,
    createdAt: normalizeOptionalText(input.createdAt),
    fecha: normalizeDateOnly(input.fecha, 'La fecha del gasto no es valida.'),
    costo: Number.isFinite(input.costo) ? round2(input.costo) : 0,
    descripcion: normalizeRequiredText(input.descripcion, 1, 'La descripcion del gasto es requerida.'),
    encargado: normalizeRequiredText(input.encargado, 1, 'El encargado del gasto es requerido.'),
    origen: input.origen ?? 'manual',
    origenModulo: input.origenModulo ?? 'gastos',
    referenciaId: normalizeOptionalText(input.referenciaId),
    creadoPorId: normalizeOptionalText(input.creadoPorId),
    creadoPorNombre: normalizeOptionalText(input.creadoPorNombre),
    estado: input.estado ?? 'activo',
    anuladoPorId: normalizeOptionalText(input.anuladoPorId),
    anuladoPorNombre: normalizeOptionalText(input.anuladoPorNombre),
    anuladoFecha: normalizeOptionalText(input.anuladoFecha),
    motivoAnulacion: normalizeOptionalText(input.motivoAnulacion),
  }
}

function buildSystemExpenseKey(origenModulo: Gasto['origenModulo'], referenciaId: string, tipo: Gasto['tipo']): string {
  return `${origenModulo}::${referenciaId}::${tipo}`
}

function buildSyntheticExpenseId(origenModulo: Gasto['origenModulo'], referenciaId: string, tipo: Gasto['tipo']): string {
  const suffix = tipo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
  return `AUTO-${origenModulo.toUpperCase()}-${referenciaId}-${suffix}`
}

function mergeDerivedSystemExpense(
  derived: Omit<Gasto, 'id'>,
  stored: Gasto | undefined,
): Gasto {
  return {
    ...derived,
    id:
      stored?.id ??
      buildSyntheticExpenseId(derived.origenModulo, derived.referenciaId as string, derived.tipo),
    createdAt: stored?.createdAt ?? derived.createdAt,
    creadoPorId: stored?.creadoPorId ?? derived.creadoPorId,
    creadoPorNombre: stored?.creadoPorNombre ?? derived.creadoPorNombre,
    estado: 'activo',
    anuladoPorId: undefined,
    anuladoPorNombre: undefined,
    anuladoFecha: undefined,
    motivoAnulacion: undefined,
  }
}

function compareGastosDesc(left: Gasto, right: Gasto): number {
  const byFecha = right.fecha.localeCompare(left.fecha)
  if (byFecha !== 0) return byFecha

  const leftCreatedAt = left.createdAt ?? ''
  const rightCreatedAt = right.createdAt ?? ''
  const byCreatedAt = rightCreatedAt.localeCompare(leftCreatedAt)
  if (byCreatedAt !== 0) return byCreatedAt

  return right.id.localeCompare(left.id)
}

function normalizeDateOnly(raw: string, message: string): string {
  const value = raw.trim()
  if (!value) throw new DomainError(message, 400, 'GASTO_FECHA_INVALIDA')
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new DomainError(message, 400, 'GASTO_FECHA_INVALIDA')
  }

  return parsed.toISOString().slice(0, 10)
}

function normalizeCurrency(value: number, message: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new DomainError(message, 400, 'GASTO_COSTO_INVALIDO')
  }
  return round2(value)
}

function normalizeRequiredText(raw: string, minLength: number, message: string): string {
  const value = raw.trim().replace(/\s+/g, ' ')
  if (value.length < minLength) {
    throw new DomainError(message, 400, 'GASTO_TEXTO_INVALIDO')
  }
  return value
}

function normalizeOptionalText(raw: string | undefined | null): string | undefined {
  if (typeof raw !== 'string') return undefined
  const value = raw.trim().replace(/\s+/g, ' ')
  return value.length > 0 ? value : undefined
}

function resolveMonthKey(rawDate: string): string {
  const normalized = normalizeDateOnly(rawDate, 'La fecha del pago no es valida.')
  return normalized.slice(0, 7)
}

function resolvePayrollFlow(role: Trabajador['rol'] | undefined): GastoFlujo {
  if (!role) return 'Administracion'
  const normalizedRole = role
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  if (normalizedRole.includes('obrero') || normalizedRole.includes('produccion')) return 'Produccion'
  if (normalizedRole.includes('almacen')) return 'Inventario'
  if (normalizedRole.includes('venta')) return 'Ventas'
  return 'Administracion'
}

function round2(value: number): number {
  return Number(value.toFixed(2))
}
