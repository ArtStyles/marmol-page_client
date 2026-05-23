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
  GetCatalogoItemsUseCase,
  GetCatalogoItemByIdUseCase,
  CreateCatalogoItemUseCase,
  UpdateCatalogoItemUseCase,
  DeleteCatalogoItemUseCase,
} from '../application/use-cases/catalogo/catalogo.use-cases.js'
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
  ApproveProduccionTallerUseCase,
  ApproveEntradaProduccionAlmacenUseCase,
  CancelMonoHiloProduccionUseCase,
  UpdateProduccionUseCase,
  DeleteProduccionUseCase,
  GetProduccionTrabajadoresUseCase,
  GetProduccionTrabajadorByIdUseCase,
  CreateProduccionTrabajadorUseCase,
  UpdateProduccionTrabajadorUseCase,
  DeleteProduccionTrabajadorUseCase,
} from '../application/use-cases/produccion/produccion.use-cases.js'
import {
  GetMonoHiloMasasUseCase,
  CreateMonoHiloMasasUseCase,
  RegisterMonoHiloProduccionUseCase,
  UpdateMonoHiloMasaUbicacionUseCase,
} from '../application/use-cases/mono-hilo/mono-hilo.use-cases.js'
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
  GetGastosUseCase,
  GetGastoByIdUseCase,
  CreateGastoUseCase,
  UpdateGastoUseCase,
  CancelGastoUseCase,
  DeleteGastoUseCase,
} from '../application/use-cases/gastos/gasto.use-cases.js'
import {
  GetFondoOperativoUseCase,
  SetFondoOperativoUseCase,
} from '../application/use-cases/gastos/fondo-operativo.use-cases.js'
import { GetFinancialSummaryUseCase } from '../application/use-cases/finanzas/finanzas.use-cases.js'
import {
  GetHistorialPagosUseCase,
  GetHistorialPagoByIdUseCase,
  CreateHistorialPagoUseCase,
  UpdateHistorialPagoUseCase,
  DeleteHistorialPagoUseCase,
} from '../application/use-cases/historial-pagos/historial-pago.use-cases.js'
import { GetLogsUseCase, CreateLogUseCase } from '../application/use-cases/logs/log.use-cases.js'
import {
  GetInventarioMovimientosUseCase,
  GetInventarioMovimientoByIdUseCase,
  CreateSalidaProcesoInventarioUseCase,
  CreateSalidaAjusteInventarioUseCase,
  CreateRetornoProcesoInventarioUseCase,
  CreateRetornoProcesoMasaInventarioUseCase,
  ApproveInventarioMovimientoUseCase,
  RejectInventarioMovimientoUseCase,
} from '../application/use-cases/inventario-movimientos/inventario-movimiento.use-cases.js'
import {
  GetWorkshopsUseCase,
  GetWorkshopByIdUseCase,
  CreateWorkshopUseCase,
  UpdateWorkshopUseCase,
  DeleteWorkshopUseCase,
} from '../application/use-cases/workshops/workshop.use-cases.js'
import {
  GetPermissionDefinitionsUseCase,
  GetPermissionGroupsUseCase,
  CreatePermissionGroupUseCase,
  UpdatePermissionGroupUseCase,
  DeletePermissionGroupUseCase,
  GetUserAccessListUseCase,
  UpdateUserAccessUseCase,
} from '../application/use-cases/permissions/permission.use-cases.js'
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
const monoHiloMasaRepo = usePostgres
  ? new postgres.PostgresMonoHiloMasaRepository()
  : new inMemory.InMemoryMonoHiloMasaRepository()
const catalogoRepo = usePostgres
  ? new postgres.PostgresCatalogoRepository()
  : new inMemory.InMemoryCatalogoRepository()
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
const gastoRepo = usePostgres
  ? new postgres.PostgresGastoRepository()
  : new inMemory.InMemoryGastoRepository()
const fondoOperativoRepo = usePostgres
  ? new postgres.PostgresFondoOperativoRepository()
  : new inMemory.InMemoryFondoOperativoRepository()
const historialPagoRepo = usePostgres
  ? new postgres.PostgresHistorialPagoRepository()
  : new inMemory.InMemoryHistorialPagoRepository()
const logRepo = usePostgres
  ? new postgres.PostgresLogRepository()
  : new inMemory.InMemoryLogRepository()
const inventarioMovimientoRepo = usePostgres
  ? new postgres.PostgresInventarioMovimientoRepository()
  : new inMemory.InMemoryInventarioMovimientoRepository()
const workshopRepo = usePostgres
  ? new postgres.PostgresWorkshopRepository()
  : new inMemory.InMemoryWorkshopRepository()
const authPort = usePostgres
  ? new postgres.PostgresAuthAdapter()
  : new inMemory.InMemoryAuthAdapter()
const permissionRepo = usePostgres
  ? new postgres.PostgresPermissionRepository()
  : new inMemory.InMemoryPermissionRepository()

export const getConfiguracionUseCase = new GetConfiguracionUseCase(configuracionPort)
export const updateConfiguracionUseCase = new UpdateConfiguracionUseCase(configuracionPort)

export const getBloquesUseCase = new GetBloquesUseCase(bloqueRepo, {
  productoRepository: productoRepo,
  monoHiloMasaRepository: monoHiloMasaRepo,
  produccionRepository: produccionRepo,
  mermaRepository: mermaRepo,
  ventaRepository: ventaRepo,
  gastoRepository: gastoRepo,
})
export const getBloqueByIdUseCase = new GetBloqueByIdUseCase(bloqueRepo, {
  productoRepository: productoRepo,
  monoHiloMasaRepository: monoHiloMasaRepo,
  produccionRepository: produccionRepo,
  mermaRepository: mermaRepo,
  ventaRepository: ventaRepo,
  gastoRepository: gastoRepo,
})
export const createBloqueUseCase = new CreateBloqueUseCase(
  bloqueRepo,
  productoRepo,
  inventarioMovimientoRepo,
  gastoRepo,
  monoHiloMasaRepo,
  produccionRepo,
  mermaRepo,
  ventaRepo,
)
export const updateBloqueUseCase = new UpdateBloqueUseCase(bloqueRepo, {
  productoRepository: productoRepo,
  monoHiloMasaRepository: monoHiloMasaRepo,
  produccionRepository: produccionRepo,
  mermaRepository: mermaRepo,
  ventaRepository: ventaRepo,
  gastoRepository: gastoRepo,
})
export const deleteBloqueUseCase = new DeleteBloqueUseCase(bloqueRepo, {
  productoRepository: productoRepo,
  monoHiloMasaRepository: monoHiloMasaRepo,
  produccionRepository: produccionRepo,
  mermaRepository: mermaRepo,
  ventaRepository: ventaRepo,
  gastoRepository: gastoRepo,
})

export const getProductosUseCase = new GetProductosUseCase(productoRepo)
export const getProductoByIdUseCase = new GetProductoByIdUseCase(productoRepo)
export const createProductoUseCase = new CreateProductoUseCase(productoRepo)
export const updateProductoUseCase = new UpdateProductoUseCase(productoRepo)
export const deleteProductoUseCase = new DeleteProductoUseCase(productoRepo)

export const getCatalogoItemsUseCase = new GetCatalogoItemsUseCase(catalogoRepo)
export const getCatalogoItemByIdUseCase = new GetCatalogoItemByIdUseCase(catalogoRepo)
export const createCatalogoItemUseCase = new CreateCatalogoItemUseCase(catalogoRepo)
export const updateCatalogoItemUseCase = new UpdateCatalogoItemUseCase(catalogoRepo)
export const deleteCatalogoItemUseCase = new DeleteCatalogoItemUseCase(catalogoRepo)

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
export const createProduccionUseCase = new CreateProduccionUseCase(
  produccionRepo,
  productoRepo,
  monoHiloMasaRepo,
  produccionTrabajadorRepo,
  trabajadorRepo,
  configuracionPort,
)
export const approveProduccionTallerUseCase = new ApproveProduccionTallerUseCase(
  produccionRepo,
  productoRepo,
  monoHiloMasaRepo,
  produccionTrabajadorRepo,
  trabajadorRepo,
  configuracionPort,
)
export const approveEntradaProduccionAlmacenUseCase = new ApproveEntradaProduccionAlmacenUseCase(
  produccionRepo,
  bloqueRepo,
  productoRepo,
  inventarioMovimientoRepo,
)
export const cancelMonoHiloProduccionUseCase = new CancelMonoHiloProduccionUseCase(
  produccionRepo,
  monoHiloMasaRepo,
)
export const updateProduccionUseCase = new UpdateProduccionUseCase(
  produccionRepo,
  productoRepo,
  monoHiloMasaRepo,
  produccionTrabajadorRepo,
  trabajadorRepo,
  configuracionPort,
)
export const deleteProduccionUseCase = new DeleteProduccionUseCase(
  produccionRepo,
  productoRepo,
  monoHiloMasaRepo,
  produccionTrabajadorRepo,
  trabajadorRepo,
  configuracionPort,
)

export const getProduccionTrabajadoresUseCase = new GetProduccionTrabajadoresUseCase(produccionTrabajadorRepo)
export const getProduccionTrabajadorByIdUseCase = new GetProduccionTrabajadorByIdUseCase(produccionTrabajadorRepo)
export const createProduccionTrabajadorUseCase = new CreateProduccionTrabajadorUseCase(produccionTrabajadorRepo)
export const updateProduccionTrabajadorUseCase = new UpdateProduccionTrabajadorUseCase(produccionTrabajadorRepo)
export const deleteProduccionTrabajadorUseCase = new DeleteProduccionTrabajadorUseCase(produccionTrabajadorRepo)

export const getMonoHiloMasasUseCase = new GetMonoHiloMasasUseCase(
  monoHiloMasaRepo,
  produccionRepo,
)
export const createMonoHiloMasasUseCase = new CreateMonoHiloMasasUseCase(
  monoHiloMasaRepo,
  bloqueRepo,
  configuracionPort,
)
export const registerMonoHiloProduccionUseCase = new RegisterMonoHiloProduccionUseCase(
  monoHiloMasaRepo,
  bloqueRepo,
  configuracionPort,
  produccionRepo,
  equipoRepo,
  trabajadorRepo,
)
export const updateMonoHiloMasaUbicacionUseCase = new UpdateMonoHiloMasaUbicacionUseCase(
  monoHiloMasaRepo,
)

export const getMermasUseCase = new GetMermasUseCase(mermaRepo)
export const getMermaByIdUseCase = new GetMermaByIdUseCase(mermaRepo)
export const createMermaUseCase = new CreateMermaUseCase(
  mermaRepo,
  productoRepo,
  inventarioMovimientoRepo,
)
export const updateMermaUseCase = new UpdateMermaUseCase(mermaRepo)
export const deleteMermaUseCase = new DeleteMermaUseCase(mermaRepo)

export const getVentasUseCase = new GetVentasUseCase(ventaRepo)
export const getVentaByIdUseCase = new GetVentaByIdUseCase(ventaRepo)
export const createVentaUseCase = new CreateVentaUseCase(
  ventaRepo,
  productoRepo,
  inventarioMovimientoRepo,
)
export const updateVentaUseCase = new UpdateVentaUseCase(ventaRepo)
export const deleteVentaUseCase = new DeleteVentaUseCase(ventaRepo)

export const getFondoOperativoUseCase = new GetFondoOperativoUseCase(fondoOperativoRepo, gastoRepo)
export const setFondoOperativoUseCase = new SetFondoOperativoUseCase(fondoOperativoRepo, gastoRepo)

export const getGastosUseCase = new GetGastosUseCase(
  gastoRepo,
  bloqueRepo,
  historialPagoRepo,
  trabajadorRepo,
)
export const getGastoByIdUseCase = new GetGastoByIdUseCase(
  gastoRepo,
  bloqueRepo,
  historialPagoRepo,
  trabajadorRepo,
)
export const createGastoUseCase = new CreateGastoUseCase(gastoRepo)
export const updateGastoUseCase = new UpdateGastoUseCase(gastoRepo)
export const cancelGastoUseCase = new CancelGastoUseCase(gastoRepo)
export const deleteGastoUseCase = new DeleteGastoUseCase(gastoRepo)
export const getFinancialSummaryUseCase = new GetFinancialSummaryUseCase(
  configuracionPort,
  gastoRepo,
  bloqueRepo,
  historialPagoRepo,
  trabajadorRepo,
  mermaRepo,
  produccionRepo,
  produccionTrabajadorRepo,
  ventaRepo,
)

export const getHistorialPagosUseCase = new GetHistorialPagosUseCase(historialPagoRepo)
export const getHistorialPagoByIdUseCase = new GetHistorialPagoByIdUseCase(historialPagoRepo)
export const createHistorialPagoUseCase = new CreateHistorialPagoUseCase(
  historialPagoRepo,
  produccionTrabajadorRepo,
  trabajadorRepo,
  configuracionPort,
  gastoRepo,
)
export const updateHistorialPagoUseCase = new UpdateHistorialPagoUseCase(historialPagoRepo)
export const deleteHistorialPagoUseCase = new DeleteHistorialPagoUseCase(historialPagoRepo)

export const getLogsUseCase = new GetLogsUseCase(logRepo)
export const createLogUseCase = new CreateLogUseCase(logRepo)
export const getInventarioMovimientosUseCase = new GetInventarioMovimientosUseCase(
  inventarioMovimientoRepo,
)
export const getInventarioMovimientoByIdUseCase = new GetInventarioMovimientoByIdUseCase(
  inventarioMovimientoRepo,
)
export const createSalidaProcesoInventarioUseCase = new CreateSalidaProcesoInventarioUseCase(
  inventarioMovimientoRepo,
  productoRepo,
)
export const createSalidaAjusteInventarioUseCase = new CreateSalidaAjusteInventarioUseCase(
  inventarioMovimientoRepo,
  productoRepo,
)
export const createRetornoProcesoInventarioUseCase = new CreateRetornoProcesoInventarioUseCase(
  inventarioMovimientoRepo,
  productoRepo,
)
export const createRetornoProcesoMasaInventarioUseCase =
  new CreateRetornoProcesoMasaInventarioUseCase(inventarioMovimientoRepo, monoHiloMasaRepo)
export const approveInventarioMovimientoUseCase = new ApproveInventarioMovimientoUseCase(
  inventarioMovimientoRepo,
  productoRepo,
  monoHiloMasaRepo,
  bloqueRepo,
  ventaRepo,
  mermaRepo,
  produccionRepo,
)
export const rejectInventarioMovimientoUseCase = new RejectInventarioMovimientoUseCase(
  inventarioMovimientoRepo,
  ventaRepo,
  mermaRepo,
  produccionRepo,
)

export const getWorkshopsUseCase = new GetWorkshopsUseCase(workshopRepo)
export const getWorkshopByIdUseCase = new GetWorkshopByIdUseCase(workshopRepo)
export const createWorkshopUseCase = new CreateWorkshopUseCase(workshopRepo)
export const updateWorkshopUseCase = new UpdateWorkshopUseCase(workshopRepo)
export const deleteWorkshopUseCase = new DeleteWorkshopUseCase(workshopRepo)

export const getPermissionDefinitionsUseCase = new GetPermissionDefinitionsUseCase(permissionRepo)
export const getPermissionGroupsUseCase = new GetPermissionGroupsUseCase(permissionRepo)
export const createPermissionGroupUseCase = new CreatePermissionGroupUseCase(permissionRepo)
export const updatePermissionGroupUseCase = new UpdatePermissionGroupUseCase(permissionRepo)
export const deletePermissionGroupUseCase = new DeletePermissionGroupUseCase(permissionRepo)
export const getUserAccessListUseCase = new GetUserAccessListUseCase(permissionRepo)
export const updateUserAccessUseCase = new UpdateUserAccessUseCase(permissionRepo)

export const loginUseCase = new LoginUseCase(authPort, permissionRepo)
