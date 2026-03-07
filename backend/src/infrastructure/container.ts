/**
 * Composition root: instancia puertos (repos) y casos de uso.
 * Si existe DATABASE_URL se usa PostgreSQL; si no, almacenamiento en memoria.
 */

import * as inMemory from './persistence/in-memory/index.js'
import * as postgres from './persistence/postgres/index.js'
import {
  GetConfiguracionUseCase,
  UpdateConfiguracionUseCase,
} from '../application/use-cases/configuracion/configuracion.use-cases.js'
import {
  GetBloquesUseCase,
  GetBloqueByIdUseCase,
  CreateBloqueUseCase,
  UpdateBloqueUseCase,
  DeleteBloqueUseCase,
} from '../application/use-cases/bloques/bloque.use-cases.js'
import {
  GetProductosUseCase,
  GetProductoByIdUseCase,
  CreateProductoUseCase,
  UpdateProductoUseCase,
  DeleteProductoUseCase,
} from '../application/use-cases/productos/producto.use-cases.js'
import {
  GetTrabajadoresUseCase,
  GetTrabajadorByIdUseCase,
  CreateTrabajadorUseCase,
  UpdateTrabajadorUseCase,
  DeleteTrabajadorUseCase,
} from '../application/use-cases/trabajadores/trabajador.use-cases.js'
import {
  GetEquiposUseCase,
  GetEquipoByIdUseCase,
  CreateEquipoUseCase,
  UpdateEquipoUseCase,
  DeleteEquipoUseCase,
} from '../application/use-cases/equipos/equipo.use-cases.js'
import {
  GetProduccionUseCase,
  GetProduccionByIdUseCase,
  CreateProduccionUseCase,
  UpdateProduccionUseCase,
  DeleteProduccionUseCase,
  GetProduccionTrabajadoresUseCase,
  GetProduccionTrabajadorByIdUseCase,
  CreateProduccionTrabajadorUseCase,
  UpdateProduccionTrabajadorUseCase,
  DeleteProduccionTrabajadorUseCase,
} from '../application/use-cases/produccion/produccion.use-cases.js'
import {
  GetMermasUseCase,
  GetMermaByIdUseCase,
  CreateMermaUseCase,
  UpdateMermaUseCase,
  DeleteMermaUseCase,
} from '../application/use-cases/mermas/merma.use-cases.js'
import {
  GetVentasUseCase,
  GetVentaByIdUseCase,
  CreateVentaUseCase,
  UpdateVentaUseCase,
  DeleteVentaUseCase,
} from '../application/use-cases/ventas/venta.use-cases.js'
import {
  GetHistorialPagosUseCase,
  GetHistorialPagoByIdUseCase,
  CreateHistorialPagoUseCase,
  UpdateHistorialPagoUseCase,
  DeleteHistorialPagoUseCase,
} from '../application/use-cases/historial-pagos/historial-pago.use-cases.js'
import { GetLogsUseCase, CreateLogUseCase } from '../application/use-cases/logs/log.use-cases.js'
import {
  GetWorkshopsUseCase,
  GetWorkshopByIdUseCase,
  CreateWorkshopUseCase,
  UpdateWorkshopUseCase,
  DeleteWorkshopUseCase,
} from '../application/use-cases/workshops/workshop.use-cases.js'
import { LoginUseCase } from '../application/use-cases/auth/auth.use-cases.js'

const usePostgres = Boolean(process.env.DATABASE_URL)

const configuracionPort = usePostgres
  ? new postgres.PostgresConfiguracionAdapter()
  : new inMemory.InMemoryConfiguracionAdapter()
const bloqueRepo = usePostgres
  ? new postgres.PostgresBloqueRepository()
  : new inMemory.InMemoryBloqueRepository()
const productoRepo = usePostgres
  ? new postgres.PostgresProductoRepository()
  : new inMemory.InMemoryProductoRepository()
const trabajadorRepo = usePostgres
  ? new postgres.PostgresTrabajadorRepository()
  : new inMemory.InMemoryTrabajadorRepository()
const equipoRepo = usePostgres
  ? new postgres.PostgresEquipoRepository()
  : new inMemory.InMemoryEquipoRepository()
const produccionRepo = usePostgres
  ? new postgres.PostgresProduccionRepository()
  : new inMemory.InMemoryProduccionRepository()
const produccionTrabajadorRepo = usePostgres
  ? new postgres.PostgresProduccionTrabajadorRepository()
  : new inMemory.InMemoryProduccionTrabajadorRepository()
const mermaRepo = usePostgres
  ? new postgres.PostgresMermaRepository()
  : new inMemory.InMemoryMermaRepository()
const ventaRepo = usePostgres
  ? new postgres.PostgresVentaRepository()
  : new inMemory.InMemoryVentaRepository()
const historialPagoRepo = usePostgres
  ? new postgres.PostgresHistorialPagoRepository()
  : new inMemory.InMemoryHistorialPagoRepository()
const logRepo = usePostgres
  ? new postgres.PostgresLogRepository()
  : new inMemory.InMemoryLogRepository()
const workshopRepo = usePostgres
  ? new postgres.PostgresWorkshopRepository()
  : new inMemory.InMemoryWorkshopRepository()
const authPort = usePostgres
  ? new postgres.PostgresAuthAdapter()
  : new inMemory.InMemoryAuthAdapter()

export const getConfiguracionUseCase = new GetConfiguracionUseCase(configuracionPort)
export const updateConfiguracionUseCase = new UpdateConfiguracionUseCase(configuracionPort)

export const getBloquesUseCase = new GetBloquesUseCase(bloqueRepo)
export const getBloqueByIdUseCase = new GetBloqueByIdUseCase(bloqueRepo)
export const createBloqueUseCase = new CreateBloqueUseCase(bloqueRepo)
export const updateBloqueUseCase = new UpdateBloqueUseCase(bloqueRepo)
export const deleteBloqueUseCase = new DeleteBloqueUseCase(bloqueRepo)

export const getProductosUseCase = new GetProductosUseCase(productoRepo)
export const getProductoByIdUseCase = new GetProductoByIdUseCase(productoRepo)
export const createProductoUseCase = new CreateProductoUseCase(productoRepo)
export const updateProductoUseCase = new UpdateProductoUseCase(productoRepo)
export const deleteProductoUseCase = new DeleteProductoUseCase(productoRepo)

export const getTrabajadoresUseCase = new GetTrabajadoresUseCase(trabajadorRepo)
export const getTrabajadorByIdUseCase = new GetTrabajadorByIdUseCase(trabajadorRepo)
export const createTrabajadorUseCase = new CreateTrabajadorUseCase(trabajadorRepo)
export const updateTrabajadorUseCase = new UpdateTrabajadorUseCase(trabajadorRepo)
export const deleteTrabajadorUseCase = new DeleteTrabajadorUseCase(trabajadorRepo)

export const getEquiposUseCase = new GetEquiposUseCase(equipoRepo)
export const getEquipoByIdUseCase = new GetEquipoByIdUseCase(equipoRepo)
export const createEquipoUseCase = new CreateEquipoUseCase(equipoRepo)
export const updateEquipoUseCase = new UpdateEquipoUseCase(equipoRepo)
export const deleteEquipoUseCase = new DeleteEquipoUseCase(equipoRepo)

export const getProduccionUseCase = new GetProduccionUseCase(produccionRepo)
export const getProduccionByIdUseCase = new GetProduccionByIdUseCase(produccionRepo)
export const createProduccionUseCase = new CreateProduccionUseCase(produccionRepo)
export const updateProduccionUseCase = new UpdateProduccionUseCase(produccionRepo)
export const deleteProduccionUseCase = new DeleteProduccionUseCase(produccionRepo)

export const getProduccionTrabajadoresUseCase = new GetProduccionTrabajadoresUseCase(produccionTrabajadorRepo)
export const getProduccionTrabajadorByIdUseCase = new GetProduccionTrabajadorByIdUseCase(produccionTrabajadorRepo)
export const createProduccionTrabajadorUseCase = new CreateProduccionTrabajadorUseCase(produccionTrabajadorRepo)
export const updateProduccionTrabajadorUseCase = new UpdateProduccionTrabajadorUseCase(produccionTrabajadorRepo)
export const deleteProduccionTrabajadorUseCase = new DeleteProduccionTrabajadorUseCase(produccionTrabajadorRepo)

export const getMermasUseCase = new GetMermasUseCase(mermaRepo)
export const getMermaByIdUseCase = new GetMermaByIdUseCase(mermaRepo)
export const createMermaUseCase = new CreateMermaUseCase(mermaRepo)
export const updateMermaUseCase = new UpdateMermaUseCase(mermaRepo)
export const deleteMermaUseCase = new DeleteMermaUseCase(mermaRepo)

export const getVentasUseCase = new GetVentasUseCase(ventaRepo)
export const getVentaByIdUseCase = new GetVentaByIdUseCase(ventaRepo)
export const createVentaUseCase = new CreateVentaUseCase(ventaRepo)
export const updateVentaUseCase = new UpdateVentaUseCase(ventaRepo)
export const deleteVentaUseCase = new DeleteVentaUseCase(ventaRepo)

export const getHistorialPagosUseCase = new GetHistorialPagosUseCase(historialPagoRepo)
export const getHistorialPagoByIdUseCase = new GetHistorialPagoByIdUseCase(historialPagoRepo)
export const createHistorialPagoUseCase = new CreateHistorialPagoUseCase(historialPagoRepo)
export const updateHistorialPagoUseCase = new UpdateHistorialPagoUseCase(historialPagoRepo)
export const deleteHistorialPagoUseCase = new DeleteHistorialPagoUseCase(historialPagoRepo)

export const getLogsUseCase = new GetLogsUseCase(logRepo)
export const createLogUseCase = new CreateLogUseCase(logRepo)

export const getWorkshopsUseCase = new GetWorkshopsUseCase(workshopRepo)
export const getWorkshopByIdUseCase = new GetWorkshopByIdUseCase(workshopRepo)
export const createWorkshopUseCase = new CreateWorkshopUseCase(workshopRepo)
export const updateWorkshopUseCase = new UpdateWorkshopUseCase(workshopRepo)
export const deleteWorkshopUseCase = new DeleteWorkshopUseCase(workshopRepo)

export const loginUseCase = new LoginUseCase(authPort)
