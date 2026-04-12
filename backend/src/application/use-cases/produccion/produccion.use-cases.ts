import { DomainError } from '../../errors/domain.error.js'
import type {
  AprobarEntradaProduccionAlmacenDto,
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
} from '../../../domain/entities/index.js'
import type {
  BloqueRepositoryPort,
  InventarioMovimientoRepositoryPort,
  ProduccionRepositoryPort,
  ProduccionTrabajadorRepositoryPort,
  ProductoRepositoryPort,
} from '../../../domain/ports/index.js'
import { applyInventarioEntrada } from '../inventario-movimientos/inventario-movimiento.helpers.js'

interface ProduccionActor {
  userId: string
  userName: string
}

const PLANCHA_DIMENSION = '80x40' as const

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
  ) {}

  async execute(dto: CreateProduccionDto): Promise<ProduccionResponseDto> {
    const normalizedDto = normalizeProduccionDto(dto)
    validateResinaConsumo(normalizedDto)
    await consumeProcesoStockParaProduccion(normalizedDto, this.productoRepository)

    return this.repository.create({
      ...normalizedDto,
      aprobacionTallerEstado: 'pendiente',
      aprobacionAlmacenEstado: 'pendiente',
      inventarioAplicado: false,
      movimientoInventarioIds: [],
    })
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

    if (current.inventarioAplicado) {
      throw new DomainError(
        'No se puede eliminar una produccion que ya movio inventario.',
        409,
        'PRODUCCION_DELETE_LOCKED',
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

  const detallesAcciones = dto.detallesAcciones?.map((detalle) => {
    const losasMermaTotal = detalle.losasMermaTotal ?? 0
    const losasReutilizables = detalle.losasReutilizables ?? 0

    return {
      ...detalle,
      metrosCuadrados: round2(detalle.cantidadLosas * dimensionToArea(PLANCHA_DIMENSION)),
      metrosMermaTotal: round2(losasMermaTotal * dimensionToArea(PLANCHA_DIMENSION)),
      metrosReutilizables: round2(losasReutilizables * dimensionToArea(PLANCHA_DIMENSION)),
    }
  })

  return {
    ...dto,
    dimension: PLANCHA_DIMENSION,
    totalM2: round2(dto.totalLosas * dimensionToArea(PLANCHA_DIMENSION)),
    detallesAcciones,
  }
}

function dimensionToArea(dimension: ProduccionDiaria['dimension']): number {
  if (dimension === '40x40') return 1 / 6
  if (dimension === '60x40') return 1 / 4
  return 1 / 3
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
