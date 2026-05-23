import { Router } from 'express'
import { asyncHandler } from '../middlewares/async-handler.middleware.js'
import { requirePermission } from '../middlewares/permission.middleware.js'
import { validateBody } from '../middlewares/validate.middleware.js'
import {
  createBloqueSchema,
  updateBloqueSchema,
  createProductoSchema,
  updateProductoSchema,
  createCatalogoItemSchema,
  updateCatalogoItemSchema,
  createTrabajadorSchema,
  updateTrabajadorSchema,
  createEquipoSchema,
  updateEquipoSchema,
  createMermaSchema,
  updateMermaSchema,
  createVentaSchema,
  updateVentaSchema,
  cancelGastoSchema,
  createGastoSchema,
  updateGastoSchema,
  setFondoOperativoSchema,
  createProduccionSchema,
  approveProduccionTallerSchema,
  approveProduccionAlmacenSchema,
  cancelMonoHiloProduccionSchema,
  updateProduccionSchema,
  createProduccionTrabajadorSchema,
  updateProduccionTrabajadorSchema,
  approveInventarioMovimientoSchema,
  rejectInventarioMovimientoSchema,
  createSalidaProcesoInventarioSchema,
  createSalidaAjusteInventarioSchema,
  createRetornoProcesoInventarioSchema,
  createRetornoProcesoMasaInventarioSchema,
  createMonoHiloMasasSchema,
  registerMonoHiloProduccionSchema,
  updateMonoHiloMasaUbicacionSchema,
  createHistorialPagoSchema,
  updateHistorialPagoSchema,
  createLogSchema,
  createWorkshopSchema,
  updateWorkshopSchema,
  createPermissionGroupSchema,
  updatePermissionGroupSchema,
  updateUserAccessSchema,
  loginSchema,
  updateConfiguracionSchema,
} from '../schemas/request.schemas.js'
import * as configuracionCtrl from '../controllers/configuracion.controller.js'
import * as bloqueCtrl from '../controllers/bloque.controller.js'
import * as productoCtrl from '../controllers/producto.controller.js'
import * as catalogoCtrl from '../controllers/catalogo.controller.js'
import * as trabajadorCtrl from '../controllers/trabajador.controller.js'
import * as equipoCtrl from '../controllers/equipo.controller.js'
import * as produccionCtrl from '../controllers/produccion.controller.js'
import * as mermaCtrl from '../controllers/merma.controller.js'
import * as ventaCtrl from '../controllers/venta.controller.js'
import * as inventarioMovimientoCtrl from '../controllers/inventario-movimiento.controller.js'
import * as monoHiloCtrl from '../controllers/mono-hilo.controller.js'
import * as gastoCtrl from '../controllers/gasto.controller.js'
import * as finanzasCtrl from '../controllers/finanzas.controller.js'
import * as historialPagoCtrl from '../controllers/historial-pago.controller.js'
import * as logCtrl from '../controllers/log.controller.js'
import * as workshopCtrl from '../controllers/workshop.controller.js'
import * as authCtrl from '../controllers/auth.controller.js'
import * as permissionCtrl from '../controllers/permission.controller.js'

const api = Router()

// ----- Configuracion -----
api.get('/configuracion', requirePermission('configuracion:read'), asyncHandler(configuracionCtrl.getConfiguracion))
api.put(
  '/configuracion',
  requirePermission('configuracion:write'),
  validateBody(updateConfiguracionSchema),
  asyncHandler(configuracionCtrl.updateConfiguracion),
)

// ----- Bloques -----
api.get('/bloques', requirePermission('bloques:read'), asyncHandler(bloqueCtrl.getBloques))
api.get('/bloques/:id', requirePermission('bloques:read'), asyncHandler(bloqueCtrl.getBloqueById))
api.post(
  '/bloques',
  requirePermission('bloques:write'),
  validateBody(createBloqueSchema),
  asyncHandler(bloqueCtrl.createBloque),
)
api.patch(
  '/bloques/:id',
  requirePermission('bloques:write'),
  validateBody(updateBloqueSchema),
  asyncHandler(bloqueCtrl.updateBloque),
)
api.delete('/bloques/:id', requirePermission('bloques:write'), asyncHandler(bloqueCtrl.deleteBloque))

// ----- Productos -----
api.get('/productos', requirePermission('inventario:read'), asyncHandler(productoCtrl.getProductos))
api.get(
  '/productos/:id',
  requirePermission('inventario:read'),
  asyncHandler(productoCtrl.getProductoById),
)
api.post(
  '/productos',
  requirePermission('inventario:write'),
  validateBody(createProductoSchema),
  asyncHandler(productoCtrl.createProducto),
)
api.patch(
  '/productos/:id',
  requirePermission('inventario:write'),
  validateBody(updateProductoSchema),
  asyncHandler(productoCtrl.updateProducto),
)
api.delete(
  '/productos/:id',
  requirePermission('inventario:write'),
  asyncHandler(productoCtrl.deleteProducto),
)
api.get(
  '/inventario-movimientos',
  requirePermission('inventario:read'),
  asyncHandler(inventarioMovimientoCtrl.getInventarioMovimientos),
)
api.get(
  '/inventario-movimientos/:id',
  requirePermission('inventario:read'),
  asyncHandler(inventarioMovimientoCtrl.getInventarioMovimientoById),
)
api.post(
  '/inventario-movimientos/proceso-salida',
  requirePermission('inventario:approve'),
  validateBody(createSalidaProcesoInventarioSchema),
  asyncHandler(inventarioMovimientoCtrl.createSalidaProcesoInventario),
)
api.post(
  '/inventario-movimientos/ajuste-salida',
  requirePermission('inventario:approve'),
  validateBody(createSalidaAjusteInventarioSchema),
  asyncHandler(inventarioMovimientoCtrl.createSalidaAjusteInventario),
)
api.post(
  '/inventario-movimientos/proceso-retorno',
  requirePermission('inventario:write'),
  validateBody(createRetornoProcesoInventarioSchema),
  asyncHandler(inventarioMovimientoCtrl.createRetornoProcesoInventario),
)
api.post(
  '/inventario-movimientos/proceso-retorno-masa',
  requirePermission('inventario:write'),
  validateBody(createRetornoProcesoMasaInventarioSchema),
  asyncHandler(inventarioMovimientoCtrl.createRetornoProcesoMasaInventario),
)
api.patch(
  '/inventario-movimientos/:id/aprobar',
  requirePermission('inventario:approve'),
  validateBody(approveInventarioMovimientoSchema),
  asyncHandler(inventarioMovimientoCtrl.approveInventarioMovimiento),
)
api.patch(
  '/inventario-movimientos/:id/rechazar',
  requirePermission('inventario:approve'),
  validateBody(rejectInventarioMovimientoSchema),
  asyncHandler(inventarioMovimientoCtrl.rejectInventarioMovimiento),
)

api.get(
  '/mono-hilo/masas',
  requirePermission('produccion:read'),
  asyncHandler(monoHiloCtrl.getMonoHiloMasas),
)
api.post(
  '/mono-hilo/masas',
  requirePermission('produccion:write'),
  validateBody(createMonoHiloMasasSchema),
  asyncHandler(monoHiloCtrl.createMonoHiloMasas),
)
api.post(
  '/mono-hilo/registro',
  requirePermission('produccion:write'),
  validateBody(registerMonoHiloProduccionSchema),
  asyncHandler(monoHiloCtrl.registerMonoHiloProduccion),
)
api.patch(
  '/mono-hilo/masas/:id/ubicacion',
  requirePermission('produccion:write'),
  validateBody(updateMonoHiloMasaUbicacionSchema),
  asyncHandler(monoHiloCtrl.updateMonoHiloMasaUbicacion),
)
// ----- Catalogo -----
api.get('/catalogo', asyncHandler(catalogoCtrl.getCatalogoItems))
api.get('/catalogo/:id', asyncHandler(catalogoCtrl.getCatalogoItemById))
api.post(
  '/catalogo',
  requirePermission('catalogo:write'),
  validateBody(createCatalogoItemSchema),
  asyncHandler(catalogoCtrl.createCatalogoItem),
)
api.patch(
  '/catalogo/:id',
  requirePermission('catalogo:write'),
  validateBody(updateCatalogoItemSchema),
  asyncHandler(catalogoCtrl.updateCatalogoItem),
)
api.delete(
  '/catalogo/:id',
  requirePermission('catalogo:write'),
  asyncHandler(catalogoCtrl.deleteCatalogoItem),
)

// ----- Trabajadores -----
api.get('/trabajadores', requirePermission('trabajadores:read'), asyncHandler(trabajadorCtrl.getTrabajadores))
api.get(
  '/trabajadores/:id',
  requirePermission('trabajadores:read'),
  asyncHandler(trabajadorCtrl.getTrabajadorById),
)
api.post(
  '/trabajadores',
  requirePermission('trabajadores:write'),
  validateBody(createTrabajadorSchema),
  asyncHandler(trabajadorCtrl.createTrabajador),
)
api.patch(
  '/trabajadores/:id',
  requirePermission('trabajadores:write'),
  validateBody(updateTrabajadorSchema),
  asyncHandler(trabajadorCtrl.updateTrabajador),
)
api.delete(
  '/trabajadores/:id',
  requirePermission('trabajadores:write'),
  asyncHandler(trabajadorCtrl.deleteTrabajador),
)

// ----- Equipos -----
api.get('/equipos', requirePermission('equipos:read'), asyncHandler(equipoCtrl.getEquipos))
api.get('/equipos/:id', requirePermission('equipos:read'), asyncHandler(equipoCtrl.getEquipoById))
api.post(
  '/equipos',
  requirePermission('equipos:write'),
  validateBody(createEquipoSchema),
  asyncHandler(equipoCtrl.createEquipo),
)
api.patch(
  '/equipos/:id',
  requirePermission('equipos:write'),
  validateBody(updateEquipoSchema),
  asyncHandler(equipoCtrl.updateEquipo),
)
api.delete('/equipos/:id', requirePermission('equipos:write'), asyncHandler(equipoCtrl.deleteEquipo))

// ----- Produccion -----
api.get('/produccion', requirePermission('produccion:read'), asyncHandler(produccionCtrl.getProduccion))
api.get(
  '/produccion/:id',
  requirePermission('produccion:read'),
  asyncHandler(produccionCtrl.getProduccionById),
)
api.post(
  '/produccion',
  requirePermission('produccion:write'),
  validateBody(createProduccionSchema),
  asyncHandler(produccionCtrl.createProduccion),
)
api.patch(
  '/produccion/:id/aprobar-taller',
  requirePermission('produccion:approve_taller'),
  validateBody(approveProduccionTallerSchema),
  asyncHandler(produccionCtrl.approveProduccionTaller),
)
api.patch(
  '/produccion/:id/aprobar-almacen',
  requirePermission('inventario:approve'),
  validateBody(approveProduccionAlmacenSchema),
  asyncHandler(produccionCtrl.approveProduccionAlmacen),
)
api.patch(
  '/produccion/:id/anular-mono-hilo',
  requirePermission('produccion:write'),
  validateBody(cancelMonoHiloProduccionSchema),
  asyncHandler(produccionCtrl.cancelMonoHiloProduccion),
)
api.patch(
  '/produccion/:id',
  requirePermission('produccion:write'),
  validateBody(updateProduccionSchema),
  asyncHandler(produccionCtrl.updateProduccion),
)
api.delete(
  '/produccion/:id',
  requirePermission('produccion:write'),
  asyncHandler(produccionCtrl.deleteProduccion),
)

api.get(
  '/produccion-trabajadores',
  requirePermission('asignaciones:read'),
  asyncHandler(produccionCtrl.getProduccionTrabajadores),
)
api.get(
  '/produccion-trabajadores/:id',
  requirePermission('asignaciones:read'),
  asyncHandler(produccionCtrl.getProduccionTrabajadorById),
)
api.post(
  '/produccion-trabajadores',
  requirePermission('asignaciones:write'),
  validateBody(createProduccionTrabajadorSchema),
  asyncHandler(produccionCtrl.createProduccionTrabajador),
)
api.patch(
  '/produccion-trabajadores/:id',
  requirePermission('asignaciones:write'),
  validateBody(updateProduccionTrabajadorSchema),
  asyncHandler(produccionCtrl.updateProduccionTrabajador),
)
api.delete(
  '/produccion-trabajadores/:id',
  requirePermission('asignaciones:write'),
  asyncHandler(produccionCtrl.deleteProduccionTrabajador),
)

// ----- Mermas -----
api.get('/mermas', requirePermission('mermas:read'), asyncHandler(mermaCtrl.getMermas))
api.get('/mermas/:id', requirePermission('mermas:read'), asyncHandler(mermaCtrl.getMermaById))
api.post(
  '/mermas',
  requirePermission('mermas:write'),
  validateBody(createMermaSchema),
  asyncHandler(mermaCtrl.createMerma),
)
api.patch(
  '/mermas/:id',
  requirePermission('mermas:write'),
  validateBody(updateMermaSchema),
  asyncHandler(mermaCtrl.updateMerma),
)
api.delete('/mermas/:id', requirePermission('mermas:write'), asyncHandler(mermaCtrl.deleteMerma))

// ----- Ventas -----
api.get('/ventas', requirePermission('ventas:read'), asyncHandler(ventaCtrl.getVentas))
api.get('/ventas/:id', requirePermission('ventas:read'), asyncHandler(ventaCtrl.getVentaById))
api.post(
  '/ventas',
  requirePermission('ventas:write'),
  validateBody(createVentaSchema),
  asyncHandler(ventaCtrl.createVenta),
)
api.patch(
  '/ventas/:id',
  requirePermission('ventas:write'),
  validateBody(updateVentaSchema),
  asyncHandler(ventaCtrl.updateVenta),
)
api.delete('/ventas/:id', requirePermission('ventas:write'), asyncHandler(ventaCtrl.deleteVenta))

// ----- Gastos -----
api.get('/gastos', requirePermission('gastos:read'), asyncHandler(gastoCtrl.getGastos))
api.get('/gastos/resumen', requirePermission('gastos:read'), asyncHandler(gastoCtrl.getGastosResumen))
api.get('/gastos/fondo-actual', requirePermission('gastos:read'), asyncHandler(gastoCtrl.getFondoActual))
api.post(
  '/gastos/fondo',
  requirePermission('gastos:write'),
  validateBody(setFondoOperativoSchema),
  asyncHandler(gastoCtrl.setFondoOperativo),
)
api.get('/gastos/:id', requirePermission('gastos:read'), asyncHandler(gastoCtrl.getGastoById))
api.post(
  '/gastos',
  requirePermission('gastos:write'),
  validateBody(createGastoSchema),
  asyncHandler(gastoCtrl.createGasto),
)
api.patch(
  '/gastos/:id',
  requirePermission('gastos:write'),
  validateBody(updateGastoSchema),
  asyncHandler(gastoCtrl.updateGasto),
)
api.patch(
  '/gastos/:id/anular',
  requirePermission('gastos:write'),
  validateBody(cancelGastoSchema),
  asyncHandler(gastoCtrl.cancelGasto),
)
api.delete('/gastos/:id', requirePermission('gastos:write'), asyncHandler(gastoCtrl.deleteGasto))

// ----- Finanzas -----
api.get('/finanzas/resumen', requirePermission('finanzas:read'), asyncHandler(finanzasCtrl.getFinancialSummary))

// ----- Historial Pagos -----
api.get('/historial-pagos', requirePermission('pagos:read'), asyncHandler(historialPagoCtrl.getHistorialPagos))
api.get(
  '/historial-pagos/:id',
  requirePermission('pagos:read'),
  asyncHandler(historialPagoCtrl.getHistorialPagoById),
)
api.post(
  '/historial-pagos',
  requirePermission('pagos:write'),
  validateBody(createHistorialPagoSchema),
  asyncHandler(historialPagoCtrl.createHistorialPago),
)
api.patch(
  '/historial-pagos/:id',
  requirePermission('pagos:write'),
  validateBody(updateHistorialPagoSchema),
  asyncHandler(historialPagoCtrl.updateHistorialPago),
)
api.delete(
  '/historial-pagos/:id',
  requirePermission('pagos:write'),
  asyncHandler(historialPagoCtrl.deleteHistorialPago),
)

// ----- Logs -----
api.get('/logs', requirePermission('historial:read'), asyncHandler(logCtrl.getLogs))
api.post(
  '/logs',
  requirePermission('historial:write'),
  validateBody(createLogSchema),
  asyncHandler(logCtrl.createLog),
)

// ----- Workshops -----
api.get('/workshops', requirePermission('workshops:read'), asyncHandler(workshopCtrl.getWorkshops))
api.get(
  '/workshops/:id',
  requirePermission('workshops:read'),
  asyncHandler(workshopCtrl.getWorkshopById),
)
api.post(
  '/workshops',
  requirePermission('workshops:write'),
  validateBody(createWorkshopSchema),
  asyncHandler(workshopCtrl.createWorkshop),
)
api.patch(
  '/workshops/:id',
  requirePermission('workshops:write'),
  validateBody(updateWorkshopSchema),
  asyncHandler(workshopCtrl.updateWorkshop),
)
api.delete(
  '/workshops/:id',
  requirePermission('workshops:write'),
  asyncHandler(workshopCtrl.deleteWorkshop),
)

// ----- Permissions -----
api.get(
  '/permissions/definitions',
  requirePermission('permissions:read'),
  asyncHandler(permissionCtrl.getPermissionDefinitions),
)
api.get(
  '/permissions/groups',
  requirePermission('permissions:read'),
  asyncHandler(permissionCtrl.getPermissionGroups),
)
api.post(
  '/permissions/groups',
  requirePermission('permissions:write'),
  validateBody(createPermissionGroupSchema),
  asyncHandler(permissionCtrl.createPermissionGroup),
)
api.patch(
  '/permissions/groups/:id',
  requirePermission('permissions:write'),
  validateBody(updatePermissionGroupSchema),
  asyncHandler(permissionCtrl.updatePermissionGroup),
)
api.delete(
  '/permissions/groups/:id',
  requirePermission('permissions:write'),
  asyncHandler(permissionCtrl.deletePermissionGroup),
)
api.get(
  '/permissions/users',
  requirePermission('users:access:read'),
  asyncHandler(permissionCtrl.getUsersAccess),
)
api.patch(
  '/permissions/users/:userId/access',
  requirePermission('users:access:write'),
  validateBody(updateUserAccessSchema),
  asyncHandler(permissionCtrl.updateUserAccess),
)

// ----- Auth -----
api.post('/auth/login', validateBody(loginSchema), asyncHandler(authCtrl.login))

export default api
