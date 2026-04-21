import { DomainError } from '../../errors/domain.error.js'
import type {
  AprobarEntradaProduccionAlmacenDto,
  AnularProduccionMonoHiloDto,
  AnularProduccionMonoHiloResponseDto,
  AprobarProduccionTallerDto,
  CreateProduccionDto,
  CreateProduccionTrabajadorDto,
  ProduccionResponseDto,
  ProduccionTrabajadorResponseDto,
  UpdateProduccionDto,
  UpdateProduccionTrabajadorDto,
} from '../../dtos/index.js'
import type {
  EstadoInventario,
  InventarioMovimientoDetalle,
  ProduccionDetalleAccion,
  ProduccionDiaria,
  ProduccionTrabajador,
  Trabajador,
} from '../../../domain/entities/index.js'
import type {
  BloqueRepositoryPort,
  ConfiguracionPort,
  InventarioMovimientoRepositoryPort,
  ProduccionRepositoryPort,
  ProduccionTrabajadorRepositoryPort,
  ProductoRepositoryPort,
  MonoHiloMasaRepositoryPort,
  TrabajadorRepositoryPort,
} from '../../../domain/ports/index.js'
import { applyInventarioEntrada } from '../inventario-movimientos/inventario-movimiento.helpers.js'
import { consumeMonoHiloMasasParaPicado } from '../mono-hilo/mono-hilo.use-cases.js'

interface ProduccionActor {
  userId: string
  userName: string
}

const PLANCHA_DIMENSIONS = ['160x65', '160x60'] as const
const DEFAULT_PLANCHA_DIMENSION = PLANCHA_DIMENSIONS[0]

export class GetProduccionUseCase {
  constructor(private readonly repository: ProduccionRepositoryPort) {}

  async execute(): Promise<ProduccionResponseDto[]> {
    return this.repository.findAll()
  }
}

export class GetProduccionByIdUseCase {
  constructor(private readonly repository: ProduccionRepositoryPort) {}

  async execute(id: string): Promise<ProduccionResponseDto | null> {
    return this.repository.findById(id)
  }
}

export class CreateProduccionUseCase {
  constructor(
    private readonly repository: ProduccionRepositoryPort,
    private readonly productoRepository: ProductoRepositoryPort,
    private readonly monoHiloRepository: MonoHiloMasaRepositoryPort,
    private readonly produccionTrabajadorRepository: ProduccionTrabajadorRepositoryPort,
    private readonly trabajadorRepository: TrabajadorRepositoryPort,
    private readonly configuracionPort: ConfiguracionPort,
  ) {}

  async execute(dto: CreateProduccionDto, actor: ProduccionActor): Promise<ProduccionResponseDto> {
    const normalizedDto = normalizeProduccionDto(dto)
    if (isMonoHiloWorkflow(normalizedDto)) {
      validateMonoHiloProduccionDto(normalizedDto)
    } else {
      validateResinaConsumo(normalizedDto)
      await consumeMonoHiloMasasParaPicado(
        {
          bloqueId: normalizedDto.origenId,
          dimension: normalizedDto.dimension,
          cantidadLosas: normalizedDto.cantidadPicar,
        },
        this.monoHiloRepository,
      )
      await consumeProcesoStockParaProduccion(normalizedDto, this.productoRepository)
    }

    const created = await this.repository.create({
      ...normalizedDto,
      creadoPorId: actor.userId,
      creadoPorNombre: actor.userName,
      workflowTipo: normalizedDto.workflowTipo ?? 'regular',
      estadoRegistro: normalizedDto.estadoRegistro ?? 'activo',
      aprobacionTallerEstado: 'pendiente',
      aprobacionAlmacenEstado: 'pendiente',
      inventarioAplicado: false,
      movimientoInventarioIds: [],
    })

    if (!isMonoHiloWorkflow(created)) {
      await createProduccionTrabajadoresForRegistro(
        created,
        this.produccionTrabajadorRepository,
        this.trabajadorRepository,
        this.configuracionPort,
      )
    }

    return created
  }
}

export class ApproveProduccionTallerUseCase {
  constructor(private readonly repository: ProduccionRepositoryPort) {}

  async execute(
    id: string,
    dto: AprobarProduccionTallerDto,
    actor: ProduccionActor,
  ): Promise<ProduccionResponseDto> {
    const produccion = await this.repository.findById(id)
    if (!produccion) {
      throw new DomainError(`Produccion ${id} no existe`, 404, 'PRODUCCION_NOT_FOUND')
    }

    if (isMonoHiloWorkflow(produccion)) {
      throw new DomainError(
        'Los registros de mono hilo no participan en la aprobacion de taller.',
        409,
        'PRODUCCION_MONO_HILO_TALLER_INVALIDA',
      )
    }

    if (produccion.inventarioAplicado) {
      throw new DomainError(
        'La produccion ya fue aplicada al inventario y no puede cambiarse su aprobacion de taller.',
        409,
        'PRODUCCION_INVENTARIO_CERRADO',
      )
    }

    const now = new Date().toISOString()

    if (!dto.aprobado) {
      const motivoRechazo = dto.motivoRechazo?.trim()
      if (!motivoRechazo) {
        throw new DomainError(
          'Debe indicar un motivo de rechazo para taller.',
          400,
          'PRODUCCION_TALLER_MOTIVO_REQUERIDO',
        )
      }

      const rejected = await this.repository.update(id, {
        aprobacionTallerEstado: 'rechazado',
        aprobacionTallerPorId: actor.userId,
        aprobacionTallerPorNombre: actor.userName,
        aprobacionTallerFecha: now,
        aprobacionTallerMotivoRechazo: motivoRechazo,
        aprobacionAlmacenEstado: 'pendiente',
        aprobacionAlmacenPorId: undefined,
        aprobacionAlmacenPorNombre: undefined,
        aprobacionAlmacenFecha: undefined,
        aprobacionAlmacenMotivo: undefined,
        inventarioAplicado: false,
      })

      if (!rejected) {
        throw new DomainError(
          `No se pudo actualizar produccion ${id}`,
          500,
          'PRODUCCION_UPDATE_FAILED',
        )
      }

      return rejected
    }

    const approved = await this.repository.update(id, {
      aprobacionTallerEstado: 'aprobado',
      aprobacionTallerPorId: actor.userId,
      aprobacionTallerPorNombre: actor.userName,
      aprobacionTallerFecha: now,
      aprobacionTallerMotivoRechazo: undefined,
    })

    if (!approved) {
      throw new DomainError(
        `No se pudo actualizar produccion ${id}`,
        500,
        'PRODUCCION_UPDATE_FAILED',
      )
    }

    return approved
  }
}

export class ApproveEntradaProduccionAlmacenUseCase {
  constructor(
    private readonly repository: ProduccionRepositoryPort,
    private readonly bloqueRepository: BloqueRepositoryPort,
    private readonly productoRepository: ProductoRepositoryPort,
    private readonly movimientoRepository: InventarioMovimientoRepositoryPort,
  ) {}

  async execute(
    id: string,
    dto: AprobarEntradaProduccionAlmacenDto,
    actor: ProduccionActor,
  ): Promise<ProduccionResponseDto> {
    const produccion = await this.repository.findById(id)
    if (!produccion) {
      throw new DomainError(`Produccion ${id} no existe`, 404, 'PRODUCCION_NOT_FOUND')
    }

    if (isMonoHiloWorkflow(produccion)) {
      throw new DomainError(
        'Los registros de mono hilo no generan entrada a almacen.',
        409,
        'PRODUCCION_MONO_HILO_ALMACEN_INVALIDA',
      )
    }

    if (produccion.aprobacionTallerEstado !== 'aprobado') {
      throw new DomainError(
        'La produccion debe estar aprobada por taller antes de dar entrada a almacen.',
        409,
        'PRODUCCION_TALLER_NO_APROBADA',
      )
    }

    if (produccion.inventarioAplicado || produccion.aprobacionAlmacenEstado === 'aprobado') {
      throw new DomainError(
        'La produccion ya fue aplicada en almacen.',
        409,
        'PRODUCCION_ALMACEN_YA_APROBADA',
      )
    }

    const motivo = dto.motivo.trim()
    if (motivo.length < 5) {
      throw new DomainError(
        'Debe registrar un motivo valido para dar entrada de almacen.',
        400,
        'PRODUCCION_ALMACEN_MOTIVO_REQUERIDO',
      )
    }

    const detallesEntrada = buildDetallesEntradaDesdeProduccion(produccion)
    if (detallesEntrada.length === 0) {
      throw new DomainError(
        'La produccion no tiene losas efectivas para ingresar a inventario.',
        409,
        'PRODUCCION_SIN_ENTRADA_EFECTIVA',
      )
    }

    await applyInventarioEntrada(detallesEntrada, this.productoRepository)
    await actualizarBloquePorProduccion(produccion, this.bloqueRepository)

    const now = new Date().toISOString()
    const movimiento = await this.movimientoRepository.create({
      fechaSolicitud: now,
      fechaResolucion: now,
      tipo: 'entrada',
      origen: 'produccion',
      estado: 'aprobado',
      referenciaId: produccion.id,
      motivo,
      observaciones: `Entrada aprobada para produccion ${produccion.id}`,
      solicitadoPorId: produccion.aprobacionTallerPorId,
      solicitadoPorNombre: produccion.aprobacionTallerPorNombre,
      aprobadoPorId: actor.userId,
      aprobadoPorNombre: actor.userName,
      detalles: detallesEntrada,
    })

    const movimientoInventarioIds = produccion.movimientoInventarioIds?.includes(movimiento.id)
      ? (produccion.movimientoInventarioIds ?? [])
      : [...(produccion.movimientoInventarioIds ?? []), movimiento.id]

    const updated = await this.repository.update(id, {
      aprobacionAlmacenEstado: 'aprobado',
      aprobacionAlmacenPorId: actor.userId,
      aprobacionAlmacenPorNombre: actor.userName,
      aprobacionAlmacenFecha: now,
      aprobacionAlmacenMotivo: motivo,
      inventarioAplicado: true,
      movimientoInventarioIds,
    })

    if (!updated) {
      throw new DomainError(
        `No se pudo actualizar produccion ${id}`,
        500,
        'PRODUCCION_UPDATE_FAILED',
      )
    }

    return updated
  }
}

export class CancelMonoHiloProduccionUseCase {
  constructor(
    private readonly repository: ProduccionRepositoryPort,
    private readonly monoHiloRepository: MonoHiloMasaRepositoryPort,
  ) {}

  async execute(
    id: string,
    dto: AnularProduccionMonoHiloDto,
    actor: ProduccionActor,
  ): Promise<AnularProduccionMonoHiloResponseDto> {
    const produccion = await this.repository.findById(id)
    if (!produccion) {
      throw new DomainError(`Produccion ${id} no existe`, 404, 'PRODUCCION_NOT_FOUND')
    }

    if (!isMonoHiloWorkflow(produccion)) {
      throw new DomainError(
        'Solo los registros de mono hilo admiten anulacion controlada.',
        409,
        'PRODUCCION_ANULACION_NO_MONO_HILO',
      )
    }

    if (produccion.estadoRegistro === 'anulado') {
      throw new DomainError(
        'El registro de mono hilo ya fue anulado.',
        409,
        'PRODUCCION_MONO_HILO_YA_ANULADA',
      )
    }

    const motivo = dto.motivo.trim()
    if (motivo.length < 5) {
      throw new DomainError(
        'Debe indicar un motivo de anulacion de al menos 5 caracteres.',
        400,
        'PRODUCCION_MONO_HILO_MOTIVO_REQUERIDO',
      )
    }

    const masaIds = [...new Set((produccion.monoHiloDetalle?.masas ?? []).map((masa) => masa.masaId).filter(Boolean))]
    if (masaIds.length === 0) {
      throw new DomainError(
        'El registro de mono hilo no tiene masas enlazadas para anular.',
        409,
        'PRODUCCION_MONO_HILO_SIN_MASAS',
      )
    }

    const masas = await Promise.all(
      masaIds.map(async (masaId) => {
        const masa = await this.monoHiloRepository.findById(masaId)
        if (!masa) {
          throw new DomainError(
            `La masa ${masaId} asociada al registro no existe.`,
            404,
            'MONO_HILO_MASA_NOT_FOUND',
          )
        }
        return masa
      }),
    )

    const masaConsumida = masas.find((masa) =>
      Object.values(masa.estimados).some((estimado) => estimado.losasConsumidas > 0),
    )
    if (masaConsumida) {
      throw new DomainError(
        `No se puede anular el registro porque la masa ${masaConsumida.codigo} ya tiene consumo en picado.`,
        409,
        'PRODUCCION_MONO_HILO_ANULACION_CONSUMIDA',
      )
    }

    const now = new Date().toISOString()

    try {
      const masasActualizadas = await Promise.all(
        masas.map(async (masa) => {
          const updated = await this.monoHiloRepository.update(masa.id, {
            estado: 'anulada',
            ubicacion: 'almacen',
            anulacionMotivo: motivo,
            anuladoPorId: actor.userId,
            anuladoPorNombre: actor.userName,
            anuladoFecha: now,
          })

          if (!updated) {
            throw new DomainError(
              `No se pudo anular la masa ${masa.id}.`,
              500,
              'MONO_HILO_MASA_ANULACION_FAILED',
            )
          }

          return updated
        }),
      )

      const updatedProduccion = await this.repository.update(id, {
        estadoRegistro: 'anulado',
        anulacionMotivo: motivo,
        anuladoPorId: actor.userId,
        anuladoPorNombre: actor.userName,
        anuladoFecha: now,
      })

      if (!updatedProduccion) {
        throw new DomainError(
          `No se pudo actualizar produccion ${id}.`,
          500,
          'PRODUCCION_UPDATE_FAILED',
        )
      }

      return {
        produccion: updatedProduccion,
        masas: masasActualizadas,
      }
    } catch (error) {
      await Promise.all(
        masas.map(async (masa) => {
          try {
            await this.monoHiloRepository.update(masa.id, {
              produccionId: masa.produccionId,
              ubicacion: masa.ubicacion,
              estado: masa.estado,
              anulacionMotivo: masa.anulacionMotivo,
              anuladoPorId: masa.anuladoPorId,
              anuladoPorNombre: masa.anuladoPorNombre,
              anuladoFecha: masa.anuladoFecha,
            })
          } catch {
            // Best effort rollback.
          }
        }),
      )

      throw error
    }
  }
}

export class UpdateProduccionUseCase {
  constructor(private readonly repository: ProduccionRepositoryPort) {}

  async execute(id: string, dto: UpdateProduccionDto): Promise<ProduccionResponseDto | null> {
    const current = await this.repository.findById(id)
    if (!current) {
      return null
    }

    if (current.aprobacionTallerEstado === 'aprobado' || current.inventarioAplicado) {
      throw new DomainError(
        'No se puede editar una produccion ya aprobada.',
        409,
        'PRODUCCION_EDIT_LOCKED',
      )
    }

    if (isMonoHiloWorkflow(current)) {
      throw new DomainError(
        'Los registros de mono hilo no se editan desde este modulo.',
        409,
        'PRODUCCION_MONO_HILO_EDIT_LOCKED',
      )
    }

    if (current.cantidadPicar > 0) {
      throw new DomainError(
        'No se puede editar una produccion de picado porque ya consumio masas de mono hilo.',
        409,
        'PRODUCCION_EDIT_PICADO_LOCKED',
      )
    }

    if (
      current.cantidadEscuadrar > 0 ||
      current.cantidadDevastar > 0 ||
      current.cantidadResinar > 0 ||
      current.cantidadPulir > 0
    ) {
      throw new DomainError(
        'No se puede editar una produccion de escuadrado/devastado/resinado/pulido porque consume stock fuera de almacen.',
        409,
        'PRODUCCION_EDIT_PROCESO_LOCKED',
      )
    }

    return this.repository.update(id, dto)
  }
}

export class DeleteProduccionUseCase {
  constructor(private readonly repository: ProduccionRepositoryPort) {}

  async execute(id: string): Promise<boolean> {
    const current = await this.repository.findById(id)
    if (!current) {
      return false
    }

    if (isMonoHiloWorkflow(current)) {
      throw new DomainError(
        'No se puede eliminar un registro de mono hilo porque dejaria masas sin trazabilidad.',
        409,
        'PRODUCCION_DELETE_MONO_HILO_LOCKED',
      )
    }

    if (current.inventarioAplicado) {
      throw new DomainError(
        'No se puede eliminar una produccion que ya movio inventario.',
        409,
        'PRODUCCION_DELETE_LOCKED',
      )
    }

    if (!isMonoHiloWorkflow(current) && current.cantidadPicar > 0) {
      throw new DomainError(
        'No se puede eliminar una produccion de picado porque ya consumio masas de mono hilo.',
        409,
        'PRODUCCION_DELETE_PICADO_LOCKED',
      )
    }

    if (
      current.cantidadEscuadrar > 0 ||
      current.cantidadDevastar > 0 ||
      current.cantidadResinar > 0 ||
      current.cantidadPulir > 0
    ) {
      throw new DomainError(
        'No se puede eliminar una produccion de escuadrado/devastado/resinado/pulido porque consume stock fuera de almacen.',
        409,
        'PRODUCCION_DELETE_PROCESO_LOCKED',
      )
    }

    return this.repository.delete(id)
  }
}

// Produccion Trabajadores
export class GetProduccionTrabajadoresUseCase {
  constructor(private readonly repository: ProduccionTrabajadorRepositoryPort) {}

  async execute(): Promise<ProduccionTrabajadorResponseDto[]> {
    return this.repository.findAll()
  }
}

export class GetProduccionTrabajadorByIdUseCase {
  constructor(private readonly repository: ProduccionTrabajadorRepositoryPort) {}

  async execute(id: string): Promise<ProduccionTrabajadorResponseDto | null> {
    return this.repository.findById(id)
  }
}

export class CreateProduccionTrabajadorUseCase {
  constructor(private readonly repository: ProduccionTrabajadorRepositoryPort) {}

  async execute(dto: CreateProduccionTrabajadorDto): Promise<ProduccionTrabajadorResponseDto> {
    return this.repository.create(dto)
  }
}

export class UpdateProduccionTrabajadorUseCase {
  constructor(private readonly repository: ProduccionTrabajadorRepositoryPort) {}

  async execute(
    id: string,
    dto: UpdateProduccionTrabajadorDto,
  ): Promise<ProduccionTrabajadorResponseDto | null> {
    return this.repository.update(id, dto)
  }
}

export class DeleteProduccionTrabajadorUseCase {
  constructor(private readonly repository: ProduccionTrabajadorRepositoryPort) {}

  async execute(id: string): Promise<boolean> {
    return this.repository.delete(id)
  }
}

function buildDetallesEntradaDesdeProduccion(
  registro: ProduccionDiaria,
): InventarioMovimientoDetalle[] {
  const totalPerdidasPorAccion = buildPerdidasPorAccion(registro.detallesAcciones)
  const mapaEstado: Record<'picar' | 'escuadrar' | 'devastar' | 'resinar' | 'pulir', EstadoInventario> = {
    picar: 'Picado',
    escuadrar: 'Escuadrado',
    devastar: 'Devastado',
    resinar: 'Resinado',
    pulir: 'Pulido',
  }

  const acciones = [
    { accion: 'picar', cantidad: registro.cantidadPicar },
    { accion: 'escuadrar', cantidad: registro.cantidadEscuadrar },
    { accion: 'devastar', cantidad: registro.cantidadDevastar },
    { accion: 'resinar', cantidad: registro.cantidadResinar },
    { accion: 'pulir', cantidad: registro.cantidadPulir },
  ] as const

  const detalles: InventarioMovimientoDetalle[] = []

  for (const { accion, cantidad } of acciones) {
    const perdidas = totalPerdidasPorAccion[accion] ?? 0
    const efectivas = Math.max(0, cantidad - perdidas)
    if (efectivas <= 0) {
      continue
    }

    const estado = mapaEstado[accion]
    const metros = round2(efectivas * dimensionToArea(registro.dimension))

    detalles.push({
      id: `imd-${accion}-${registro.id}`,
      productoNombre: `${registro.tipo} ${registro.origenNombre} ${registro.dimension} ${estado}`,
      tipo: registro.tipo,
      estado,
      dimension: registro.dimension,
      origenId: registro.origenId,
      origenNombre: registro.origenNombre,
      cantidadLosas: efectivas,
      metrosCuadrados: metros,
    })
  }

  return detalles
}

async function actualizarBloquePorProduccion(
  dto: Pick<ProduccionDiaria, 'origenId' | 'dimension' | 'totalM2' | 'totalLosas' | 'detallesAcciones'>,
  bloqueRepository: BloqueRepositoryPort,
): Promise<void> {
  const bloque = await bloqueRepository.findById(dto.origenId)
  if (!bloque) {
    return
  }

  const totalLosasPerdidas =
    dto.detallesAcciones?.reduce(
      (sum, item) => sum + (item.accion === 'picar' ? 0 : (item.losasMermaTotal ?? 0)),
      0,
    ) ?? 0
  const totalM2Perdidos =
    dto.detallesAcciones?.reduce((sum, item) => {
      if (item.accion === 'picar') {
        return sum
      }
      if (item.metrosMermaTotal != null) {
        return sum + item.metrosMermaTotal
      }
      return sum + (item.losasMermaTotal ?? 0) * dimensionToArea(dto.dimension)
    }, 0) ?? 0

  const metrosVendibles = round2(Math.max(0, bloque.metrosVendibles + dto.totalM2 - totalM2Perdidos))
  await bloqueRepository.update(bloque.id, {
    losasProducidas: bloque.losasProducidas + dto.totalLosas,
    losasPerdidas: bloque.losasPerdidas + totalLosasPerdidas,
    metrosVendibles,
    estado: bloque.estado === 'vendido' ? 'vendido' : metrosVendibles <= 0 ? 'agotado' : bloque.estado,
  })
}

function buildPerdidasPorAccion(
  detalles: ProduccionDetalleAccion[] | undefined,
) : Record<'picar' | 'escuadrar' | 'devastar' | 'resinar' | 'pulir', number> {
  const acc = {
    picar: 0,
    escuadrar: 0,
    devastar: 0,
    resinar: 0,
    pulir: 0,
  } as Record<'picar' | 'escuadrar' | 'devastar' | 'resinar' | 'pulir', number>

  for (const detalle of detalles ?? []) {
    const mermaLosas = detalle.accion === 'picar' ? 0 : (detalle.losasMermaTotal ?? 0)
    const totalPartidas = mermaLosas + (detalle.losasReutilizables ?? 0)
    acc[detalle.accion] += totalPartidas
  }

  return acc
}

function normalizeProduccionDto(dto: CreateProduccionDto): CreateProduccionDto {
  if (dto.tipo !== 'Plancha') return dto
  const planchaDimension = normalizePlanchaDimension(dto.dimension)

  const detallesAcciones = dto.detallesAcciones?.map((detalle) => {
    const losasMermaTotal = detalle.losasMermaTotal ?? 0
    const losasReutilizables = detalle.losasReutilizables ?? 0

    return {
      ...detalle,
      metrosCuadrados: round2(detalle.cantidadLosas * dimensionToArea(planchaDimension)),
      metrosMermaTotal: round2(losasMermaTotal * dimensionToArea(planchaDimension)),
      metrosReutilizables: round2(losasReutilizables * dimensionToArea(planchaDimension)),
    }
  })

  return {
    ...dto,
    dimension: planchaDimension,
    totalM2: round2(dto.totalLosas * dimensionToArea(planchaDimension)),
    detallesAcciones,
  }
}

function dimensionToArea(dimension: ProduccionDiaria['dimension']): number {
  if (dimension === '40x40') return 1 / 6
  if (dimension === '60x40') return 1 / 4
  if (dimension === '80x40') return 1 / 3
  if (dimension === '160x60') return 0.96
  if (dimension === '160x65') return 1.04
  return 1 / 3
}

function normalizePlanchaDimension(
  dimension: ProduccionDiaria['dimension'],
): ProduccionDiaria['dimension'] {
  return PLANCHA_DIMENSIONS.includes(dimension as (typeof PLANCHA_DIMENSIONS)[number])
    ? dimension
    : DEFAULT_PLANCHA_DIMENSION
}

function round2(value: number): number {
  return Number(value.toFixed(2))
}

function validateResinaConsumo(dto: CreateProduccionDto): void {
  if (dto.cantidadResinar <= 0) return

  const detallesResinar = (dto.detallesAcciones ?? []).filter((detalle) => detalle.accion === 'resinar')
  if (detallesResinar.length === 0) {
    throw new DomainError(
      'La produccion de resinado requiere detalle de consumo de resina.',
      400,
      'PRODUCCION_RESINA_DETALLE_REQUERIDO',
    )
  }

  const consumoInvalido = detallesResinar.some(
    (detalle) => !Number.isFinite(detalle.cantidadResina) || (detalle.cantidadResina ?? 0) <= 0,
  )
  if (consumoInvalido) {
    throw new DomainError(
      'Cada detalle de resinado debe incluir cantidad de resina mayor a 0.',
      400,
      'PRODUCCION_RESINA_CANTIDAD_INVALIDA',
    )
  }
}

function isMonoHiloWorkflow(
  dto: Pick<ProduccionDiaria, 'workflowTipo'> | Pick<CreateProduccionDto, 'workflowTipo'>,
): boolean {
  return dto.workflowTipo === 'mono_hilo'
}

function validateMonoHiloProduccionDto(dto: CreateProduccionDto): void {
  if (
    dto.cantidadPicar > 0 ||
    dto.cantidadEscuadrar > 0 ||
    dto.cantidadDevastar > 0 ||
    dto.cantidadResinar > 0 ||
    dto.cantidadPulir > 0
  ) {
    throw new DomainError(
      'El registro de mono hilo no puede crear acciones de losas directas.',
      400,
      'PRODUCCION_MONO_HILO_ACCIONES_INVALIDAS',
    )
  }

  if ((dto.detallesAcciones?.length ?? 0) > 0) {
    throw new DomainError(
      'El registro de mono hilo no admite detalles de acciones de losas.',
      400,
      'PRODUCCION_MONO_HILO_DETALLES_INVALIDOS',
    )
  }

  const detalle = dto.monoHiloDetalle
  if (!detalle || detalle.masas.length === 0) {
    throw new DomainError(
      'El registro de mono hilo requiere las masas creadas y el personal participante.',
      400,
      'PRODUCCION_MONO_HILO_DETALLE_REQUERIDO',
    )
  }
}

async function createProduccionTrabajadoresForRegistro(
  produccion: ProduccionDiaria,
  produccionTrabajadorRepository: ProduccionTrabajadorRepositoryPort,
  trabajadorRepository: TrabajadorRepositoryPort,
  configuracionPort: ConfiguracionPort,
): Promise<void> {
  const registros = await buildProduccionTrabajadores(produccion, trabajadorRepository, configuracionPort)
  if (registros.length === 0) {
    return
  }

  const impactos = new Map<string, { losas: number; pago: number }>()

  for (const registro of registros) {
    await produccionTrabajadorRepository.create(registro)
    const impacto = impactos.get(registro.trabajadorId) ?? { losas: 0, pago: 0 }
    impacto.losas += registro.cantidadLosas
    impacto.pago += registro.pagoFinal
    impactos.set(registro.trabajadorId, impacto)
  }

  const trabajadores = await trabajadorRepository.findAll()
  const trabajadoresById = new Map(trabajadores.map((trabajador) => [trabajador.id, trabajador]))

  for (const [trabajadorId, impacto] of impactos.entries()) {
    const trabajador = trabajadoresById.get(trabajadorId)
    if (!trabajador) continue

    const updated = await trabajadorRepository.update(trabajadorId, {
      losasProducidas: trabajador.losasProducidas + impacto.losas,
      acumuladoPendiente: round2(trabajador.acumuladoPendiente + impacto.pago),
    })

    if (!updated) {
      throw new DomainError(
        `No se pudo actualizar trabajador ${trabajadorId} tras registrar produccion.`,
        500,
        'PRODUCCION_TRABAJADOR_UPDATE_FAILED',
      )
    }
  }
}

async function buildProduccionTrabajadores(
  produccion: ProduccionDiaria,
  trabajadorRepository: TrabajadorRepositoryPort,
  configuracionPort: ConfiguracionPort,
): Promise<Array<Omit<ProduccionTrabajador, 'id'>>> {
  const detalles = produccion.detallesAcciones ?? []
  if (detalles.length === 0) {
    return []
  }

  const configuracion = await configuracionPort.get()
  const trabajadores = await trabajadorRepository.findAll()
  const trabajadoresById = new Map(trabajadores.map((trabajador) => [trabajador.id, trabajador]))
  const registros: Array<Omit<ProduccionTrabajador, 'id'>> = []

  for (const detalle of detalles) {
    const trabajadoresDetalle = resolveDetalleObreros(detalle, trabajadoresById)
    if (trabajadoresDetalle.length === 0) {
      continue
    }

    const repartoLosas = splitIntegerTotal(detalle.cantidadLosas, trabajadoresDetalle.length)
    const losasPagablesEquipo = Math.max(
      0,
      detalle.cantidadLosas - Math.max(0, detalle.losasMermaTotal ?? 0),
    )
    const repartoPagable = splitIntegerTotal(losasPagablesEquipo, trabajadoresDetalle.length)

    trabajadoresDetalle.forEach((trabajador, index) => {
      const cantidadLosas = repartoLosas[index] ?? 0
      const losasPagables = repartoPagable[index] ?? 0
      if (cantidadLosas <= 0 && losasPagables <= 0) {
        return
      }
      const tarifa = resolveTarifaProduccion(trabajador, detalle.accion, configuracion)
      const pagoTotal = round2(losasPagables * tarifa)

      registros.push({
        fecha: produccion.fecha,
        produccionId: produccion.id,
        produccionDetalleId: detalle.id,
        trabajadorId: trabajador.id,
        trabajadorNombre: trabajador.nombre,
        accion: detalle.accion,
        origenId: produccion.origenId,
        origenNombre: produccion.origenNombre,
        tipo: produccion.tipo,
        dimension: produccion.dimension,
        cantidadLosas,
        pagoPorLosa: tarifa,
        pagoTotal,
        bono: 0,
        pagoFinal: pagoTotal,
        pagado: false,
      })
    })
  }

  return registros
}

function resolveDetalleObreros(
  detalle: ProduccionDetalleAccion,
  trabajadoresById: Map<string, Trabajador>,
): Trabajador[] {
  const ids = (detalle.trabajadores?.length ?? 0) > 0
    ? detalle.trabajadores!.map((trabajador) => trabajador.id)
    : detalle.trabajadorId
      ? [detalle.trabajadorId]
      : []

  return [...new Set(ids)]
    .map((trabajadorId) => trabajadoresById.get(trabajadorId))
    .filter((trabajador): trabajador is Trabajador => Boolean(trabajador))
    .filter((trabajador) => trabajador.estado === 'activo' && trabajador.rol === 'Obrero')
}

function resolveTarifaProduccion(
  trabajador: Trabajador,
  accion: ProduccionDetalleAccion['accion'],
  configuracion: Awaited<ReturnType<ConfiguracionPort['get']>>,
): number {
  return trabajador.tarifasPersonalizadas?.[accion] ?? configuracion.tarifasGlobales[accion]
}

function splitIntegerTotal(total: number, parts: number): number[] {
  if (parts <= 0) return []
  const normalizedTotal = Math.max(0, Math.trunc(total))
  const base = Math.floor(normalizedTotal / parts)
  const remainder = normalizedTotal % parts

  return Array.from({ length: parts }, (_, index) => (index < remainder ? base + 1 : base))
}

const estadoRequeridoProcesoPorAccion: Record<
  'escuadrar' | 'devastar' | 'resinar' | 'pulir',
  EstadoInventario
> = {
  escuadrar: 'Picado',
  devastar: 'Escuadrado',
  resinar: 'Devastado',
  pulir: 'Resinado',
}

async function consumeProcesoStockParaProduccion(
  dto: CreateProduccionDto,
  productoRepository: ProductoRepositoryPort,
): Promise<void> {
  const consumos: Array<{ accion: 'escuadrar' | 'devastar' | 'resinar' | 'pulir'; cantidad: number }> = [
    { accion: 'escuadrar', cantidad: dto.cantidadEscuadrar },
    { accion: 'devastar', cantidad: dto.cantidadDevastar },
    { accion: 'resinar', cantidad: dto.cantidadResinar },
    { accion: 'pulir', cantidad: dto.cantidadPulir },
  ]

  for (const consumo of consumos) {
    if (consumo.cantidad <= 0) continue

    const estadoRequerido = estadoRequeridoProcesoPorAccion[consumo.accion]
    const inventario = await productoRepository.findAll()
    const candidatos = inventario
      .filter((producto) => producto.ubicacion === 'proceso')
      .filter((producto) => producto.origenId === dto.origenId)
      .filter((producto) => producto.tipo === dto.tipo)
      .filter((producto) => producto.dimension === dto.dimension)
      .filter((producto) => producto.estado === estadoRequerido)
      .filter((producto) => producto.cantidadLosas > 0)
      .sort((a, b) => b.cantidadLosas - a.cantidadLosas)

    const disponible = candidatos.reduce((sum, producto) => sum + producto.cantidadLosas, 0)
    if (disponible < consumo.cantidad) {
      throw new DomainError(
        `Stock insuficiente fuera de almacen para ${consumo.accion}. Requiere estado ${estadoRequerido}.`,
        409,
        'PRODUCCION_PROCESO_STOCK_INSUFICIENTE',
        {
          accion: consumo.accion,
          estadoRequerido,
          origenId: dto.origenId,
          tipo: dto.tipo,
          dimension: dto.dimension,
          disponibleLosas: disponible,
          solicitadoLosas: consumo.cantidad,
        },
      )
    }

    let restante = consumo.cantidad
    for (const producto of candidatos) {
      if (restante <= 0) break
      const retirar = Math.min(restante, producto.cantidadLosas)
      const metrosRetiro = round2(retirar * dimensionToArea(dto.dimension))

      const updated = await productoRepository.update(producto.id, {
        cantidadLosas: Math.max(0, producto.cantidadLosas - retirar),
        metrosCuadrados: round2(Math.max(0, producto.metrosCuadrados - metrosRetiro)),
      })

      if (!updated) {
        throw new DomainError(
          `No se pudo actualizar producto ${producto.id} para salida a proceso`,
          500,
          'PRODUCCION_PROCESO_STOCK_UPDATE_FAILED',
        )
      }

      restante -= retirar
    }
  }
}
