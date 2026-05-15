import { DomainError } from '../../errors/domain.error.js'
import type {
  ConsumeMonoHiloParaPicadoDto,
  CreateMonoHiloMasasDto,
  MonoHiloMasaResponseDto,
  RegisterMonoHiloProduccionDto,
  RegisterMonoHiloProduccionResponseDto,
  UpdateMonoHiloMasaUbicacionDto,
} from '../../dtos/index.js'
import {
  MONO_HILO_DIMENSIONES_BASE,
  PLANCHA_DIMENSION_DEFAULT,
  normalizeDimension,
  parseDimension,
  resolveTipoProductoByDimension,
  type Dimension,
  type MonoHiloEstimadoDimension,
  type MonoHiloEstimados,
  type MonoHiloMasa,
  type MonoHiloRemanente,
  type ProduccionDiaria,
  type Trabajador,
  type UbicacionMasaMonoHilo,
} from '../../../domain/entities/index.js'
import type {
  BloqueRepositoryPort,
  ConfiguracionPort,
  EquipoRepositoryPort,
  MonoHiloMasaRepositoryPort,
  ProduccionRepositoryPort,
  TrabajadorRepositoryPort,
} from '../../../domain/ports/index.js'

const DEFAULT_GROSOR_DISCO_MM = 8
const DEFAULT_ESPESOR_LOSA_CM = 3

const MONO_HILO_DIMENSIONS: Dimension[] = [...MONO_HILO_DIMENSIONES_BASE]

interface MonoHiloActor {
  userId: string
  userName: string
}

export class GetMonoHiloMasasUseCase {
  constructor(
    private readonly repository: MonoHiloMasaRepositoryPort,
    private readonly produccionRepository: ProduccionRepositoryPort,
  ) {}

  async execute(): Promise<MonoHiloMasaResponseDto[]> {
    await syncMonoHiloMasasFromProduccionState(
      this.produccionRepository,
      this.repository,
    ).catch(() => undefined)
    return this.repository.findAll()
  }
}

export class CreateMonoHiloMasasUseCase {
  constructor(
    private readonly repository: MonoHiloMasaRepositoryPort,
    private readonly bloqueRepository: BloqueRepositoryPort,
    private readonly configuracionPort: ConfiguracionPort,
  ) {}

  async execute(
    dto: CreateMonoHiloMasasDto,
    actor: MonoHiloActor,
  ): Promise<MonoHiloMasaResponseDto[]> {
    const bloqueId = dto.bloqueId.trim()
    if (!bloqueId) {
      throw new DomainError(
        'Debe seleccionar un bloque para registrar masas de mono hilo.',
        400,
        'MONO_HILO_BLOQUE_REQUERIDO',
      )
    }

    if (!Array.isArray(dto.masas) || dto.masas.length === 0) {
      throw new DomainError(
        'Debe registrar al menos una masa en el lote de mono hilo.',
        400,
        'MONO_HILO_MASAS_REQUERIDAS',
      )
    }

    const bloque = await this.bloqueRepository.findById(bloqueId)
    if (!bloque) {
      throw new DomainError(`Bloque ${bloqueId} no existe`, 404, 'MONO_HILO_BLOQUE_NOT_FOUND')
    }

    if (bloque.tipo !== 'Bloque') {
      throw new DomainError(
        'Mono hilo solo permite registrar masas sobre bloques.',
        409,
        'MONO_HILO_TIPO_BLOQUE_INVALIDO',
      )
    }

    if (bloque.estado !== 'activo') {
      throw new DomainError(
        'Solo se pueden registrar masas en bloques activos.',
        409,
        'MONO_HILO_BLOQUE_INACTIVO',
      )
    }

    const configuracion = await this.configuracionPort.get()
    const grosorDiscoMm = normalizePositiveDecimal(
      configuracion.monoHiloGrosorDiscoMm,
      DEFAULT_GROSOR_DISCO_MM,
      'MONO_HILO_GROSOR_DISCO_INVALIDO',
    )
    const espesorLosaCm = normalizePositiveDecimal(
      configuracion.monoHiloEspesorLosaCm,
      DEFAULT_ESPESOR_LOSA_CM,
      'MONO_HILO_ESPESOR_LOSA_INVALIDO',
    )

    const existentes = (await this.repository.findAll()).filter((masa) => masa.bloqueId === bloqueId)
    let consecutivo = resolveMaxConsecutivoMasa(existentes, bloque.nombre)
    const created: MonoHiloMasa[] = []

    for (const masaInput of dto.masas) {
      const largoCm = normalizeStrictPositive(masaInput.largoCm, 'MONO_HILO_DIMENSION_INVALIDA')
      const anchoCm = normalizeStrictPositive(masaInput.anchoCm, 'MONO_HILO_DIMENSION_INVALIDA')
      const profundidadCm = normalizeStrictPositive(
        masaInput.profundidadCm,
        'MONO_HILO_DIMENSION_INVALIDA',
      )

      const margenAutomaticoCm = resolveMargenAutomaticoCm(largoCm, anchoCm, grosorDiscoMm)
      const estimados = buildMonoHiloEstimados({
        largoCm,
        anchoCm,
        profundidadCm,
        grosorDiscoMm,
        espesorLosaCm,
      })

      const totalEstimado = Object.values(estimados).reduce(
        (sum, item) => sum + item.losasEstimadas,
        0,
      )
      if (totalEstimado <= 0) {
        throw new DomainError(
          'Las dimensiones de la masa no permiten estimar losas utiles con el grosor de disco y espesor configurados.',
          409,
          'MONO_HILO_SIN_RENDIMIENTO',
          {
            bloqueId,
            largoCm,
            anchoCm,
            profundidadCm,
            margenCm: margenAutomaticoCm,
            grosorDiscoMm,
            espesorLosaCm,
          },
        )
      }

      consecutivo += 1
      const codigo = `${bloque.nombre}-M${String(consecutivo).padStart(3, '0')}`

      const createdItem = await this.repository.create({
        bloqueId: bloque.id,
        bloqueCodigo: bloque.nombre,
        bloqueNombre: bloque.nombre,
        produccionId: undefined,
        creadoPorId: actor.userId,
        creadoPorNombre: actor.userName,
        codigo,
        largoCm,
        anchoCm,
        profundidadCm,
        margenCm: margenAutomaticoCm,
        grosorDiscoMm,
        espesorLosaCm,
        ubicacion: 'almacen',
        estado: 'activa',
        observaciones: masaInput.observaciones?.trim() ?? '',
        fechaRegistro: new Date().toISOString(),
        estimados,
        remanentes: buildInitialMonoHiloRemanentes({
          largoCm,
          anchoCm,
          profundidadCm,
          grosorDiscoMm,
          espesorLosaCm,
        }),
      })

      created.push(createdItem)
    }

    return created
  }
}

export class RegisterMonoHiloProduccionUseCase {
  private readonly createMonoHiloMasasUseCase: CreateMonoHiloMasasUseCase

  constructor(
    private readonly repository: MonoHiloMasaRepositoryPort,
    private readonly bloqueRepository: BloqueRepositoryPort,
    private readonly configuracionPort: ConfiguracionPort,
    private readonly produccionRepository: ProduccionRepositoryPort,
    private readonly equipoRepository: EquipoRepositoryPort,
    private readonly trabajadorRepository: TrabajadorRepositoryPort,
  ) {
    this.createMonoHiloMasasUseCase = new CreateMonoHiloMasasUseCase(
      repository,
      bloqueRepository,
      configuracionPort,
    )
  }

  async execute(
    dto: RegisterMonoHiloProduccionDto,
    actor: MonoHiloActor,
  ): Promise<RegisterMonoHiloProduccionResponseDto> {
    const fecha = normalizeFechaProduccion(dto.fecha)
    const bloqueId = dto.bloqueId.trim()
    if (!bloqueId) {
      throw new DomainError(
        'Debe seleccionar un bloque para registrar mono hilo.',
        400,
        'MONO_HILO_REGISTRO_BLOQUE_REQUERIDO',
      )
    }

    const bloque = await this.bloqueRepository.findById(bloqueId)
    if (!bloque) {
      throw new DomainError(`Bloque ${bloqueId} no existe`, 404, 'MONO_HILO_BLOQUE_NOT_FOUND')
    }

    const equipoId = dto.equipoId.trim()
    if (!equipoId) {
      throw new DomainError(
        'Debe seleccionar un equipo para registrar mono hilo.',
        400,
        'MONO_HILO_REGISTRO_EQUIPO_REQUERIDO',
      )
    }

    const equipo = await this.equipoRepository.findById(equipoId)
    if (!equipo || equipo.estado !== 'activo') {
      throw new DomainError(
        'Debe seleccionar un equipo activo para registrar mono hilo.',
        409,
        'MONO_HILO_REGISTRO_EQUIPO_INVALIDO',
      )
    }

    const trabajadoresSeleccionados = await resolveTrabajadoresActivos(
      dto.trabajadorIds,
      this.trabajadorRepository,
    )

    const observacionesBase = dto.observaciones?.trim() ?? ''
    const observacionesMeta = [
      observacionesBase,
      `Equipo: ${equipo.codigoInterno}`,
      `Trabajadores: ${trabajadoresSeleccionados.map((item) => item.nombre).join(', ')}`,
    ]
      .filter((item) => item.length > 0)
      .join(' | ')

    const createdMasas = await this.createMonoHiloMasasUseCase.execute(
      {
        bloqueId,
        masas: [
          {
            largoCm: dto.largoCm,
            anchoCm: dto.anchoCm,
            profundidadCm: dto.profundidadCm,
            observaciones: observacionesMeta || undefined,
          },
        ],
      },
      actor,
    )

    const masaIds = createdMasas.map((masa) => masa.id)
    let produccion: ProduccionDiaria | null = null

    try {
      const tipoPlaceholder: ProduccionDiaria['tipo'] = bloque.dimensionBase
        ? resolveTipoProductoByDimension(bloque.dimensionBase)
        : 'Plancha'
      const dimensionPlaceholder: ProduccionDiaria['dimension'] =
        bloque.dimensionBase ?? PLANCHA_DIMENSION_DEFAULT

      produccion = await this.produccionRepository.create({
        fecha,
        creadoPorId: actor.userId,
        creadoPorNombre: actor.userName,
        origenId: bloque.id,
        origenNombre: bloque.nombre,
        workflowTipo: 'mono_hilo',
        estadoRegistro: 'activo',
        tipo: tipoPlaceholder,
        dimension: dimensionPlaceholder,
        cantidadPicar: 0,
        cantidadEscuadrar: 0,
        cantidadDevastar: 0,
        cantidadResinar: 0,
        cantidadPulir: 0,
        totalLosas: 0,
        totalM2: 0,
        detallesAcciones: [],
        monoHiloDetalle: {
          equipoId: equipo.id,
          equipoNombre: equipo.codigoInterno,
          trabajadores: trabajadoresSeleccionados.map((trabajador) => ({
            id: trabajador.id,
            nombre: trabajador.nombre,
          })),
          masas: createdMasas.map((masa) => ({
            masaId: masa.id,
            masaCodigo: masa.codigo,
            largoCm: masa.largoCm,
            anchoCm: masa.anchoCm,
            profundidadCm: masa.profundidadCm,
          })),
          observaciones: observacionesBase || undefined,
        },
        aprobacionTallerEstado: 'pendiente',
        aprobacionAlmacenEstado: 'pendiente',
        inventarioAplicado: false,
        movimientoInventarioIds: [],
      })
      const produccionCreada = produccion

      const masasEnlazadas = await Promise.all(
        createdMasas.map(async (masa) => {
          const updated = await this.repository.update(masa.id, {
            produccionId: produccionCreada.id,
          })
          if (!updated) {
            throw new DomainError(
              `No se pudo enlazar la masa ${masa.id} con el registro de produccion.`,
              500,
              'MONO_HILO_REGISTRO_LINK_FAILED',
            )
          }
          return updated
        }),
      )

      return {
        produccion: produccionCreada,
        masas: masasEnlazadas,
      }
    } catch (error) {
      if (produccion) {
        await safeDeleteProduccion(produccion.id, this.produccionRepository)
      }
      await safeDeleteMasas(masaIds, this.repository)
      throw error
    }
  }
}

export class UpdateMonoHiloMasaUbicacionUseCase {
  constructor(private readonly repository: MonoHiloMasaRepositoryPort) {}

  async execute(
    id: string,
    dto: UpdateMonoHiloMasaUbicacionDto,
  ): Promise<MonoHiloMasaResponseDto> {
    const masa = await this.repository.findById(id)
    if (!masa) {
      throw new DomainError(`Masa ${id} no existe`, 404, 'MONO_HILO_MASA_NOT_FOUND')
    }

    if (masa.estado === 'anulada') {
      throw new DomainError(
        'La masa fue anulada y no puede moverse de ubicacion.',
        409,
        'MONO_HILO_MASA_ANULADA',
      )
    }

    if (masa.ubicacion === 'consumida') {
      throw new DomainError(
        'La masa ya fue consumida y no puede moverse de ubicacion.',
        409,
        'MONO_HILO_MASA_CONSUMIDA',
      )
    }

    const destino = dto.ubicacionDestino

    if (destino === masa.ubicacion) {
      return masa
    }

    validateUbicacionTransition(masa.ubicacion, destino)

    const updated = await this.repository.update(id, {
      ubicacion: destino,
    })

    if (!updated) {
      throw new DomainError(
        `No se pudo actualizar masa ${id}`,
        500,
        'MONO_HILO_MASA_UPDATE_FAILED',
      )
    }

    return updated
  }
}

export async function consumeMonoHiloMasasParaPicado(
  dto: ConsumeMonoHiloParaPicadoDto,
  repository: MonoHiloMasaRepositoryPort,
): Promise<void> {
  await assertMonoHiloPicadoConsumptionsDisponibles([dto], repository)
}

export async function assertMonoHiloPicadoConsumptionsDisponibles(
  consumptions: ConsumeMonoHiloParaPicadoDto[],
  repository: MonoHiloMasaRepositoryPort,
): Promise<void> {
  const activeConsumptions = consumptions.filter((item) => item.cantidadLosas > 0)
  if (activeConsumptions.length === 0) return

  const inventario = await repository.findAll()
  const stateById = new Map(
    inventario.map((masa) => [masa.id, buildCurrentMonoHiloSimulationState(masa)]),
  )

  for (const consumo of activeConsumptions) {
    applyMonoHiloPicadoConsumption(consumo, inventario, stateById, {
      requireProcessLocation: true,
    })
  }
}

export async function syncMonoHiloMasasFromProduccionState(
  produccionRepository: ProduccionRepositoryPort,
  repository: MonoHiloMasaRepositoryPort,
): Promise<void> {
  const [inventario, produccion] = await Promise.all([
    repository.findAll(),
    produccionRepository.findAll(),
  ])

  if (inventario.length === 0) return

  const stateById = new Map(
    inventario
      .filter((masa) => masa.estado !== 'anulada')
      .map((masa) => [masa.id, buildInitialMonoHiloSimulationState(masa)]),
  )

  const activos = produccion
    .filter((registro) => isRegularProduccionActivaParaMonoHilo(registro))
    .sort(compareMonoHiloReplayProduccion)

  for (const registro of activos) {
    const consumos = buildMonoHiloPicadoConsumptionsFromProduccion(registro)
    for (const consumo of consumos) {
      applyMonoHiloPicadoConsumption(consumo, inventario, stateById, {
        requireProcessLocation: false,
      })
    }
  }

  const snapshot = new Map<
    string,
    Pick<MonoHiloMasa, 'estimados' | 'remanentes' | 'ubicacion'>
  >()

  try {
    for (const masa of inventario) {
      if (masa.estado === 'anulada') continue

      const replay = stateById.get(masa.id)
      if (!replay) continue

      const remanentes = sortMonoHiloRemanentes(replay.remanentes)
      const ubicacion = resolveMonoHiloReplayUbicacion(masa, remanentes)
      const estimados = replay.estimados

      if (
        areMonoHiloEstimadosEqual(masa.estimados, estimados) &&
        areMonoHiloRemanentesEqual(masa.remanentes ?? [], remanentes) &&
        masa.ubicacion === ubicacion
      ) {
        continue
      }

      snapshot.set(masa.id, {
        estimados: structuredClone(masa.estimados),
        remanentes: structuredClone(masa.remanentes ?? []),
        ubicacion: masa.ubicacion,
      })

      const updated = await repository.update(masa.id, {
        estimados,
        remanentes,
        ubicacion,
      })

      if (!updated) {
        throw new DomainError(
          `No se pudo sincronizar la masa ${masa.id} desde el estado de produccion.`,
          500,
          'MONO_HILO_SYNC_UPDATE_FAILED',
        )
      }
    }
  } catch (error) {
    await Promise.all(
      Array.from(snapshot.entries()).map(async ([masaId, previous]) => {
        try {
          await repository.update(masaId, previous)
        } catch {
          // Best effort rollback.
        }
      }),
    )
    throw error
  }
}

function normalizeFechaProduccion(value: string): string {
  const fecha = value?.trim()
  if (!fecha) {
    throw new DomainError(
      'Debe indicar la fecha de produccion para registrar mono hilo.',
      400,
      'MONO_HILO_REGISTRO_FECHA_REQUERIDA',
    )
  }

  const parsed = new Date(`${fecha}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) {
    throw new DomainError(
      'La fecha de produccion de mono hilo no es valida.',
      400,
      'MONO_HILO_REGISTRO_FECHA_INVALIDA',
    )
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (parsed.getTime() > today.getTime()) {
    throw new DomainError(
      'La fecha de produccion no puede ser futura.',
      400,
      'MONO_HILO_REGISTRO_FECHA_FUTURA',
    )
  }

  return fecha
}

async function resolveTrabajadoresActivos(
  trabajadorIds: string[],
  trabajadorRepository: TrabajadorRepositoryPort,
): Promise<Trabajador[]> {
  const normalizedIds = [...new Set(trabajadorIds.map((trabajadorId) => trabajadorId.trim()).filter(Boolean))]
  if (normalizedIds.length === 0) {
    throw new DomainError(
      'Debe seleccionar al menos un trabajador para registrar mono hilo.',
      400,
      'MONO_HILO_REGISTRO_TRABAJADOR_REQUERIDO',
    )
  }

  const trabajadores = await trabajadorRepository.findAll()
  const trabajadoresById = new Map(trabajadores.map((trabajador) => [trabajador.id, trabajador]))
  const seleccionados = normalizedIds
    .map((trabajadorId) => trabajadoresById.get(trabajadorId))
    .filter((trabajador): trabajador is Trabajador => Boolean(trabajador))
    .filter((trabajador) => trabajador.estado === 'activo' && trabajador.rol === 'Obrero')

  if (seleccionados.length !== normalizedIds.length) {
    throw new DomainError(
      'Uno de los trabajadores seleccionados no esta activo o no es obrero.',
      409,
      'MONO_HILO_REGISTRO_TRABAJADOR_INVALIDO',
    )
  }

  return seleccionados
}

async function safeDeleteProduccion(
  produccionId: string,
  produccionRepository: ProduccionRepositoryPort,
): Promise<void> {
  try {
    await produccionRepository.delete(produccionId)
  } catch {
    // Best effort rollback.
  }
}

async function safeDeleteMasas(
  masaIds: string[],
  repository: MonoHiloMasaRepositoryPort,
): Promise<void> {
  await Promise.all(
    masaIds.map(async (masaId) => {
      try {
        await repository.delete(masaId)
      } catch {
        // Best effort rollback.
      }
    }),
  )
}

function validateUbicacionTransition(
  origen: UbicacionMasaMonoHilo,
  destino: Exclude<UbicacionMasaMonoHilo, 'consumida'>,
): void {
  if (origen === 'almacen' && destino === 'proceso') return
  if (origen === 'proceso' && destino === 'almacen') return

  throw new DomainError(
    `No se permite mover masa desde ${origen} hacia ${destino}.`,
    409,
    'MONO_HILO_TRANSICION_INVALIDA',
    { origen, destino },
  )
}

function normalizeStrictPositive(value: number, code: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new DomainError('Las dimensiones de masa deben ser mayores a 0.', 400, code)
  }
  return round2(value)
}

function normalizePositiveDecimal(
  value: number | undefined,
  defaultValue: number,
  code: string,
): number {
  if (value == null) return defaultValue
  if (!Number.isFinite(value) || value <= 0) {
    throw new DomainError('Parametro tecnico invalido para mono hilo.', 400, code)
  }
  return round2(value)
}

function resolveMaxConsecutivoMasa(masas: MonoHiloMasa[], bloqueCodigo: string): number {
  const escaped = bloqueCodigo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`^${escaped}-M(\\d{3,})$`)

  return masas.reduce((max, item) => {
    const match = item.codigo.match(regex)
    if (!match) return max
    return Math.max(max, Number.parseInt(match[1], 10) || 0)
  }, 0)
}

function buildMonoHiloEstimados(params: {
  largoCm: number
  anchoCm: number
  profundidadCm: number
  grosorDiscoMm: number
  espesorLosaCm: number
}): MonoHiloEstimados {
  const estimados = {} as MonoHiloEstimados

  MONO_HILO_DIMENSIONS.forEach((dimension) => {
    estimados[dimension] = buildMonoHiloEstimadoForDimension(params, dimension)
  })

  return estimados
}

function buildInitialMonoHiloRemanentes(params: {
  largoCm: number
  anchoCm: number
  profundidadCm: number
  grosorDiscoMm: number
  espesorLosaCm: number
}): MonoHiloRemanente[] {
  const kerfCm = params.grosorDiscoMm / 10
  const capasProfundidad = resolveCapasProfundidad(
    params.profundidadCm,
    params.espesorLosaCm,
    kerfCm,
  )

  return sortMonoHiloRemanentes(
    Array.from({ length: capasProfundidad }, () => ({
      largoCm: round2(params.largoCm),
      anchoCm: round2(params.anchoCm),
    })),
  )
}

function buildMonoHiloEstimadoForDimension(
  params: {
    largoCm: number
    anchoCm: number
    profundidadCm: number
    grosorDiscoMm: number
    espesorLosaCm: number
  },
  dimension: Dimension,
): MonoHiloEstimadoDimension {
  const spec = resolveDimensionObjetivoSpec(dimension)
  const kerfCm = params.grosorDiscoMm / 10
  const volumenTotalCm3 = params.largoCm * params.anchoCm * params.profundidadCm
  const cortesLargo = resolveCortesLineales(params.largoCm, spec.largoCm, kerfCm)
  const cortesAncho = resolveCortesLineales(params.anchoCm, spec.anchoCm, kerfCm)
  const capasProfundidad = resolveCapasProfundidad(
    params.profundidadCm,
    params.espesorLosaCm,
    kerfCm,
  )

  const losasEstimadas = Math.max(0, cortesLargo * cortesAncho * capasProfundidad)
  const volumenUtilCm3 = losasEstimadas * spec.largoCm * spec.anchoCm * params.espesorLosaCm
  const mermaCm3 = Math.max(0, volumenTotalCm3 - volumenUtilCm3)

  return {
    losasEstimadas,
    losasConsumidas: 0,
    mermaEstimadaM3: round4(mermaCm3 / 1_000_000),
    mermaEstimadaPorcentaje: volumenTotalCm3 <= 0 ? 0 : round2((mermaCm3 / volumenTotalCm3) * 100),
  }
}

function resolveMonoHiloDimension(dimension: string): Dimension {
  const normalized = normalizeDimension(dimension)
  if (!parseDimension(normalized)) {
    throw new DomainError(
      `La dimension ${dimension} no es valida para mono hilo.`,
      400,
      'MONO_HILO_DIMENSION_INVALIDA',
      { dimension },
    )
  }

  return normalized
}

function resolveDimensionObjetivoSpec(dimension: Dimension): { largoCm: number; anchoCm: number } {
  const parsed = parseDimension(dimension)
  if (!parsed) {
    throw new DomainError(
      `La dimension ${dimension} no es valida para mono hilo.`,
      400,
      'MONO_HILO_DIMENSION_INVALIDA',
      { dimension },
    )
  }

  return parsed
}

function resolveEstimadoDimension(
  masa: Pick<
    MonoHiloMasa,
    'estimados' | 'largoCm' | 'anchoCm' | 'profundidadCm' | 'grosorDiscoMm' | 'espesorLosaCm'
  >,
  dimension: Dimension,
): MonoHiloEstimadoDimension {
  const normalized = resolveMonoHiloDimension(dimension)
  return (
    masa.estimados[normalized] ??
    buildMonoHiloEstimadoForDimension(
      {
        largoCm: masa.largoCm,
        anchoCm: masa.anchoCm,
        profundidadCm: masa.profundidadCm,
        grosorDiscoMm: masa.grosorDiscoMm,
        espesorLosaCm: masa.espesorLosaCm,
      },
      normalized,
    )
  )
}

type MonoHiloSimulationState = {
  masa: MonoHiloMasa
  estimados: MonoHiloEstimados
  remanentes: MonoHiloRemanente[]
}

function buildCurrentMonoHiloSimulationState(masa: MonoHiloMasa): MonoHiloSimulationState {
  return {
    masa,
    estimados: structuredClone(masa.estimados),
    remanentes: resolveCurrentMonoHiloRemanentes(masa),
  }
}

function buildInitialMonoHiloSimulationState(masa: MonoHiloMasa): MonoHiloSimulationState {
  const estimadosBase = buildMonoHiloEstimados({
    largoCm: masa.largoCm,
    anchoCm: masa.anchoCm,
    profundidadCm: masa.profundidadCm,
    grosorDiscoMm: masa.grosorDiscoMm,
    espesorLosaCm: masa.espesorLosaCm,
  })

  return {
    masa,
    estimados: estimadosBase,
    remanentes: buildInitialMonoHiloRemanentes({
      largoCm: masa.largoCm,
      anchoCm: masa.anchoCm,
      profundidadCm: masa.profundidadCm,
      grosorDiscoMm: masa.grosorDiscoMm,
      espesorLosaCm: masa.espesorLosaCm,
    }),
  }
}

function resolveCurrentMonoHiloRemanentes(masa: MonoHiloMasa): MonoHiloRemanente[] {
  const remanentes = sortMonoHiloRemanentes(masa.remanentes ?? [])
  if (remanentes.length > 0 || masa.ubicacion === 'consumida') {
    return remanentes
  }

  return buildInitialMonoHiloRemanentes({
    largoCm: masa.largoCm,
    anchoCm: masa.anchoCm,
    profundidadCm: masa.profundidadCm,
    grosorDiscoMm: masa.grosorDiscoMm,
    espesorLosaCm: masa.espesorLosaCm,
  })
}

function applyMonoHiloPicadoConsumption(
  dto: ConsumeMonoHiloParaPicadoDto,
  inventario: MonoHiloMasa[],
  stateById: Map<string, MonoHiloSimulationState>,
  options: {
    requireProcessLocation: boolean
  },
): void {
  if (dto.cantidadLosas <= 0) return
  const dimension = resolveMonoHiloDimension(dto.dimension)
  const bloqueId = dto.bloqueId.trim()

  if (!bloqueId) {
    throw new DomainError(
      'La produccion de picado requiere bloque valido para consumir masas mono hilo.',
      400,
      'MONO_HILO_BLOQUE_CONSUMO_INVALIDO',
    )
  }

  const masaId = dto.masaId?.trim() || undefined
  if (masaId) {
    const masaSeleccionada = inventario.find((masa) => masa.id === masaId)
    if (!masaSeleccionada || masaSeleccionada.bloqueId !== bloqueId) {
      throw new DomainError(
        `La masa ${masaId} no pertenece al bloque seleccionado.`,
        404,
        'MONO_HILO_MASA_PICADO_NOT_FOUND',
        {
          bloqueId,
          masaId,
        },
      )
    }
    if (masaSeleccionada.estado === 'anulada') {
      throw new DomainError(
        `La masa ${masaSeleccionada.codigo} fue anulada y no puede consumirse.`,
        409,
        'MONO_HILO_MASA_PICADO_ANULADA',
        {
          bloqueId,
          masaId,
        },
      )
    }
    if (options.requireProcessLocation && masaSeleccionada.ubicacion !== 'proceso') {
      throw new DomainError(
        `La masa ${masaSeleccionada.codigo} no esta disponible en proceso para picado.`,
        409,
        'MONO_HILO_MASA_PICADO_UBICACION_INVALIDA',
        {
          bloqueId,
          masaId,
          ubicacion: masaSeleccionada.ubicacion,
        },
      )
    }
  }

  const candidatas = inventario
    .filter((masa) => masa.bloqueId === bloqueId)
    .filter((masa) => !masaId || masa.id === masaId)
    .filter((masa) => masa.estado !== 'anulada')
    .filter((masa) => !options.requireProcessLocation || masa.ubicacion === 'proceso')
    .map((masa) => {
      const state = stateById.get(masa.id)
      return state
        ? {
            masa,
            state,
            disponible: resolveMonoHiloLosasDisponiblesDesdeRemanentes(state, dimension),
          }
        : null
    })
    .filter(
      (
        item,
      ): item is {
        masa: MonoHiloMasa
        state: MonoHiloSimulationState
        disponible: number
      } => item !== null && item.disponible > 0,
    )
    .sort((a, b) => {
      if (b.disponible !== a.disponible) return b.disponible - a.disponible
      const fechaDelta = a.masa.fechaRegistro.localeCompare(b.masa.fechaRegistro)
      if (fechaDelta !== 0) return fechaDelta
      return a.masa.codigo.localeCompare(b.masa.codigo)
    })

  const totalDisponible = candidatas.reduce((sum, item) => sum + item.disponible, 0)
  if (totalDisponible < dto.cantidadLosas) {
    throw new DomainError(
      `Stock de masas en proceso insuficiente para picar ${dto.dimension}.`,
      409,
      'MONO_HILO_STOCK_PICADO_INSUFICIENTE',
      {
        bloqueId,
        dimension: dto.dimension,
        solicitadoLosas: dto.cantidadLosas,
        disponibleLosas: totalDisponible,
      },
    )
  }

  let restante = dto.cantidadLosas
  for (const item of candidatas) {
    if (restante <= 0) break

    const disponible = resolveMonoHiloLosasDisponiblesDesdeRemanentes(item.state, dimension)
    if (disponible <= 0) continue

    const retirar = Math.min(restante, disponible)
    item.state.remanentes = consumeMonoHiloRemanentes(
      item.state.remanentes,
      dimension,
      retirar,
      item.masa.grosorDiscoMm / 10,
    )

    const estimadoActual = resolveEstimadoDimension(item.state.masa, dimension)
    item.state.estimados = {
      ...item.state.estimados,
      [dimension]: {
        ...estimadoActual,
        losasConsumidas:
          (item.state.estimados[dimension]?.losasConsumidas ?? estimadoActual.losasConsumidas) +
          retirar,
      },
    }

    restante -= retirar
  }
}

function buildMonoHiloPicadoConsumptionsFromProduccion(
  registro: Pick<
    ProduccionDiaria,
    | 'origenId'
    | 'dimension'
    | 'cantidadPicar'
    | 'detallesAcciones'
    | 'workflowTipo'
    | 'estadoRegistro'
    | 'aprobacionTallerEstado'
  >,
): ConsumeMonoHiloParaPicadoDto[] {
  const detallesPicar = (registro.detallesAcciones ?? [])
    .filter((detalle) => detalle.accion === 'picar' && detalle.cantidadLosas > 0)
    .map((detalle) => ({
      bloqueId: registro.origenId,
      masaId: detalle.masaId?.trim() || undefined,
      dimension: registro.dimension,
      cantidadLosas: detalle.cantidadLosas,
    }))

  if (detallesPicar.length > 0) {
    return detallesPicar
  }

  if (registro.cantidadPicar <= 0) {
    return []
  }

  return [
    {
      bloqueId: registro.origenId,
      dimension: registro.dimension,
      cantidadLosas: registro.cantidadPicar,
    },
  ]
}

function isRegularProduccionActivaParaMonoHilo(
  registro: Pick<ProduccionDiaria, 'workflowTipo' | 'estadoRegistro' | 'aprobacionTallerEstado'>,
): boolean {
  return (
    registro.workflowTipo !== 'mono_hilo' &&
    registro.estadoRegistro !== 'anulado' &&
    registro.aprobacionTallerEstado !== 'rechazado'
  )
}

function compareMonoHiloReplayProduccion(
  left: Pick<ProduccionDiaria, 'fecha' | 'createdAt' | 'id'>,
  right: Pick<ProduccionDiaria, 'fecha' | 'createdAt' | 'id'>,
): number {
  const fechaDelta = left.fecha.localeCompare(right.fecha)
  if (fechaDelta !== 0) return fechaDelta

  const createdAtDelta = (left.createdAt ?? '').localeCompare(right.createdAt ?? '')
  if (createdAtDelta !== 0) return createdAtDelta

  return left.id.localeCompare(right.id)
}

function resolveCortesLineales(
  dimensionMasaCm: number,
  dimensionObjetivoCm: number,
  kerfCm: number,
): number {
  if (dimensionMasaCm <= 0) return 0

  return Math.max(0, Math.floor((dimensionMasaCm + kerfCm) / (dimensionObjetivoCm + kerfCm)))
}

function resolveCapasProfundidad(
  profundidadCm: number,
  espesorLosaCm: number,
  kerfCm: number,
): number {
  if (profundidadCm <= 0) return 0
  return Math.max(0, Math.floor((profundidadCm + kerfCm) / (espesorLosaCm + kerfCm)))
}

function resolveMargenAutomaticoCm(
  largoCm: number,
  anchoCm: number,
  grosorDiscoMm: number,
): number {
  const kerfCm = grosorDiscoMm / 10
  const candidatos = MONO_HILO_DIMENSIONS
    .map((dimension) => {
      const spec = resolveDimensionObjetivoSpec(dimension)
      const cortesLargo = resolveCortesLineales(largoCm, spec.largoCm, kerfCm)
      const cortesAncho = resolveCortesLineales(anchoCm, spec.anchoCm, kerfCm)
      return {
        losasEstimadas: cortesLargo * cortesAncho,
        margenLargoCm: resolveMargenLinealAutomaticoCm(largoCm, spec.largoCm, kerfCm),
        margenAnchoCm: resolveMargenLinealAutomaticoCm(anchoCm, spec.anchoCm, kerfCm),
      }
    })
    .filter((item) => item.losasEstimadas > 0)
    .sort((a, b) => b.losasEstimadas - a.losasEstimadas)

  if (candidatos.length === 0) return 0

  return round2(Math.min(candidatos[0].margenLargoCm, candidatos[0].margenAnchoCm))
}

function resolveMargenLinealAutomaticoCm(
  dimensionMasaCm: number,
  dimensionObjetivoCm: number,
  kerfCm: number,
): number {
  const cortes = resolveCortesLineales(dimensionMasaCm, dimensionObjetivoCm, kerfCm)
  if (cortes <= 0) return 0

  const remanenteCm = Math.max(
    0,
    dimensionMasaCm - cortes * dimensionObjetivoCm - Math.max(0, cortes - 1) * kerfCm,
  )

  return remanenteCm / 2
}

function resolveMonoHiloLosasDisponiblesDesdeRemanentes(
  state: Pick<MonoHiloSimulationState, 'masa' | 'remanentes'>,
  dimension: Dimension,
): number {
  const spec = resolveDimensionObjetivoSpec(dimension)
  const kerfCm = state.masa.grosorDiscoMm / 10

  return state.remanentes.reduce(
    (sum, remanente) =>
      sum +
      resolveCortesLineales(remanente.largoCm, spec.largoCm, kerfCm) *
        resolveCortesLineales(remanente.anchoCm, spec.anchoCm, kerfCm),
    0,
  )
}

function consumeMonoHiloRemanentes(
  remanentes: MonoHiloRemanente[],
  dimension: Dimension,
  cantidadLosas: number,
  kerfCm: number,
): MonoHiloRemanente[] {
  const spec = resolveDimensionObjetivoSpec(dimension)
  const next = sortMonoHiloRemanentes(remanentes)

  for (let index = 0; index < cantidadLosas; index += 1) {
    const selection = selectBestMonoHiloCut(next, spec, kerfCm)
    if (!selection) {
      throw new DomainError(
        `No hay remanente suficiente para recortar ${dimension}.`,
        409,
        'MONO_HILO_REMANENTE_INSUFICIENTE',
        {
          dimension,
          cantidadLosas,
        },
      )
    }

    next.splice(selection.index, 1, ...selection.replacements)
  }

  return sortMonoHiloRemanentes(next)
}

function selectBestMonoHiloCut(
  remanentes: MonoHiloRemanente[],
  spec: { largoCm: number; anchoCm: number },
  kerfCm: number,
): { index: number; replacements: MonoHiloRemanente[] } | null {
  let best:
    | {
        index: number
        replacements: MonoHiloRemanente[]
        slackArea: number
        remainingArea: number
        largestReplacementArea: number
      }
    | null = null

  for (const [index, remanente] of remanentes.entries()) {
    const split = resolveBestMonoHiloSplit(remanente, spec, kerfCm)
    if (!split) continue

    const slackArea = round4(remanente.largoCm * remanente.anchoCm - spec.largoCm * spec.anchoCm)
    const largestReplacementArea = split.replacements.reduce(
      (max, item) => Math.max(max, round4(item.largoCm * item.anchoCm)),
      0,
    )

    if (
      !best ||
      slackArea < best.slackArea ||
      (slackArea === best.slackArea && split.remainingArea > best.remainingArea) ||
      (slackArea === best.slackArea &&
        split.remainingArea === best.remainingArea &&
        largestReplacementArea > best.largestReplacementArea)
    ) {
      best = {
        index,
        replacements: split.replacements,
        slackArea,
        remainingArea: split.remainingArea,
        largestReplacementArea,
      }
    }
  }

  if (!best) {
    return null
  }

  return {
    index: best.index,
    replacements: best.replacements,
  }
}

function resolveBestMonoHiloSplit(
  remanente: MonoHiloRemanente,
  spec: { largoCm: number; anchoCm: number },
  kerfCm: number,
): { replacements: MonoHiloRemanente[]; remainingArea: number } | null {
  if (remanente.largoCm < spec.largoCm || remanente.anchoCm < spec.anchoCm) {
    return null
  }

  const verticalFirst = buildMonoHiloSplitOption(remanente, spec, kerfCm, 'vertical')
  const horizontalFirst = buildMonoHiloSplitOption(remanente, spec, kerfCm, 'horizontal')

  if (!verticalFirst) return horizontalFirst
  if (!horizontalFirst) return verticalFirst

  if (verticalFirst.remainingArea !== horizontalFirst.remainingArea) {
    return verticalFirst.remainingArea > horizontalFirst.remainingArea
      ? verticalFirst
      : horizontalFirst
  }

  const verticalLargest = verticalFirst.replacements.reduce(
    (max, item) => Math.max(max, round4(item.largoCm * item.anchoCm)),
    0,
  )
  const horizontalLargest = horizontalFirst.replacements.reduce(
    (max, item) => Math.max(max, round4(item.largoCm * item.anchoCm)),
    0,
  )

  return verticalLargest >= horizontalLargest ? verticalFirst : horizontalFirst
}

function buildMonoHiloSplitOption(
  remanente: MonoHiloRemanente,
  spec: { largoCm: number; anchoCm: number },
  kerfCm: number,
  mode: 'vertical' | 'horizontal',
): { replacements: MonoHiloRemanente[]; remainingArea: number } | null {
  const rightWidth = round2(remanente.largoCm - spec.largoCm - kerfCm)
  const topHeight = round2(remanente.anchoCm - spec.anchoCm - kerfCm)
  const replacements: MonoHiloRemanente[] = []

  if (mode === 'vertical') {
    if (rightWidth > 0) {
      replacements.push({
        largoCm: rightWidth,
        anchoCm: remanente.anchoCm,
      })
    }
    if (topHeight > 0) {
      replacements.push({
        largoCm: spec.largoCm,
        anchoCm: topHeight,
      })
    }
  } else {
    if (topHeight > 0) {
      replacements.push({
        largoCm: remanente.largoCm,
        anchoCm: topHeight,
      })
    }
    if (rightWidth > 0) {
      replacements.push({
        largoCm: rightWidth,
        anchoCm: spec.anchoCm,
      })
    }
  }

  const normalized = sortMonoHiloRemanentes(replacements)
  return {
    replacements: normalized,
    remainingArea: round4(
      normalized.reduce((sum, item) => sum + item.largoCm * item.anchoCm, 0),
    ),
  }
}

function sortMonoHiloRemanentes(remanentes: MonoHiloRemanente[]): MonoHiloRemanente[] {
  return remanentes
    .map((remanente) => ({
      largoCm: round2(remanente.largoCm),
      anchoCm: round2(remanente.anchoCm),
    }))
    .filter((remanente) => remanente.largoCm > 0 && remanente.anchoCm > 0)
    .sort((a, b) => {
      const areaDelta = b.largoCm * b.anchoCm - a.largoCm * a.anchoCm
      if (areaDelta !== 0) return areaDelta
      if (b.largoCm !== a.largoCm) return b.largoCm - a.largoCm
      return b.anchoCm - a.anchoCm
    })
}

function resolveMonoHiloReplayUbicacion(
  masa: MonoHiloMasa,
  remanentes: MonoHiloRemanente[],
): UbicacionMasaMonoHilo {
  if (remanentes.length === 0) {
    return 'consumida'
  }

  return masa.ubicacion === 'consumida' ? 'proceso' : masa.ubicacion
}

function areMonoHiloEstimadosEqual(
  left: MonoHiloEstimados,
  right: MonoHiloEstimados,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function areMonoHiloRemanentesEqual(
  left: MonoHiloRemanente[],
  right: MonoHiloRemanente[],
): boolean {
  return JSON.stringify(sortMonoHiloRemanentes(left)) === JSON.stringify(sortMonoHiloRemanentes(right))
}

function round2(value: number): number {
  return Number(value.toFixed(2))
}

function round4(value: number): number {
  return Number(value.toFixed(4))
}
