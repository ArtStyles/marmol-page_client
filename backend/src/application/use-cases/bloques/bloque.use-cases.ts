import { DomainError } from '../../errors/domain.error.js'
import type {
  BloqueRepositoryPort,
  GastoRepositoryPort,
  InventarioMovimientoRepositoryPort,
  MermaRepositoryPort,
  MonoHiloMasaRepositoryPort,
  ProduccionRepositoryPort,
  ProductoRepositoryPort,
  VentaRepositoryPort,
} from '../../../domain/ports/index.js'
import {
  dimensionToAreaM2,
  resolveTipoProductoByDimension,
  type BloqueOLote,
  type Merma,
  type MonoHiloMasa,
  type ProduccionDiaria,
  type Producto,
  type Venta,
} from '../../../domain/entities/index.js'
import type { CreateBloqueDto, UpdateBloqueDto, BloqueResponseDto } from '../../dtos/index.js'
import { buildGastosCompraMateriaPrima } from '../gastos/gasto.helpers.js'

interface BloqueActor {
  userId: string
  userName: string
}

type BloqueHistoryContext = {
  productos: Producto[]
  masas: MonoHiloMasa[]
  producciones: ProduccionDiaria[]
  mermas: Merma[]
  ventas: Venta[]
}

type BloqueMutability = {
  canEdit: boolean
  canDelete: boolean
  lockReason?: string
}

type BloqueHistoryRepos = {
  productoRepository: ProductoRepositoryPort
  monoHiloMasaRepository: MonoHiloMasaRepositoryPort
  produccionRepository: ProduccionRepositoryPort
  mermaRepository: MermaRepositoryPort
  ventaRepository: VentaRepositoryPort
  gastoRepository: GastoRepositoryPort
}

const BLOQUE_MUTATION_LOCK_CODE = 'BLOQUE_HISTORIAL_BLOQUEADO'

export class GetBloquesUseCase {
  constructor(
    private readonly repository: BloqueRepositoryPort,
    private readonly historyRepos: BloqueHistoryRepos,
  ) {}

  async execute(): Promise<BloqueResponseDto[]> {
    const [bloques, historyContext] = await Promise.all([
      this.repository.findAll(),
      loadBloqueHistoryContext(this.historyRepos),
    ])

    return bloques.map((bloque) => toBloqueResponseDto(bloque, historyContext))
  }
}

export class GetBloqueByIdUseCase {
  constructor(
    private readonly repository: BloqueRepositoryPort,
    private readonly historyRepos: BloqueHistoryRepos,
  ) {}

  async execute(id: string): Promise<BloqueResponseDto | null> {
    const bloque = await this.repository.findById(id)
    if (!bloque) return null

    const historyContext = await loadBloqueHistoryContext(this.historyRepos)
    return toBloqueResponseDto(bloque, historyContext)
  }
}

export class CreateBloqueUseCase {
  constructor(
    private readonly repository: BloqueRepositoryPort,
    private readonly productoRepository: ProductoRepositoryPort,
    private readonly inventarioMovimientoRepository: InventarioMovimientoRepositoryPort,
    private readonly gastoRepository: GastoRepositoryPort,
    private readonly monoHiloMasaRepository: MonoHiloMasaRepositoryPort,
    private readonly produccionRepository: ProduccionRepositoryPort,
    private readonly mermaRepository: MermaRepositoryPort,
    private readonly ventaRepository: VentaRepositoryPort,
  ) {}

  async execute(dto: CreateBloqueDto, actor?: BloqueActor): Promise<BloqueResponseDto> {
    const existentes = await this.repository.findAll()
    const codigo = buildCodigoMateriaPrima(dto.tipo, existentes)
    const dimensionBase: BloqueOLote['dimensionBase'] =
      dto.tipo === 'Bloque' ? null : dto.dimensionBase ?? null

    if (dto.tipo === 'Lote' && !dimensionBase) {
      throw new DomainError(
        'Los lotes requieren una dimension base valida para generar inventario inicial.',
        409,
        'LOTE_DIMENSION_REQUERIDA',
      )
    }

    const cantidadComprada = dto.tipo === 'Lote'
      ? Math.max(0, Math.trunc(dto.metrosComprados))
      : dto.metrosComprados
    const created = await this.repository.create({
      nombre: codigo,
      tipo: dto.tipo,
      dimensionBase,
      costo: dto.costo,
      costoTransporte: dto.costoTransporte,
      metrosComprados: cantidadComprada,
      fechaIngreso: dto.fechaIngreso,
      proveedor: dto.proveedor.trim(),
      canteraOrigen: dto.canteraOrigen.trim(),
      losasProducidas: 0,
      losasPerdidas: 0,
      metrosVendibles: 0,
      gananciaReal: 0,
      estado: 'activo',
    })

    let movimientoIdCreado: string | null = null
    let productoIdCreado: string | null = null
    const gastosCreados: string[] = []

    try {
      if (created.tipo === 'Lote') {
        if (!created.dimensionBase) {
          throw new DomainError(
            'Los lotes requieren una dimension base valida para generar inventario inicial.',
            409,
            'LOTE_DIMENSION_REQUERIDA',
          )
        }
        const cantidadLosas = Math.max(0, Math.trunc(created.metrosComprados))
        if (cantidadLosas > 0) {
          const metrosCuadrados = round2(cantidadLosas * dimensionToAreaM2(created.dimensionBase))
          const tipoProducto = resolveTipoProductoByDimension(created.dimensionBase)
          const nombreProducto = `${tipoProducto} ${created.nombre} ${created.dimensionBase} Picado`
          const costoTotal = round2(created.costo + created.costoTransporte)
          const precioM2 = metrosCuadrados > 0 ? round2(costoTotal / metrosCuadrados) : 0
          const now = new Date().toISOString()
          const actorId = actor?.userId ?? 'system'
          const actorName = actor?.userName ?? 'system'

          const producto = await this.productoRepository.create({
            nombre: nombreProducto,
            tipo: tipoProducto,
            estado: 'Picado',
            ubicacion: 'almacen',
            dimension: created.dimensionBase,
            origenId: created.id,
            origenNombre: created.nombre,
            cantidadLosas,
            metrosCuadrados,
            precioM2,
            imagen: '/placeholder.jpg',
          })
          productoIdCreado = producto.id

          const movimiento = await this.inventarioMovimientoRepository.create({
            fechaSolicitud: now,
            fechaResolucion: now,
            tipo: 'entrada',
            origen: 'ajuste',
            estado: 'aprobado',
            referenciaId: created.id,
            motivo: `Entrada inicial por registro de lote ${created.nombre}`,
            observaciones: `Materia prima registrada desde proveedor ${created.proveedor}.`,
            solicitadoPorId: actorId,
            solicitadoPorNombre: actorName,
            aprobadoPorId: actorId,
            aprobadoPorNombre: actorName,
            detalles: [
              {
                id: `imd-lote-${created.id}`,
                productoId: producto.id,
                productoNombre: nombreProducto,
                tipo: tipoProducto,
                estado: 'Picado',
                dimension: created.dimensionBase,
                origenId: created.id,
                origenNombre: created.nombre,
                cantidadLosas,
                metrosCuadrados,
              },
            ],
          })
          movimientoIdCreado = movimiento.id
        }
      }

      const gastosCompra = buildGastosCompraMateriaPrima(created, actor)
      for (const gasto of gastosCompra) {
        const gastoCreado = await this.gastoRepository.create(gasto)
        gastosCreados.push(gastoCreado.id)
      }
    } catch (error) {
      if (productoIdCreado) {
        await this.productoRepository.delete(productoIdCreado).catch(() => undefined)
      }
      if (movimientoIdCreado) {
        await this.inventarioMovimientoRepository.delete(movimientoIdCreado).catch(() => undefined)
      }
      for (const gastoId of gastosCreados) {
        await this.gastoRepository.delete(gastoId).catch(() => undefined)
      }
      await this.repository.delete(created.id)
      throw error
    }

    const historyContext = await loadBloqueHistoryContext({
      productoRepository: this.productoRepository,
      monoHiloMasaRepository: this.monoHiloMasaRepository,
      produccionRepository: this.produccionRepository,
      mermaRepository: this.mermaRepository,
      ventaRepository: this.ventaRepository,
      gastoRepository: this.gastoRepository,
    })

    return toBloqueResponseDto(created, historyContext)
  }
}

export class UpdateBloqueUseCase {
  constructor(
    private readonly repository: BloqueRepositoryPort,
    private readonly historyRepos: BloqueHistoryRepos,
  ) {}

  async execute(id: string, dto: UpdateBloqueDto): Promise<BloqueResponseDto | null> {
    const actual = await this.repository.findById(id)
    if (!actual) return null

    const historyContext = await loadBloqueHistoryContext(this.historyRepos)
    const mutability = resolveBloqueMutability(actual, historyContext)
    if (!mutability.canEdit) {
      throw new DomainError(
        mutability.lockReason ?? 'El bloque/lote ya tiene historial y no admite edicion.',
        409,
        BLOQUE_MUTATION_LOCK_CODE,
      )
    }

    const patchFinal: Partial<BloqueOLote> = {}

    if (dto.dimensionBase !== undefined) {
      patchFinal.dimensionBase = dto.dimensionBase
    }
    if (dto.costo !== undefined) {
      patchFinal.costo = dto.costo
    }
    if (dto.costoTransporte !== undefined) {
      patchFinal.costoTransporte = dto.costoTransporte
    }
    if (dto.metrosComprados !== undefined) {
      patchFinal.metrosComprados =
        actual.tipo === 'Lote' ? Math.max(0, Math.trunc(dto.metrosComprados)) : dto.metrosComprados
    }
    if (dto.fechaIngreso !== undefined) {
      patchFinal.fechaIngreso = dto.fechaIngreso
    }
    if (dto.proveedor !== undefined) {
      patchFinal.proveedor = dto.proveedor.trim()
    }
    if (dto.canteraOrigen !== undefined) {
      patchFinal.canteraOrigen = dto.canteraOrigen.trim()
    }

    if (actual.tipo === 'Bloque') {
      patchFinal.dimensionBase = null
    } else {
      const dimensionObjetivo = patchFinal.dimensionBase ?? actual.dimensionBase
      if (!dimensionObjetivo) {
        throw new DomainError(
          'Los lotes requieren una dimension base valida.',
          409,
          'LOTE_DIMENSION_REQUERIDA',
        )
      }
      patchFinal.dimensionBase = dimensionObjetivo
    }

    const updated = await this.repository.update(id, patchFinal)
    return updated ? toBloqueResponseDto(updated, historyContext) : null
  }
}

export class DeleteBloqueUseCase {
  constructor(
    private readonly repository: BloqueRepositoryPort,
    private readonly historyRepos: BloqueHistoryRepos,
  ) {}

  async execute(id: string): Promise<boolean> {
    const actual = await this.repository.findById(id)
    if (!actual) return false

    const historyContext = await loadBloqueHistoryContext(this.historyRepos)
    const mutability = resolveBloqueMutability(actual, historyContext)
    if (!mutability.canDelete) {
      throw new DomainError(
        mutability.lockReason ?? 'El bloque/lote ya tiene historial y no admite eliminarse.',
        409,
        BLOQUE_MUTATION_LOCK_CODE,
      )
    }

    const deleted = await this.repository.delete(id)
    if (!deleted) return false

    const gastosRelacionados = (await this.historyRepos.gastoRepository.findAll()).filter(
      (gasto) => gasto.origenModulo === 'bloques' && gasto.referenciaId?.trim() === id,
    )
    await Promise.all(
      gastosRelacionados.map((gasto) =>
        this.historyRepos.gastoRepository.delete(gasto.id).catch(() => undefined),
      ),
    )

    return true
  }
}

async function loadBloqueHistoryContext(repos: BloqueHistoryRepos): Promise<BloqueHistoryContext> {
  const [productos, masas, producciones, mermas, ventas] = await Promise.all([
    repos.productoRepository.findAll(),
    repos.monoHiloMasaRepository.findAll(),
    repos.produccionRepository.findAll(),
    repos.mermaRepository.findAll(),
    repos.ventaRepository.findAll(),
  ])

  return {
    productos,
    masas,
    producciones,
    mermas,
    ventas,
  }
}

function toBloqueResponseDto(
  bloque: BloqueOLote,
  historyContext: BloqueHistoryContext,
): BloqueResponseDto {
  const mutability = resolveBloqueMutability(bloque, historyContext)

  return {
    ...bloque,
    canEdit: mutability.canEdit,
    canDelete: mutability.canDelete,
    lockReason: mutability.lockReason,
  }
}

function resolveBloqueMutability(
  bloque: BloqueOLote,
  historyContext: BloqueHistoryContext,
): BloqueMutability {
  if (bloque.estado === 'vendido') {
    return {
      canEdit: false,
      canDelete: false,
      lockReason: 'El bloque/lote ya fue vendido y su registro esta bloqueado.',
    }
  }

  const hasVentas = historyContext.ventas.some((venta) =>
    (venta.detallesProductos ?? []).some((detalle) => detalle.origenId.trim() === bloque.id),
  )
  if (hasVentas) {
    return {
      canEdit: false,
      canDelete: false,
      lockReason: 'El bloque/lote ya tiene ventas vinculadas.',
    }
  }

  const hasProduccion = historyContext.producciones.some(
    (registro) => registro.origenId.trim() === bloque.id,
  )
  if (hasProduccion) {
    return {
      canEdit: false,
      canDelete: false,
      lockReason: 'El bloque/lote ya tiene produccion registrada.',
    }
  }

  const hasMermas = historyContext.mermas.some((merma) => merma.origenId.trim() === bloque.id)
  if (hasMermas) {
    return {
      canEdit: false,
      canDelete: false,
      lockReason: 'El bloque/lote ya tiene mermas registradas.',
    }
  }

  const hasMasas = historyContext.masas.some((masa) => masa.bloqueId.trim() === bloque.id)
  if (hasMasas) {
    return {
      canEdit: false,
      canDelete: false,
      lockReason: 'El bloque ya tiene masas de mono hilo registradas.',
    }
  }

  const hasProductos = historyContext.productos.some((producto) => producto.origenId.trim() === bloque.id)
  if (hasProductos) {
    return {
      canEdit: false,
      canDelete: false,
      lockReason:
        bloque.tipo === 'Lote'
          ? 'El lote ya genero inventario inicial y no admite cambios.'
          : 'El bloque/lote ya tiene inventario vinculado.',
    }
  }

  return {
    canEdit: true,
    canDelete: true,
  }
}

function buildCodigoMateriaPrima(
  tipo: BloqueOLote['tipo'],
  existentes: BloqueOLote[],
): string {
  const prefijo = tipo === 'Bloque' ? 'A' : 'L'
  const regexCodigo = new RegExp(`^${prefijo}-(\\d{3})$`)

  const max = existentes.reduce((acc, item) => {
    if (item.tipo !== tipo) return acc

    const codigoActual = item.nombre.trim()
    const matchCodigo = codigoActual.match(regexCodigo)
    if (matchCodigo) {
      return Math.max(acc, Number.parseInt(matchCodigo[1], 10) || 0)
    }

    const matchId = item.id.match(/(\d+)$/)
    if (matchId) {
      return Math.max(acc, Number.parseInt(matchId[1], 10) || 0)
    }

    return acc
  }, 0)

  return `${prefijo}-${String(max + 1).padStart(3, '0')}`
}

function round2(value: number): number {
  return Number(value.toFixed(2))
}
