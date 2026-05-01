import assert from 'node:assert/strict'
import {
  CreateBloqueUseCase,
} from '../application/use-cases/bloques/bloque.use-cases.js'
import {
  CreateSalidaProcesoInventarioUseCase,
  CreateRetornoProcesoInventarioUseCase,
  ApproveInventarioMovimientoUseCase,
} from '../application/use-cases/inventario-movimientos/inventario-movimiento.use-cases.js'
import {
  CreateProduccionUseCase,
  ApproveProduccionTallerUseCase,
  ApproveEntradaProduccionAlmacenUseCase,
} from '../application/use-cases/produccion/produccion.use-cases.js'
import { CreateVentaUseCase } from '../application/use-cases/ventas/venta.use-cases.js'
import { CreateHistorialPagoUseCase } from '../application/use-cases/historial-pagos/historial-pago.use-cases.js'
import {
  InMemoryBloqueRepository,
  InMemoryConfiguracionAdapter,
  InMemoryEquipoRepository,
  InMemoryGastoRepository,
  InMemoryHistorialPagoRepository,
  InMemoryInventarioMovimientoRepository,
  InMemoryMermaRepository,
  InMemoryMonoHiloMasaRepository,
  InMemoryProduccionRepository,
  InMemoryProduccionTrabajadorRepository,
  InMemoryProductoRepository,
  InMemoryTrabajadorRepository,
  InMemoryVentaRepository,
} from '../infrastructure/persistence/in-memory/index.js'
import { runWithTenantContext } from '../infrastructure/tenant/tenant-context.js'

const actorAdmin = { userId: 'ADM-SMOKE', userName: 'Smoke Admin' }
const actorWarehouse = { userId: 'ALM-SMOKE', userName: 'Smoke Almacen' }
const actorFinance = { userId: 'FIN-SMOKE', userName: 'Smoke Finanzas' }

function createDimensionTotals() {
  return {
    '40x40': 0,
    '60x40': 0,
    '80x40': 0,
    '160x60': 0,
    '160x65': 0,
  }
}

function round2(value: number): number {
  return Number(value.toFixed(2))
}

async function main(): Promise<void> {
  const workshopId = `SMOKE-${Date.now()}`

  await runWithTenantContext({ workshopId, userId: actorAdmin.userId }, async () => {
    const configuracionPort = new InMemoryConfiguracionAdapter()
    const bloqueRepo = new InMemoryBloqueRepository()
    const productoRepo = new InMemoryProductoRepository()
    const inventarioMovimientoRepo = new InMemoryInventarioMovimientoRepository()
    const gastoRepo = new InMemoryGastoRepository()
    const equipoRepo = new InMemoryEquipoRepository()
    const produccionRepo = new InMemoryProduccionRepository()
    const produccionTrabajadorRepo = new InMemoryProduccionTrabajadorRepository()
    const trabajadorRepo = new InMemoryTrabajadorRepository()
    const ventaRepo = new InMemoryVentaRepository()
    const historialPagoRepo = new InMemoryHistorialPagoRepository()
    const mermaRepo = new InMemoryMermaRepository()
    const monoHiloMasaRepo = new InMemoryMonoHiloMasaRepository()

    const createBloqueUseCase = new CreateBloqueUseCase(
      bloqueRepo,
      productoRepo,
      inventarioMovimientoRepo,
      gastoRepo,
    )
    const createSalidaProcesoUseCase = new CreateSalidaProcesoInventarioUseCase(
      inventarioMovimientoRepo,
      productoRepo,
    )
    const createRetornoProcesoUseCase = new CreateRetornoProcesoInventarioUseCase(
      inventarioMovimientoRepo,
      productoRepo,
    )
    const approveInventarioMovimientoUseCase = new ApproveInventarioMovimientoUseCase(
      inventarioMovimientoRepo,
      productoRepo,
      bloqueRepo,
      ventaRepo,
      mermaRepo,
      produccionRepo,
    )
    const createProduccionUseCase = new CreateProduccionUseCase(
      produccionRepo,
      productoRepo,
      monoHiloMasaRepo,
      produccionTrabajadorRepo,
      trabajadorRepo,
      configuracionPort,
    )
    const approveProduccionTallerUseCase = new ApproveProduccionTallerUseCase(produccionRepo)
    const approveEntradaProduccionAlmacenUseCase = new ApproveEntradaProduccionAlmacenUseCase(
      produccionRepo,
      bloqueRepo,
      productoRepo,
      inventarioMovimientoRepo,
    )
    const createVentaUseCase = new CreateVentaUseCase(
      ventaRepo,
      productoRepo,
      inventarioMovimientoRepo,
    )
    const createHistorialPagoUseCase = new CreateHistorialPagoUseCase(
      historialPagoRepo,
      produccionTrabajadorRepo,
      trabajadorRepo,
      configuracionPort,
    )

    console.log('1. Crear lote de planchas y validar stock inicial')
    const lote = await createBloqueUseCase.execute(
      {
        tipo: 'Lote',
        dimensionBase: '160x60',
        costo: 9600,
        costoTransporte: 960,
        metrosComprados: 10,
        fechaIngreso: '2026-04-30',
        proveedor: 'Proveedor Smoke Test',
        losasProducidas: 0,
        losasPerdidas: 0,
        metrosVendibles: 0,
        gananciaReal: 0,
        estado: 'activo',
      },
      actorAdmin,
    )

    const productosIniciales = await productoRepo.findAll()
    const lotePicado = productosIniciales.find(
      (producto) =>
        producto.origenId === lote.id &&
        producto.dimension === '160x60' &&
        producto.estado === 'Picado' &&
        producto.ubicacion === 'almacen',
    )
    assert.ok(lotePicado, 'El lote debe crear stock inicial en almacen.')
    assert.equal(lotePicado.tipo, 'Plancha')
    assert.equal(lotePicado.cantidadLosas, 10)
    assert.equal(lotePicado.metrosCuadrados, 9.6)
    assert.equal(lotePicado.precioM2, 1100)

    const gastosLote = await gastoRepo.findAll()
    assert.ok(
      gastosLote.some((gasto) => gasto.descripcion.includes(lote.nombre) && gasto.tipo === 'Materia prima'),
      'El lote debe registrar gasto de materia prima.',
    )
    assert.ok(
      gastosLote.some((gasto) => gasto.descripcion.includes(lote.nombre) && gasto.tipo === 'Transporte'),
      'El lote debe registrar gasto de transporte.',
    )

    console.log('2. Mover a proceso y retornar a almacen con cambio de estado')
    await createSalidaProcesoUseCase.execute(
      {
        accionObjetivo: 'escuadrar',
        productoId: lotePicado.id,
        cantidadLosas: 4,
        motivo: 'Salida a proceso para escuadrado',
      },
      actorWarehouse,
    )

    const despuesSalida = await productoRepo.findAll()
    const picadoAlmacenDespuesSalida = despuesSalida.find((producto) => producto.id === lotePicado.id)
    const picadoProceso = despuesSalida.find(
      (producto) =>
        producto.origenId === lote.id &&
        producto.dimension === '160x60' &&
        producto.estado === 'Picado' &&
        producto.ubicacion === 'proceso',
    )
    assert.equal(picadoAlmacenDespuesSalida?.cantidadLosas, 6)
    assert.ok(picadoProceso, 'La salida debe crear stock en proceso.')
    assert.equal(picadoProceso.cantidadLosas, 4)
    assert.equal(picadoProceso.precioM2, 1100)

    const retornoPendiente = await createRetornoProcesoUseCase.execute(
      {
        productoId: picadoProceso.id,
        cantidadLosas: 4,
        motivo: 'Retorno de proceso smoke test',
        estadoObjetivo: 'Escuadrado',
      },
      actorWarehouse,
    )
    assert.equal(retornoPendiente.estado, 'pendiente')

    const retornoAprobado = await approveInventarioMovimientoUseCase.execute(
      retornoPendiente.id,
      { observaciones: 'Retorno aprobado por smoke test' },
      actorWarehouse,
    )
    assert.equal(retornoAprobado.estado, 'aprobado')

    const despuesRetorno = await productoRepo.findAll()
    const escuadradoAlmacen = despuesRetorno.find(
      (producto) =>
        producto.origenId === lote.id &&
        producto.dimension === '160x60' &&
        producto.estado === 'Escuadrado' &&
        producto.ubicacion === 'almacen',
    )
    const picadoProcesoDespuesRetorno = despuesRetorno.find((producto) => producto.id === picadoProceso.id)
    assert.ok(escuadradoAlmacen, 'El retorno debe generar stock escuadrado en almacen.')
    assert.equal(escuadradoAlmacen.cantidadLosas, 4)
    assert.equal(escuadradoAlmacen.precioM2, 1100)
    assert.equal(picadoProcesoDespuesRetorno?.cantidadLosas, 0)

    console.log('3. Crear produccion regular y aprobar taller/almacen')
    await createSalidaProcesoUseCase.execute(
      {
        accionObjetivo: 'escuadrar',
        productoId: lotePicado.id,
        cantidadLosas: 3,
        motivo: 'Salida a proceso para produccion diaria',
      },
      actorWarehouse,
    )

    const productosPrevioProduccion = await productoRepo.findAll()
    const picadoProcesoProduccion = productosPrevioProduccion.find(
      (producto) =>
        producto.origenId === lote.id &&
        producto.dimension === '160x60' &&
        producto.estado === 'Picado' &&
        producto.ubicacion === 'proceso' &&
        producto.cantidadLosas === 3,
    )
    assert.ok(picadoProcesoProduccion, 'Debe existir stock en proceso para la produccion.')

    const equipoEscuadrado = await equipoRepo.findById('EQ005')
    assert.ok(equipoEscuadrado, 'Debe existir equipo de escuadrado en el seed.')

    const produccion = await createProduccionUseCase.execute(
      {
        fecha: '2026-04-30',
        origenId: lote.id,
        origenNombre: lote.nombre,
        tipo: 'Plancha',
        dimension: '160x60',
        cantidadPicar: 999,
        cantidadEscuadrar: 0,
        cantidadDevastar: 0,
        cantidadResinar: 0,
        cantidadPulir: 0,
        totalLosas: 999,
        totalM2: 999,
        detallesAcciones: [
          {
            id: 'SMOKE-PROD-1',
            accion: 'escuadrar',
            trabajadorId: 'T002',
            trabajadorNombre: 'Roberto Sánchez',
            trabajadores: [{ id: 'T002', nombre: 'Roberto Sánchez' }],
            equipoId: equipoEscuadrado.id,
            equipoNombre: equipoEscuadrado.codigoInterno,
            cantidadLosas: 3,
            metrosCuadrados: 0,
            losasMermaTotal: 0,
            metrosMermaTotal: 999,
            losasReutilizables: 0,
            metrosReutilizables: 999,
          },
        ],
      },
      actorAdmin,
    )

    assert.equal(produccion.cantidadEscuadrar, 3)
    assert.equal(produccion.totalLosas, 3)
    assert.equal(produccion.totalM2, 2.88)
    assert.equal(produccion.detallesAcciones?.[0]?.metrosCuadrados, 2.88)
    assert.equal(produccion.detallesAcciones?.[0]?.metrosMermaTotal, 0)
    assert.equal(produccion.detallesAcciones?.[0]?.metrosReutilizables, 0)

    const productosPostProduccion = await productoRepo.findAll()
    const procesoConsumido = productosPostProduccion.find((producto) => producto.id === picadoProcesoProduccion.id)
    assert.equal(procesoConsumido?.cantidadLosas, 0)

    const produccionAprobadaTaller = await approveProduccionTallerUseCase.execute(
      produccion.id,
      { aprobado: true },
      actorAdmin,
    )
    assert.equal(produccionAprobadaTaller.aprobacionTallerEstado, 'aprobado')

    const produccionAprobadaAlmacen = await approveEntradaProduccionAlmacenUseCase.execute(
      produccion.id,
      { motivo: 'Entrada aprobada por smoke test' },
      actorWarehouse,
    )
    assert.equal(produccionAprobadaAlmacen.aprobacionAlmacenEstado, 'aprobado')
    assert.equal(produccionAprobadaAlmacen.inventarioAplicado, true)

    const bloqueActualizado = await bloqueRepo.findById(lote.id)
    assert.ok(bloqueActualizado)
    assert.equal(bloqueActualizado.losasProducidas, 3)
    assert.equal(bloqueActualizado.metrosVendibles, 2.88)

    const productosDespuesAprobacion = await productoRepo.findAll()
    const escuadradoFinal = productosDespuesAprobacion.find(
      (producto) =>
        producto.origenId === lote.id &&
        producto.dimension === '160x60' &&
        producto.estado === 'Escuadrado' &&
        producto.ubicacion === 'almacen',
    )
    assert.ok(escuadradoFinal)
    assert.equal(escuadradoFinal.cantidadLosas, 7)
    assert.equal(escuadradoFinal.precioM2, 1100)

    console.log('4. Registrar venta y aprobar salida de almacen')
    const venta = await createVentaUseCase.execute(
      {
        productoId: escuadradoFinal.id,
        productoNombre: escuadradoFinal.nombre,
        cantidadM2: 1.92,
        metrosPorDimension: createDimensionTotals(),
        precioM2: 1250,
        descuento: 0,
        fondoOperativo: 0,
        subtotal: 0,
        total: 0,
        clienteNombre: 'Cliente Smoke',
        clienteEmail: 'cliente-smoke@test.local',
        clienteTelefono: '+53 555 000 000',
        fecha: '2026-04-30',
        estado: 'pendiente',
        motivoMovimientoAlmacen: 'Salida por venta validada en smoke test',
      },
      actorAdmin,
    )

    assert.equal(venta.estado, 'pendiente_aprobacion_almacen')
    assert.ok(venta.movimientoInventarioId)

    const ventaAprobada = await approveInventarioMovimientoUseCase.execute(
      venta.movimientoInventarioId!,
      { observaciones: 'Salida de venta aprobada por smoke test' },
      actorWarehouse,
    )
    assert.equal(ventaAprobada.estado, 'aprobado')

    const ventaFinal = await ventaRepo.findById(venta.id)
    assert.equal(ventaFinal?.estado, 'completada')

    const productosDespuesVenta = await productoRepo.findAll()
    const stockDespuesVenta = productosDespuesVenta.find((producto) => producto.id === escuadradoFinal.id)
    assert.ok(stockDespuesVenta)
    assert.equal(stockDespuesVenta.cantidadLosas, 5)
    assert.equal(stockDespuesVenta.metrosCuadrados, 4.8)

    const bloquePostVenta = await bloqueRepo.findById(lote.id)
    assert.ok(bloquePostVenta)
    assert.equal(bloquePostVenta.gananciaReal, 2400)

    console.log('5. Pagar produccion generada')
    const produccionesTrabajador = (await produccionTrabajadorRepo.findAll()).filter(
      (item) => item.produccionId === produccion.id,
    )
    assert.equal(produccionesTrabajador.length, 1)

    const detallePago = produccionesTrabajador[0]
    const historialPago = await createHistorialPagoUseCase.execute(
      {
        trabajadorId: detallePago.trabajadorId,
        trabajadorNombre: detallePago.trabajadorNombre,
        fecha: '2026-04-30',
        produccionIds: [detallePago.id],
        montoAcciones: detallePago.pagoTotal,
        montoBonos: detallePago.bono,
        bonoExtra: 0,
        motivoBonoExtra: '',
        totalPagado: detallePago.pagoFinal,
        observaciones: 'Pago validado por smoke test',
      },
      actorFinance,
    )

    assert.ok(historialPago.id)
    const detallePagoActualizado = await produccionTrabajadorRepo.findById(detallePago.id)
    assert.equal(detallePagoActualizado?.pagado, true)

    console.log('Smoke test completado con exito')
    console.log(
      JSON.stringify(
        {
          workshopId,
          loteId: lote.id,
          produccionId: produccion.id,
          ventaId: venta.id,
          historialPagoId: historialPago.id,
          stockEscuadradoFinalLosas: stockDespuesVenta.cantidadLosas,
          stockEscuadradoFinalM2: round2(stockDespuesVenta.metrosCuadrados),
        },
        null,
        2,
      ),
    )
  })
}

void main().catch((error) => {
  console.error('Flow smoke test failed')
  console.error(error)
  process.exitCode = 1
})
