import { DomainError } from '../../errors/domain.error.js'
import { round2 } from '../../../shared/math.js'
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
import {
  dimensionToAreaM2,
  isPlanchaDimension,
  isPisoDimension,
  normalizeDimension,
  type EstadoInventario,
  type InventarioMovimientoDetalle,
  type ProduccionDetalleAccion,
  type ProduccionDiaria,
  type ProduccionTrabajador,
  type Trabajador,
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
import {
  applyInventarioEntrada,
  applyInventarioSalida,
  buildEntradaRollbackDetalles,
} from '../inventario-movimientos/inventario-movimiento.helpers.js'
import {
  assertMonoHiloPicadoConsumptionsDisponibles,
  syncMonoHiloMasasFromProduccionState,
} from '../mono-hilo/mono-hilo.use-cases.js'

interface ProduccionActor {
  userId: string
  userName: string
}

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
    let created: ProduccionResponseDto | null = null
    let regularSideEffectsApplied = false

    try {
      if (isMonoHiloWorkflow(normalizedDto)) {
        validateMonoHiloProduccionDto(normalizedDto)
      } else {
        validateDetalleAcciones(normalizedDto)
        validateResinaConsumo(normalizedDto)
        await applyRegularProduccionSideEffects(
          normalizedDto,
          this.productoRepository,
          this.monoHiloRepository,
        )
        regularSideEffectsApplied = true
      }

      created = await this.repository.create({
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
        await syncMonoHiloMasasFromProduccionState(this.repository, this.monoHiloRepository)
      }

      return created
    } catch (error) {
      if (created) {
        await this.repository.delete(created.id).catch(() => undefined)
      }
      if (regularSideEffectsApplied) {
        await revertRegularProduccionSideEffects(
          normalizedDto,
          this.productoRepository,
          this.monoHiloRepository,
        ).catch(() => undefined)
      }
      throw error
    }
  }
}

export class ApproveProduccionTallerUseCase {
  constructor(
    private readonly repository: ProduccionRepositoryPort,
    private readonly productoRepository: ProductoRepositoryPort,
    private readonly monoHiloRepository: MonoHiloMasaRepositoryPort,
    private readonly produccionTrabajadorRepository: ProduccionTrabajadorRepositoryPort,
    private readonly trabajadorRepository: TrabajadorRepositoryPort,
    private readonly configuracionPort: ConfiguracionPort,
  ) {}

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
      if (produccion.aprobacionTallerEstado === 'rechazado') {
        throw new DomainError(
          'La produccion ya fue rechazada por taller.',
          409,
          'PRODUCCION_TALLER_YA_RECHAZADA',
        )
      }

      const motivoRechazo = dto.motivoRechazo?.trim()
      if (!motivoRechazo) {
        throw new DomainError(
          'Debe indicar un motivo de rechazo para taller.',
          400,
          'PRODUCCION_TALLER_MOTIVO_REQUERIDO',
        )
      }

      await assertProduccionTrabajadoresEditable(id, this.produccionTrabajadorRepository)
      let trabajadoresEliminados = false
      let stockRevertido = false
      let registroActualizado = false

      try {
        trabajadoresEliminados =
          (await deleteProduccionTrabajadoresForRegistro(
          id,
          this.produccionTrabajadorRepository,
          this.trabajadorRepository,
        )) > 0
        await revertRegularProduccionSideEffects(
          produccion,
          this.productoRepository,
          this.monoHiloRepository,
        )
        stockRevertido = true

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
          movimientoInventarioIds: [],
        })

        if (!rejected) {
          throw new DomainError(
            `No se pudo actualizar produccion ${id}`,
            500,
            'PRODUCCION_UPDATE_FAILED',
          )
        }
        registroActualizado = true

        if (!isMonoHiloWorkflow(produccion)) {
          await syncMonoHiloMasasFromProduccionState(this.repository, this.monoHiloRepository)
        }

        return rejected
      } catch (error) {
        if (registroActualizado) {
          await this.repository.update(id, produccion).catch(() => undefined)
        }
        if (stockRevertido) {
          await applyRegularProduccionSideEffects(
            produccion,
            this.productoRepository,
            this.monoHiloRepository,
          ).catch(() => undefined)
        }
        if (trabajadoresEliminados) {
          await createProduccionTrabajadoresForRegistro(
            produccion,
            this.produccionTrabajadorRepository,
            this.trabajadorRepository,
            this.configuracionPort,
          ).catch(() => undefined)
        }
        throw error
      }
    }

    let stockReaplicado = false
    let trabajadoresRecreados = false
    let registroActualizado = false
    if (produccion.aprobacionTallerEstado === 'rechazado') {
      try {
        await applyRegularProduccionSideEffects(
          produccion,
          this.productoRepository,
          this.monoHiloRepository,
        )
        stockReaplicado = true
        await createProduccionTrabajadoresForRegistro(
          produccion,
          this.produccionTrabajadorRepository,
          this.trabajadorRepository,
          this.configuracionPort,
        )
        trabajadoresRecreados = true
      } catch (error) {
        if (stockReaplicado) {
          await revertRegularProduccionSideEffects(
            produccion,
            this.productoRepository,
            this.monoHiloRepository,
          ).catch(() => undefined)
        }
        if (trabajadoresRecreados) {
          await deleteProduccionTrabajadoresForRegistro(
            produccion.id,
            this.produccionTrabajadorRepository,
            this.trabajadorRepository,
          ).catch(() => undefined)
        }
        throw error
      }
    }

    try {
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
      registroActualizado = true

      if (!isMonoHiloWorkflow(produccion)) {
        await syncMonoHiloMasasFromProduccionState(this.repository, this.monoHiloRepository)
      }

      return approved
    } catch (error) {
      if (registroActualizado) {
        await this.repository.update(id, produccion).catch(() => undefined)
      }
      if (trabajadoresRecreados) {
        await deleteProduccionTrabajadoresForRegistro(
          produccion.id,
          this.produccionTrabajadorRepository,
          this.trabajadorRepository,
        ).catch(() => undefined)
      }
      if (stockReaplicado) {
        await revertRegularProduccionSideEffects(
          produccion,
          this.productoRepository,
          this.monoHiloRepository,
        ).catch(() => undefined)
      }
      throw error
    }
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

    const now = new Date().toISOString()
    const bloquePrevio = await this.bloqueRepository.findById(produccion.origenId)
    let movimientoCreadoId: string | null = null

    try {
      await applyInventarioEntrada(detallesEntrada, this.productoRepository)
      await actualizarBloquePorProduccion(produccion, this.bloqueRepository)

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
      movimientoCreadoId = movimiento.id

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
    } catch (error) {
      if (movimientoCreadoId) {
        await this.movimientoRepository.delete(movimientoCreadoId).catch(() => undefined)
      }
      await applyInventarioSalida(
        buildEntradaRollbackDetalles(detallesEntrada),
        this.productoRepository,
      ).catch(() => undefined)
      if (bloquePrevio) {
        await this.bloqueRepository.update(bloquePrevio.id, bloquePrevio).catch(() => undefined)
      }
      throw error
    }
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
  constructor(
    private readonly repository: ProduccionRepositoryPort,
    private readonly productoRepository: ProductoRepositoryPort,
    private readonly monoHiloRepository: MonoHiloMasaRepositoryPort,
    private readonly produccionTrabajadorRepository: ProduccionTrabajadorRepositoryPort,
    private readonly trabajadorRepository: TrabajadorRepositoryPort,
    private readonly configuracionPort: ConfiguracionPort,
  ) {}

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

    await assertProduccionTrabajadoresEditable(id, this.produccionTrabajadorRepository)

    const nextDraft = normalizeProduccionDto({
      ...toCreateProduccionDto(current),
      ...dto,
    })
    validateDetalleAcciones(nextDraft)
    validateResinaConsumo(nextDraft)
    let trabajadoresEliminados = false
    let stockActualRevertido = false
    let nuevoStockAplicado = false
    let registroActualizado = false
    const stockActualActivo = current.aprobacionTallerEstado !== 'rechazado'

    try {
      trabajadoresEliminados =
        (await deleteProduccionTrabajadoresForRegistro(
        id,
        this.produccionTrabajadorRepository,
        this.trabajadorRepository,
      )) > 0
      if (stockActualActivo) {
        await revertRegularProduccionSideEffects(
          current,
          this.productoRepository,
          this.monoHiloRepository,
        )
        stockActualRevertido = true
      }

      await applyRegularProduccionSideEffects(
        nextDraft,
        this.productoRepository,
        this.monoHiloRepository,
      )
      nuevoStockAplicado = true

      const updated = await this.repository.update(id, {
        ...nextDraft,
        estadoRegistro: 'activo',
        aprobacionTallerEstado: 'pendiente',
        aprobacionTallerPorId: undefined,
        aprobacionTallerPorNombre: undefined,
        aprobacionTallerFecha: undefined,
        aprobacionTallerMotivoRechazo: undefined,
        aprobacionAlmacenEstado: 'pendiente',
        aprobacionAlmacenPorId: undefined,
        aprobacionAlmacenPorNombre: undefined,
        aprobacionAlmacenFecha: undefined,
        aprobacionAlmacenMotivo: undefined,
        inventarioAplicado: false,
        movimientoInventarioIds: [],
      })

      if (!updated) {
        throw new DomainError(
          `No se pudo actualizar produccion ${id}`,
          500,
          'PRODUCCION_UPDATE_FAILED',
        )
      }
      registroActualizado = true

      await createProduccionTrabajadoresForRegistro(
        updated,
        this.produccionTrabajadorRepository,
        this.trabajadorRepository,
        this.configuracionPort,
      )
      await syncMonoHiloMasasFromProduccionState(this.repository, this.monoHiloRepository)

      return updated
    } catch (error) {
      if (nuevoStockAplicado) {
        await revertRegularProduccionSideEffects(
          nextDraft,
          this.productoRepository,
          this.monoHiloRepository,
        ).catch(() => undefined)
      }
      if (registroActualizado) {
        await this.repository.update(id, current).catch(() => undefined)
      }
      if (stockActualRevertido && stockActualActivo) {
        await applyRegularProduccionSideEffects(
          current,
          this.productoRepository,
          this.monoHiloRepository,
        ).catch(() => undefined)
      }
      if (trabajadoresEliminados) {
        await createProduccionTrabajadoresForRegistro(
          current,
          this.produccionTrabajadorRepository,
          this.trabajadorRepository,
          this.configuracionPort,
        ).catch(() => undefined)
      }
      throw error
    }
  }
}

export class DeleteProduccionUseCase {
  constructor(
    private readonly repository: ProduccionRepositoryPort,
    private readonly productoRepository: ProductoRepositoryPort,
    private readonly monoHiloRepository: MonoHiloMasaRepositoryPort,
    private readonly produccionTrabajadorRepository: ProduccionTrabajadorRepositoryPort,
    private readonly trabajadorRepository: TrabajadorRepositoryPort,
    private readonly configuracionPort: ConfiguracionPort,
  ) {}

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

    await assertProduccionTrabajadoresEditable(id, this.produccionTrabajadorRepository)
    let trabajadoresEliminados = false
    let stockRevertido = false
    const stockActualActivo = current.aprobacionTallerEstado !== 'rechazado'

    try {
      trabajadoresEliminados =
        (await deleteProduccionTrabajadoresForRegistro(
        id,
        this.produccionTrabajadorRepository,
        this.trabajadorRepository,
      )) > 0
      if (stockActualActivo) {
        await revertRegularProduccionSideEffects(
          current,
          this.productoRepository,
          this.monoHiloRepository,
        )
        stockRevertido = true
      }

      const deleted = await this.repository.delete(id)
      if (!deleted) {
        throw new DomainError(
          `No se pudo eliminar produccion ${id}`,
          500,
          'PRODUCCION_DELETE_FAILED',
        )
      }

      await syncMonoHiloMasasFromProduccionState(
        this.repository,
        this.monoHiloRepository,
      ).catch(() => undefined)

      return true
    } catch (error) {
      if (stockRevertido && stockActualActivo) {
        await applyRegularProduccionSideEffects(
          current,
          this.productoRepository,
          this.monoHiloRepository,
        ).catch(() => undefined)
      }
      if (trabajadoresEliminados) {
        await createProduccionTrabajadoresForRegistro(
          current,
          this.produccionTrabajadorRepository,
          this.trabajadorRepository,
          this.configuracionPort,
        ).catch(() => undefined)
      }
      throw error
    }
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
      const metros = round2(efectivas * dimensionToAreaM2(registro.dimension))

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
      return sum + (item.losasMermaTotal ?? 0) * dimensionToAreaM2(dto.dimension)
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

function toCreateProduccionDto(produccion: ProduccionDiaria): CreateProduccionDto {
  return {
    fecha: produccion.fecha,
    origenId: produccion.origenId,
    origenNombre: produccion.origenNombre,
    workflowTipo: produccion.workflowTipo,
    tipo: produccion.tipo,
    dimension: produccion.dimension,
    cantidadPicar: produccion.cantidadPicar,
    cantidadEscuadrar: produccion.cantidadEscuadrar,
    cantidadDevastar: produccion.cantidadDevastar,
    cantidadResinar: produccion.cantidadResinar,
    cantidadPulir: produccion.cantidadPulir,
    totalLosas: produccion.totalLosas,
    totalM2: produccion.totalM2,
    detallesAcciones: produccion.detallesAcciones,
    monoHiloDetalle: produccion.monoHiloDetalle,
  }
}

async function applyRegularProduccionSideEffects(
  dto:
    | CreateProduccionDto
    | Pick<
        ProduccionDiaria,
        | 'workflowTipo'
        | 'origenId'
        | 'origenNombre'
        | 'tipo'
        | 'dimension'
        | 'cantidadPicar'
        | 'cantidadEscuadrar'
        | 'cantidadDevastar'
        | 'cantidadResinar'
        | 'cantidadPulir'
      >,
  productoRepository: ProductoRepositoryPort,
  monoHiloRepository: MonoHiloMasaRepositoryPort,
): Promise<void> {
  if (isMonoHiloWorkflow(dto)) {
    return
  }

  const consumosMonoHilo = buildMonoHiloConsumptions(dto)
  if (consumosMonoHilo.length > 0) {
    await assertMonoHiloPicadoConsumptionsDisponibles(consumosMonoHilo, monoHiloRepository)
  }
  await consumeProcesoStockParaProduccion(dto, productoRepository)
}

async function revertRegularProduccionSideEffects(
  dto:
    | CreateProduccionDto
    | Pick<
        ProduccionDiaria,
        | 'workflowTipo'
        | 'origenId'
        | 'origenNombre'
        | 'tipo'
        | 'dimension'
        | 'cantidadPicar'
        | 'cantidadEscuadrar'
        | 'cantidadDevastar'
        | 'cantidadResinar'
        | 'cantidadPulir'
      >,
  productoRepository: ProductoRepositoryPort,
  monoHiloRepository: MonoHiloMasaRepositoryPort,
): Promise<void> {
  if (isMonoHiloWorkflow(dto)) {
    return
  }

  await restoreProcesoStockParaProduccion(dto, productoRepository)
}

function normalizeProduccionDto(dto: CreateProduccionDto): CreateProduccionDto {
  const dimension = normalizeDimension(dto.dimension)
  validateProduccionDimension(dto.tipo, dimension)
  const area = dimensionToAreaM2(dimension)
  const detallesAcciones = dto.detallesAcciones?.map((detalle) => {
    const cantidadLosas = normalizeNonNegativeInteger(detalle.cantidadLosas)
    const losasMermaTotal = normalizeNonNegativeInteger(detalle.losasMermaTotal ?? 0)
    const losasReutilizables = normalizeNonNegativeInteger(detalle.losasReutilizables ?? 0)
    const cantidadResina =
      detalle.cantidadResina == null ? undefined : round2(Math.max(0, detalle.cantidadResina))
    const masaId = detalle.masaId?.trim() || undefined
    const masaCodigo = detalle.masaCodigo?.trim() || undefined
    const observacion = detalle.observacion?.trim() || undefined

    return {
      ...detalle,
      masaId,
      masaCodigo,
      observacion,
      cantidadLosas,
      metrosCuadrados: round2(cantidadLosas * area),
      losasMermaTotal,
      metrosMermaTotal: round2(losasMermaTotal * area),
      losasReutilizables,
      metrosReutilizables: round2(losasReutilizables * area),
      cantidadResina,
    }
  })
  const hasDetalles = (detallesAcciones?.length ?? 0) > 0
  const actionTotals = hasDetalles
    ? buildActionTotalsFromDetalles(detallesAcciones ?? [])
    : {
        picar: normalizeNonNegativeInteger(dto.cantidadPicar),
        escuadrar: normalizeNonNegativeInteger(dto.cantidadEscuadrar),
        devastar: normalizeNonNegativeInteger(dto.cantidadDevastar),
        resinar: normalizeNonNegativeInteger(dto.cantidadResinar),
        pulir: normalizeNonNegativeInteger(dto.cantidadPulir),
      }
  const totalLosas =
    actionTotals.picar +
    actionTotals.escuadrar +
    actionTotals.devastar +
    actionTotals.resinar +
    actionTotals.pulir

  return {
    ...dto,
    dimension,
    cantidadPicar: actionTotals.picar,
    cantidadEscuadrar: actionTotals.escuadrar,
    cantidadDevastar: actionTotals.devastar,
    cantidadResinar: actionTotals.resinar,
    cantidadPulir: actionTotals.pulir,
    totalLosas,
    totalM2: round2(totalLosas * area),
    detallesAcciones,
  }
}

function buildActionTotalsFromDetalles(
  detalles: ProduccionDetalleAccion[],
): Record<'picar' | 'escuadrar' | 'devastar' | 'resinar' | 'pulir', number> {
  const totals = {
    picar: 0,
    escuadrar: 0,
    devastar: 0,
    resinar: 0,
    pulir: 0,
  } as Record<'picar' | 'escuadrar' | 'devastar' | 'resinar' | 'pulir', number>

  for (const detalle of detalles) {
    totals[detalle.accion] += detalle.cantidadLosas
  }

  return totals
}

function validateProduccionDimension(
  tipo: ProduccionDiaria['tipo'],
  dimension: ProduccionDiaria['dimension'],
): void {
  if (tipo === 'Piso' && !isPisoDimension(dimension)) {
    throw new DomainError(
      `La dimension ${dimension} no corresponde a un piso.`,
      409,
      'PRODUCCION_DIMENSION_PISO_INVALIDA',
      { tipo, dimension },
    )
  }

  if (tipo === 'Plancha' && !isPlanchaDimension(dimension)) {
    throw new DomainError(
      `La dimension ${dimension} no corresponde a una plancha.`,
      409,
      'PRODUCCION_DIMENSION_PLANCHA_INVALIDA',
      { tipo, dimension },
    )
  }
}


function normalizeNonNegativeInteger(value: number | undefined): number {
  return Math.max(0, Math.trunc(value ?? 0))
}

function validateDetalleAcciones(dto: CreateProduccionDto): void {
  for (const detalle of dto.detallesAcciones ?? []) {
    if (detalle.cantidadLosas <= 0) {
      throw new DomainError(
        `La accion ${detalle.accion} requiere cantidad de losas mayor que 0.`,
        400,
        'PRODUCCION_DETALLE_CANTIDAD_INVALIDA',
      )
    }

    const partidasTotales =
      normalizeNonNegativeInteger(detalle.losasMermaTotal ?? 0) +
      normalizeNonNegativeInteger(detalle.losasReutilizables ?? 0)
    if (partidasTotales > detalle.cantidadLosas) {
      throw new DomainError(
        `La merma y el reutilizable de ${detalle.accion} no pueden exceder las losas procesadas.`,
        409,
        'PRODUCCION_DETALLE_PARTIDAS_EXCEDIDAS',
        {
          accion: detalle.accion,
          cantidadLosas: detalle.cantidadLosas,
          partidasTotales,
        },
      )
    }
  }
}

function buildMonoHiloConsumptions(
  dto:
    | CreateProduccionDto
    | Pick<
        ProduccionDiaria,
        'origenId' | 'dimension' | 'cantidadPicar' | 'detallesAcciones'
      >,
): Array<{ bloqueId: string; masaId?: string; dimension: string; cantidadLosas: number }> {
  const detallesPicar = (dto.detallesAcciones ?? [])
    .filter((detalle) => detalle.accion === 'picar' && detalle.cantidadLosas > 0)
    .map((detalle) => ({
      bloqueId: dto.origenId,
      masaId: detalle.masaId?.trim() || undefined,
      dimension: dto.dimension,
      cantidadLosas: detalle.cantidadLosas,
    }))

  if (detallesPicar.length > 0) {
    return detallesPicar
  }

  if (dto.cantidadPicar <= 0) {
    return []
  }

  return [
    {
      bloqueId: dto.origenId,
      dimension: dto.dimension,
      cantidadLosas: dto.cantidadPicar,
    },
  ]
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

  const creados: string[] = []
  const trabajadorIds = [...new Set(registros.map((registro) => registro.trabajadorId))]

  try {
    for (const registro of registros) {
      const created = await produccionTrabajadorRepository.create(registro)
      creados.push(created.id)
    }
    await recalculateProduccionTrabajadores(trabajadorIds, produccionTrabajadorRepository, trabajadorRepository)
  } catch (error) {
    await Promise.all(
      creados.map(async (registroId) => {
        try {
          await produccionTrabajadorRepository.delete(registroId)
        } catch {
          // Best effort rollback.
        }
      }),
    )
    await recalculateProduccionTrabajadores(
      trabajadorIds,
      produccionTrabajadorRepository,
      trabajadorRepository,
    ).catch(() => undefined)
    throw error
  }
}

async function deleteProduccionTrabajadoresForRegistro(
  produccionId: string,
  produccionTrabajadorRepository: ProduccionTrabajadorRepositoryPort,
  trabajadorRepository: TrabajadorRepositoryPort,
): Promise<number> {
  const registros = (await produccionTrabajadorRepository.findAll()).filter(
    (registro) => registro.produccionId === produccionId,
  )
  if (registros.length === 0) {
    return 0
  }

  const trabajadorIds = [...new Set(registros.map((registro) => registro.trabajadorId))]
  for (const registro of registros) {
    const deleted = await produccionTrabajadorRepository.delete(registro.id)
    if (!deleted) {
      throw new DomainError(
        `No se pudo eliminar la distribucion ${registro.id} asociada a la produccion ${produccionId}.`,
        500,
        'PRODUCCION_TRABAJADOR_DELETE_FAILED',
      )
    }
  }

  await recalculateProduccionTrabajadores(
    trabajadorIds,
    produccionTrabajadorRepository,
    trabajadorRepository,
  )
  return registros.length
}

async function assertProduccionTrabajadoresEditable(
  produccionId: string,
  produccionTrabajadorRepository: ProduccionTrabajadorRepositoryPort,
): Promise<void> {
  const pagado = (await produccionTrabajadorRepository.findAll()).find(
    (registro) => registro.produccionId === produccionId && registro.pagado,
  )
  if (pagado) {
    throw new DomainError(
      'La produccion ya tiene pagos liquidados y no puede modificarse ni revertirse.',
      409,
      'PRODUCCION_PAGO_LIQUIDADO_LOCKED',
      {
        produccionId,
        produccionTrabajadorId: pagado.id,
      },
    )
  }
}

async function recalculateProduccionTrabajadores(
  trabajadorIds: string[],
  produccionTrabajadorRepository: ProduccionTrabajadorRepositoryPort,
  trabajadorRepository: TrabajadorRepositoryPort,
): Promise<void> {
  const normalizedIds = [...new Set(trabajadorIds.filter(Boolean))]
  if (normalizedIds.length === 0) {
    return
  }

  const [registros, trabajadores] = await Promise.all([
    produccionTrabajadorRepository.findAll(),
    trabajadorRepository.findAll(),
  ])
  const trabajadoresById = new Map(trabajadores.map((trabajador) => [trabajador.id, trabajador]))

  for (const trabajadorId of normalizedIds) {
    const trabajador = trabajadoresById.get(trabajadorId)
    if (!trabajador) {
      continue
    }

    const registrosTrabajador = registros.filter((registro) => registro.trabajadorId === trabajadorId)
    const losasProducidas = registrosTrabajador.reduce((sum, registro) => sum + registro.cantidadLosas, 0)
    const acumuladoPendiente = round2(
      registrosTrabajador
        .filter((registro) => !registro.pagado)
        .reduce((sum, registro) => sum + registro.pagoFinal, 0),
    )

    const updated = await trabajadorRepository.update(trabajadorId, {
      losasProducidas,
      acumuladoPendiente,
    })

    if (!updated) {
      throw new DomainError(
        `No se pudo recalcular el trabajador ${trabajadorId} tras conciliar produccion.`,
        500,
        'PRODUCCION_TRABAJADOR_RECALC_FAILED',
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
  dto:
    | CreateProduccionDto
    | Pick<
        ProduccionDiaria,
        | 'origenId'
        | 'origenNombre'
        | 'tipo'
        | 'dimension'
        | 'cantidadEscuadrar'
        | 'cantidadDevastar'
        | 'cantidadResinar'
        | 'cantidadPulir'
      >,
  productoRepository: ProductoRepositoryPort,
): Promise<void> {
  const consumos: Array<{ accion: 'escuadrar' | 'devastar' | 'resinar' | 'pulir'; cantidad: number }> = [
    { accion: 'escuadrar', cantidad: dto.cantidadEscuadrar },
    { accion: 'devastar', cantidad: dto.cantidadDevastar },
    { accion: 'resinar', cantidad: dto.cantidadResinar },
    { accion: 'pulir', cantidad: dto.cantidadPulir },
  ]

  const rollbackDetalles: InventarioMovimientoDetalle[] = []

  try {
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
        const metrosRetiro = round2(retirar * dimensionToAreaM2(dto.dimension))

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

        rollbackDetalles.push({
          id: `prod-rollback-${consumo.accion}-${producto.id}-${rollbackDetalles.length + 1}`,
          productoId: producto.id,
          productoNombre: producto.nombre,
          tipo: producto.tipo,
          estado: producto.estado,
          dimension: producto.dimension,
          origenId: producto.origenId,
          origenNombre: producto.origenNombre,
          cantidadLosas: retirar,
          metrosCuadrados: metrosRetiro,
          ubicacionDestino: 'proceso',
        })

        restante -= retirar
      }
    }
  } catch (error) {
    if (rollbackDetalles.length > 0) {
      await applyInventarioEntrada(rollbackDetalles, productoRepository).catch(() => undefined)
    }
    throw error
  }
}

async function restoreProcesoStockParaProduccion(
  dto:
    | CreateProduccionDto
    | Pick<
        ProduccionDiaria,
        | 'origenId'
        | 'origenNombre'
        | 'tipo'
        | 'dimension'
        | 'cantidadEscuadrar'
        | 'cantidadDevastar'
        | 'cantidadResinar'
        | 'cantidadPulir'
      >,
  productoRepository: ProductoRepositoryPort,
): Promise<void> {
  const detalles = buildProcesoStockRestoreDetalles(dto)
  if (detalles.length === 0) {
    return
  }
  await applyInventarioEntrada(detalles, productoRepository)
}

function buildProcesoStockRestoreDetalles(
  dto:
    | CreateProduccionDto
    | Pick<
        ProduccionDiaria,
        | 'origenId'
        | 'origenNombre'
        | 'tipo'
        | 'dimension'
        | 'cantidadEscuadrar'
        | 'cantidadDevastar'
        | 'cantidadResinar'
        | 'cantidadPulir'
      >,
): InventarioMovimientoDetalle[] {
  const consumos: Array<{ accion: 'escuadrar' | 'devastar' | 'resinar' | 'pulir'; cantidad: number }> = [
    { accion: 'escuadrar', cantidad: dto.cantidadEscuadrar },
    { accion: 'devastar', cantidad: dto.cantidadDevastar },
    { accion: 'resinar', cantidad: dto.cantidadResinar },
    { accion: 'pulir', cantidad: dto.cantidadPulir },
  ]

  return consumos
    .filter((consumo) => consumo.cantidad > 0)
    .map((consumo, index) => {
      const estado = estadoRequeridoProcesoPorAccion[consumo.accion]
      return {
        id: `prod-proceso-restore-${consumo.accion}-${index + 1}`,
        productoNombre: `${dto.tipo} ${dto.origenNombre} ${dto.dimension} ${estado}`,
        tipo: dto.tipo,
        estado,
        dimension: dto.dimension,
        origenId: dto.origenId,
        origenNombre: dto.origenNombre,
        cantidadLosas: consumo.cantidad,
        metrosCuadrados: round2(consumo.cantidad * dimensionToAreaM2(dto.dimension)),
        ubicacionDestino: 'proceso',
      }
    })
}
