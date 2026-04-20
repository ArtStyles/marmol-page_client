import { DomainError } from '../../errors/domain.error.js'
import type {
  ConsumeMonoHiloParaPicadoDto,
  CreateMonoHiloMasasDto,
  MonoHiloMasaResponseDto,
  UpdateMonoHiloMasaUbicacionDto,
} from '../../dtos/index.js'
import type {
  Dimension,
  MonoHiloEstimados,
  MonoHiloMasa,
  UbicacionMasaMonoHilo,
} from '../../../domain/entities/index.js'
import type {
  BloqueRepositoryPort,
  ConfiguracionPort,
  MonoHiloMasaRepositoryPort,
} from '../../../domain/ports/index.js'

const DEFAULT_GROSOR_DISCO_MM = 8
const DEFAULT_ESPESOR_LOSA_CM = 3

const MONO_HILO_DIMENSIONS: Dimension[] = ['160x65', '160x60', '80x40', '60x40', '40x40']

const dimensionObjetivoSpecs: Record<Dimension, { largoCm: number; anchoCm: number }> = {
  '160x65': { largoCm: 160, anchoCm: 65 },
  '160x60': { largoCm: 160, anchoCm: 60 },
  '80x40': { largoCm: 80, anchoCm: 40 },
  '60x40': { largoCm: 60, anchoCm: 40 },
  '40x40': { largoCm: 40, anchoCm: 40 },
}

export class GetMonoHiloMasasUseCase {
  constructor(private readonly repository: MonoHiloMasaRepositoryPort) {}

  async execute(): Promise<MonoHiloMasaResponseDto[]> {
    return this.repository.findAll()
  }
}

export class CreateMonoHiloMasasUseCase {
  constructor(
    private readonly repository: MonoHiloMasaRepositoryPort,
    private readonly bloqueRepository: BloqueRepositoryPort,
    private readonly configuracionPort: ConfiguracionPort,
  ) {}

  async execute(dto: CreateMonoHiloMasasDto): Promise<MonoHiloMasaResponseDto[]> {
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
        codigo,
        largoCm,
        anchoCm,
        profundidadCm,
        margenCm: margenAutomaticoCm,
        grosorDiscoMm,
        espesorLosaCm,
        ubicacion: 'almacen',
        observaciones: masaInput.observaciones?.trim() ?? '',
        fechaRegistro: new Date().toISOString(),
        estimados,
      })

      created.push(createdItem)
    }

    return created
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
  if (dto.cantidadLosas <= 0) return

  const bloqueId = dto.bloqueId.trim()
  if (!bloqueId) {
    throw new DomainError(
      'La produccion de picado requiere bloque valido para consumir masas mono hilo.',
      400,
      'MONO_HILO_BLOQUE_CONSUMO_INVALIDO',
    )
  }

  const inventario = await repository.findAll()

  const candidatas = inventario
    .filter((masa) => masa.bloqueId === bloqueId)
    .filter((masa) => masa.ubicacion === 'proceso')
    .map((masa) => ({
      masa,
      disponible: resolveLosasDisponibles(masa, dto.dimension),
    }))
    .filter((item) => item.disponible > 0)
    .sort((a, b) => b.disponible - a.disponible)

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

    const retirar = Math.min(restante, item.disponible)
    const estimadoActual = item.masa.estimados[dto.dimension]
    const estimadosActualizados: MonoHiloEstimados = {
      ...item.masa.estimados,
      [dto.dimension]: {
        ...estimadoActual,
        losasConsumidas: estimadoActual.losasConsumidas + retirar,
      },
    }

    const ubicacion = hasDisponibilidad(estimadosActualizados) ? item.masa.ubicacion : 'consumida'

    const updated = await repository.update(item.masa.id, {
      estimados: estimadosActualizados,
      ubicacion,
    })

    if (!updated) {
      throw new DomainError(
        `No se pudo actualizar masa ${item.masa.id} para consumo de picado.`,
        500,
        'MONO_HILO_CONSUMO_UPDATE_FAILED',
      )
    }

    restante -= retirar
  }
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
  const kerfCm = params.grosorDiscoMm / 10
  const volumenTotalCm3 = params.largoCm * params.anchoCm * params.profundidadCm

  const estimados = {} as MonoHiloEstimados

  MONO_HILO_DIMENSIONS.forEach((dimension) => {
    const spec = dimensionObjetivoSpecs[dimension]

    const cortesLargo = resolveCortesLineales(params.largoCm, spec.largoCm, kerfCm)
    const cortesAncho = resolveCortesLineales(params.anchoCm, spec.anchoCm, kerfCm)
    const capasProfundidad = resolveCapasProfundidad(params.profundidadCm, params.espesorLosaCm, kerfCm)

    const losasEstimadas = Math.max(0, cortesLargo * cortesAncho * capasProfundidad)
    const volumenUtilCm3 =
      losasEstimadas * spec.largoCm * spec.anchoCm * params.espesorLosaCm
    const mermaCm3 = Math.max(0, volumenTotalCm3 - volumenUtilCm3)

    estimados[dimension] = {
      losasEstimadas,
      losasConsumidas: 0,
      mermaEstimadaM3: round4(mermaCm3 / 1_000_000),
      mermaEstimadaPorcentaje:
        volumenTotalCm3 <= 0 ? 0 : round2((mermaCm3 / volumenTotalCm3) * 100),
    }
  })

  return estimados
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
      const spec = dimensionObjetivoSpecs[dimension]
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

function resolveLosasDisponibles(masa: MonoHiloMasa, dimension: Dimension): number {
  const estimado = masa.estimados[dimension]
  return Math.max(0, estimado.losasEstimadas - estimado.losasConsumidas)
}

function hasDisponibilidad(estimados: MonoHiloEstimados): boolean {
  return MONO_HILO_DIMENSIONS.some((dimension) => {
    const item = estimados[dimension]
    return item.losasEstimadas - item.losasConsumidas > 0
  })
}

function round2(value: number): number {
  return Number(value.toFixed(2))
}

function round4(value: number): number {
  return Number(value.toFixed(4))
}
