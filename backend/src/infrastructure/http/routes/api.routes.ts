import { Router } from 'express'
import { validateBody } from '../middlewares/validate.middleware.js'
import {
  createBloqueSchema,
  updateBloqueSchema,
  createProductoSchema,
  updateProductoSchema,
  createTrabajadorSchema,
  updateTrabajadorSchema,
  createEquipoSchema,
  updateEquipoSchema,
  createMermaSchema,
  updateMermaSchema,
  createVentaSchema,
  updateVentaSchema,
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
import * as trabajadorCtrl from '../controllers/trabajador.controller.js'
import * as equipoCtrl from '../controllers/equipo.controller.js'
import * as produccionCtrl from '../controllers/produccion.controller.js'
import * as mermaCtrl from '../controllers/merma.controller.js'
import * as ventaCtrl from '../controllers/venta.controller.js'
import * as historialPagoCtrl from '../controllers/historial-pago.controller.js'
import * as logCtrl from '../controllers/log.controller.js'
import * as workshopCtrl from '../controllers/workshop.controller.js'
import * as authCtrl from '../controllers/auth.controller.js'

const api = Router()

// ----- Configuracion -----
api.get('/configuracion', configuracionCtrl.getConfiguracion)
api.put('/configuracion', validateBody(updateConfiguracionSchema), configuracionCtrl.updateConfiguracion)

// ----- Bloques -----
api.get('/bloques', bloqueCtrl.getBloques)
api.get('/bloques/:id', bloqueCtrl.getBloqueById)
api.post('/bloques', validateBody(createBloqueSchema), bloqueCtrl.createBloque)
api.patch('/bloques/:id', validateBody(updateBloqueSchema), bloqueCtrl.updateBloque)
api.delete('/bloques/:id', bloqueCtrl.deleteBloque)

// ----- Productos -----
api.get('/productos', productoCtrl.getProductos)
api.get('/productos/:id', productoCtrl.getProductoById)
api.post('/productos', validateBody(createProductoSchema), productoCtrl.createProducto)
api.patch('/productos/:id', validateBody(updateProductoSchema), productoCtrl.updateProducto)
api.delete('/productos/:id', productoCtrl.deleteProducto)

// ----- Trabajadores -----
api.get('/trabajadores', trabajadorCtrl.getTrabajadores)
api.get('/trabajadores/:id', trabajadorCtrl.getTrabajadorById)
api.post('/trabajadores', validateBody(createTrabajadorSchema), trabajadorCtrl.createTrabajador)
api.patch('/trabajadores/:id', validateBody(updateTrabajadorSchema), trabajadorCtrl.updateTrabajador)
api.delete('/trabajadores/:id', trabajadorCtrl.deleteTrabajador)

// ----- Equipos -----
api.get('/equipos', equipoCtrl.getEquipos)
api.get('/equipos/:id', equipoCtrl.getEquipoById)
api.post('/equipos', validateBody(createEquipoSchema), equipoCtrl.createEquipo)
api.patch('/equipos/:id', validateBody(updateEquipoSchema), equipoCtrl.updateEquipo)
api.delete('/equipos/:id', equipoCtrl.deleteEquipo)

// ----- Produccion -----
api.get('/produccion', produccionCtrl.getProduccion)
api.get('/produccion/:id', produccionCtrl.getProduccionById)
api.post('/produccion', validateBody(createProduccionSchema), produccionCtrl.createProduccion)
api.patch('/produccion/:id', validateBody(updateProduccionSchema), produccionCtrl.updateProduccion)
api.delete('/produccion/:id', produccionCtrl.deleteProduccion)

api.get('/produccion-trabajadores', produccionCtrl.getProduccionTrabajadores)
api.get('/produccion-trabajadores/:id', produccionCtrl.getProduccionTrabajadorById)
api.post(
  '/produccion-trabajadores',
  validateBody(createProduccionTrabajadorSchema),
  produccionCtrl.createProduccionTrabajador,
)
api.patch(
  '/produccion-trabajadores/:id',
  validateBody(updateProduccionTrabajadorSchema),
  produccionCtrl.updateProduccionTrabajador,
)
api.delete('/produccion-trabajadores/:id', produccionCtrl.deleteProduccionTrabajador)

// ----- Mermas -----
api.get('/mermas', mermaCtrl.getMermas)
api.get('/mermas/:id', mermaCtrl.getMermaById)
api.post('/mermas', validateBody(createMermaSchema), mermaCtrl.createMerma)
api.patch('/mermas/:id', validateBody(updateMermaSchema), mermaCtrl.updateMerma)
api.delete('/mermas/:id', mermaCtrl.deleteMerma)

// ----- Ventas -----
api.get('/ventas', ventaCtrl.getVentas)
api.get('/ventas/:id', ventaCtrl.getVentaById)
api.post('/ventas', validateBody(createVentaSchema), ventaCtrl.createVenta)
api.patch('/ventas/:id', validateBody(updateVentaSchema), ventaCtrl.updateVenta)
api.delete('/ventas/:id', ventaCtrl.deleteVenta)

// ----- Historial Pagos -----
api.get('/historial-pagos', historialPagoCtrl.getHistorialPagos)
api.get('/historial-pagos/:id', historialPagoCtrl.getHistorialPagoById)
api.post('/historial-pagos', validateBody(createHistorialPagoSchema), historialPagoCtrl.createHistorialPago)
api.patch(
  '/historial-pagos/:id',
  validateBody(updateHistorialPagoSchema),
  historialPagoCtrl.updateHistorialPago,
)
api.delete('/historial-pagos/:id', historialPagoCtrl.deleteHistorialPago)

// ----- Logs -----
api.get('/logs', logCtrl.getLogs)
api.post('/logs', validateBody(createLogSchema), logCtrl.createLog)

// ----- Workshops -----
api.get('/workshops', workshopCtrl.getWorkshops)
api.get('/workshops/:id', workshopCtrl.getWorkshopById)
api.post('/workshops', validateBody(createWorkshopSchema), workshopCtrl.createWorkshop)
api.patch('/workshops/:id', validateBody(updateWorkshopSchema), workshopCtrl.updateWorkshop)
api.delete('/workshops/:id', workshopCtrl.deleteWorkshop)

// ----- Auth -----
api.post('/auth/login', validateBody(loginSchema), authCtrl.login)

export default api
