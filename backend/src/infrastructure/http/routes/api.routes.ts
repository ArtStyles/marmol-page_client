import { Router } from 'express'
import { asyncHandler } from '../middlewares/async-handler.middleware.js'
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
  createGastoSchema,
  updateGastoSchema,
  createProduccionSchema,
  updateProduccionSchema,
  createProduccionTrabajadorSchema,
  updateProduccionTrabajadorSchema,
  createHistorialPagoSchema,
  updateHistorialPagoSchema,
  createLogSchema,
  createWorkshopSchema,
  updateWorkshopSchema,
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
import * as gastoCtrl from '../controllers/gasto.controller.js'
import * as historialPagoCtrl from '../controllers/historial-pago.controller.js'
import * as logCtrl from '../controllers/log.controller.js'
import * as workshopCtrl from '../controllers/workshop.controller.js'
import * as authCtrl from '../controllers/auth.controller.js'

const api = Router()

// ----- Configuracion -----
api.get('/configuracion', asyncHandler(configuracionCtrl.getConfiguracion))
api.put(
  '/configuracion',
  validateBody(updateConfiguracionSchema),
  asyncHandler(configuracionCtrl.updateConfiguracion),
)

// ----- Bloques -----
api.get('/bloques', asyncHandler(bloqueCtrl.getBloques))
api.get('/bloques/:id', asyncHandler(bloqueCtrl.getBloqueById))
api.post('/bloques', validateBody(createBloqueSchema), asyncHandler(bloqueCtrl.createBloque))
api.patch('/bloques/:id', validateBody(updateBloqueSchema), asyncHandler(bloqueCtrl.updateBloque))
api.delete('/bloques/:id', asyncHandler(bloqueCtrl.deleteBloque))

// ----- Productos -----
api.get('/productos', asyncHandler(productoCtrl.getProductos))
api.get('/productos/:id', asyncHandler(productoCtrl.getProductoById))
api.post('/productos', validateBody(createProductoSchema), asyncHandler(productoCtrl.createProducto))
api.patch(
  '/productos/:id',
  validateBody(updateProductoSchema),
  asyncHandler(productoCtrl.updateProducto),
)
api.delete('/productos/:id', asyncHandler(productoCtrl.deleteProducto))

// ----- Catalogo -----
api.get('/catalogo', asyncHandler(catalogoCtrl.getCatalogoItems))
api.get('/catalogo/:id', asyncHandler(catalogoCtrl.getCatalogoItemById))
api.post('/catalogo', validateBody(createCatalogoItemSchema), asyncHandler(catalogoCtrl.createCatalogoItem))
api.patch(
  '/catalogo/:id',
  validateBody(updateCatalogoItemSchema),
  asyncHandler(catalogoCtrl.updateCatalogoItem),
)
api.delete('/catalogo/:id', asyncHandler(catalogoCtrl.deleteCatalogoItem))

// ----- Trabajadores -----
api.get('/trabajadores', asyncHandler(trabajadorCtrl.getTrabajadores))
api.get('/trabajadores/:id', asyncHandler(trabajadorCtrl.getTrabajadorById))
api.post(
  '/trabajadores',
  validateBody(createTrabajadorSchema),
  asyncHandler(trabajadorCtrl.createTrabajador),
)
api.patch(
  '/trabajadores/:id',
  validateBody(updateTrabajadorSchema),
  asyncHandler(trabajadorCtrl.updateTrabajador),
)
api.delete('/trabajadores/:id', asyncHandler(trabajadorCtrl.deleteTrabajador))

// ----- Equipos -----
api.get('/equipos', asyncHandler(equipoCtrl.getEquipos))
api.get('/equipos/:id', asyncHandler(equipoCtrl.getEquipoById))
api.post('/equipos', validateBody(createEquipoSchema), asyncHandler(equipoCtrl.createEquipo))
api.patch('/equipos/:id', validateBody(updateEquipoSchema), asyncHandler(equipoCtrl.updateEquipo))
api.delete('/equipos/:id', asyncHandler(equipoCtrl.deleteEquipo))

// ----- Produccion -----
api.get('/produccion', asyncHandler(produccionCtrl.getProduccion))
api.get('/produccion/:id', asyncHandler(produccionCtrl.getProduccionById))
api.post(
  '/produccion',
  validateBody(createProduccionSchema),
  asyncHandler(produccionCtrl.createProduccion),
)
api.patch(
  '/produccion/:id',
  validateBody(updateProduccionSchema),
  asyncHandler(produccionCtrl.updateProduccion),
)
api.delete('/produccion/:id', asyncHandler(produccionCtrl.deleteProduccion))

api.get('/produccion-trabajadores', asyncHandler(produccionCtrl.getProduccionTrabajadores))
api.get(
  '/produccion-trabajadores/:id',
  asyncHandler(produccionCtrl.getProduccionTrabajadorById),
)
api.post(
  '/produccion-trabajadores',
  validateBody(createProduccionTrabajadorSchema),
  asyncHandler(produccionCtrl.createProduccionTrabajador),
)
api.patch(
  '/produccion-trabajadores/:id',
  validateBody(updateProduccionTrabajadorSchema),
  asyncHandler(produccionCtrl.updateProduccionTrabajador),
)
api.delete('/produccion-trabajadores/:id', asyncHandler(produccionCtrl.deleteProduccionTrabajador))

// ----- Mermas -----
api.get('/mermas', asyncHandler(mermaCtrl.getMermas))
api.get('/mermas/:id', asyncHandler(mermaCtrl.getMermaById))
api.post('/mermas', validateBody(createMermaSchema), asyncHandler(mermaCtrl.createMerma))
api.patch('/mermas/:id', validateBody(updateMermaSchema), asyncHandler(mermaCtrl.updateMerma))
api.delete('/mermas/:id', asyncHandler(mermaCtrl.deleteMerma))

// ----- Ventas -----
api.get('/ventas', asyncHandler(ventaCtrl.getVentas))
api.get('/ventas/:id', asyncHandler(ventaCtrl.getVentaById))
api.post('/ventas', validateBody(createVentaSchema), asyncHandler(ventaCtrl.createVenta))
api.patch('/ventas/:id', validateBody(updateVentaSchema), asyncHandler(ventaCtrl.updateVenta))
api.delete('/ventas/:id', asyncHandler(ventaCtrl.deleteVenta))

// ----- Gastos -----
api.get('/gastos', asyncHandler(gastoCtrl.getGastos))
api.get('/gastos/:id', asyncHandler(gastoCtrl.getGastoById))
api.post('/gastos', validateBody(createGastoSchema), asyncHandler(gastoCtrl.createGasto))
api.patch('/gastos/:id', validateBody(updateGastoSchema), asyncHandler(gastoCtrl.updateGasto))
api.delete('/gastos/:id', asyncHandler(gastoCtrl.deleteGasto))

// ----- Historial Pagos -----
api.get('/historial-pagos', asyncHandler(historialPagoCtrl.getHistorialPagos))
api.get('/historial-pagos/:id', asyncHandler(historialPagoCtrl.getHistorialPagoById))
api.post(
  '/historial-pagos',
  validateBody(createHistorialPagoSchema),
  asyncHandler(historialPagoCtrl.createHistorialPago),
)
api.patch(
  '/historial-pagos/:id',
  validateBody(updateHistorialPagoSchema),
  asyncHandler(historialPagoCtrl.updateHistorialPago),
)
api.delete('/historial-pagos/:id', asyncHandler(historialPagoCtrl.deleteHistorialPago))

// ----- Logs -----
api.get('/logs', asyncHandler(logCtrl.getLogs))
api.post('/logs', validateBody(createLogSchema), asyncHandler(logCtrl.createLog))

// ----- Workshops -----
api.get('/workshops', asyncHandler(workshopCtrl.getWorkshops))
api.get('/workshops/:id', asyncHandler(workshopCtrl.getWorkshopById))
api.post('/workshops', validateBody(createWorkshopSchema), asyncHandler(workshopCtrl.createWorkshop))
api.patch(
  '/workshops/:id',
  validateBody(updateWorkshopSchema),
  asyncHandler(workshopCtrl.updateWorkshop),
)
api.delete('/workshops/:id', asyncHandler(workshopCtrl.deleteWorkshop))

// ----- Auth -----
api.post('/auth/login', validateBody(loginSchema), asyncHandler(authCtrl.login))

export default api
