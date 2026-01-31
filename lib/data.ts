import type { 
  BloqueOLote, 
  Producto, 
  ProduccionDiaria, 
  Merma, 
  Venta, 
  Trabajador, 
  HistorialPago,
  ConfiguracionSistema
} from './types'
import { TARIFAS_ACCION_DEFAULT, PRECIOS_M2_DEFAULT } from './types'

// ==========================================
// CONFIGURACIÓN DEL SISTEMA
// ==========================================

export const configuracionInicial: ConfiguracionSistema = {
  tarifasGlobales: { ...TARIFAS_ACCION_DEFAULT },
  preciosM2: { ...PRECIOS_M2_DEFAULT },
  nombreEmpresa: 'Mármoles Elegance',
  email: 'info@marmoleselegance.com',
  telefono: '+52 555 123 4567',
  direccion: 'Av. Principal 123, Col. Centro, CDMX',
  notificacionesEmail: true,
  alertasStockBajo: true,
  reportesVentas: false
}

// ==========================================
// DATOS DE EJEMPLO DEL TALLER DE MÁRMOL
// ==========================================

export const bloquesYLotes: BloqueOLote[] = [
  {
    id: 'BL001',
    nombre: 'Bloque Carrara #1',
    tipo: 'Bloque',
    costo: 15000,
    fechaIngreso: '2026-01-10',
    proveedor: 'Mármoles Italia S.A.',
    losasProducidas: 120,
    losasPerdidas: 8,
    metrosVendibles: 28.8,
    gananciaReal: 12500,
    estado: 'activo'
  },
  {
    id: 'BL002',
    nombre: 'Bloque Emperador #3',
    tipo: 'Bloque',
    costo: 12000,
    fechaIngreso: '2026-01-05',
    proveedor: 'Canteras España',
    losasProducidas: 95,
    losasPerdidas: 12,
    metrosVendibles: 22.8,
    gananciaReal: 8500,
    estado: 'activo'
  },
  {
    id: 'LT001',
    nombre: 'Lote Crema Marfil #15',
    tipo: 'Lote',
    costo: 8500,
    fechaIngreso: '2026-01-15',
    proveedor: 'Distribuidora Nacional',
    losasProducidas: 200,
    losasPerdidas: 5,
    metrosVendibles: 48.0,
    gananciaReal: 15200,
    estado: 'activo'
  },
  {
    id: 'BL003',
    nombre: 'Bloque Calacatta Gold #2',
    tipo: 'Bloque',
    costo: 25000,
    fechaIngreso: '2025-12-20',
    proveedor: 'Mármoles Italia S.A.',
    losasProducidas: 85,
    losasPerdidas: 3,
    metrosVendibles: 20.4,
    gananciaReal: 28000,
    estado: 'agotado'
  }
]

export const productos: Producto[] = [
  {
    id: 'P001',
    nombre: 'Piso Carrara 60x40 Pulido',
    tipo: 'Piso',
    estado: 'Pulido',
    dimension: '60x40',
    origenId: 'BL001',
    origenNombre: 'Bloque Carrara #1',
    cantidadLosas: 45,
    metrosCuadrados: 10.8,
    precioM2: 200,
    imagen: '/marble-carrara.jpg'
  },
  {
    id: 'P002',
    nombre: 'Plancha Carrara 80x40 Crudo',
    tipo: 'Plancha',
    estado: 'Crudo',
    dimension: '80x40',
    origenId: 'BL001',
    origenNombre: 'Bloque Carrara #1',
    cantidadLosas: 30,
    metrosCuadrados: 9.6,
    precioM2: 160,
    imagen: '/marble-carrara.jpg'
  },
  {
    id: 'P003',
    nombre: 'Piso Emperador 40x40 Pulido',
    tipo: 'Piso',
    estado: 'Pulido',
    dimension: '40x40',
    origenId: 'BL002',
    origenNombre: 'Bloque Emperador #3',
    cantidadLosas: 60,
    metrosCuadrados: 9.6,
    precioM2: 180,
    imagen: '/marble-emperador.jpg'
  },
  {
    id: 'P004',
    nombre: 'Piso Crema Marfil 60x40 Pulido',
    tipo: 'Piso',
    estado: 'Pulido',
    dimension: '60x40',
    origenId: 'LT001',
    origenNombre: 'Lote Crema Marfil #15',
    cantidadLosas: 80,
    metrosCuadrados: 19.2,
    precioM2: 200,
    imagen: '/marble-crema.jpg'
  },
  {
    id: 'P005',
    nombre: 'Plancha Calacatta 80x40 Pulido',
    tipo: 'Plancha',
    estado: 'Pulido',
    dimension: '80x40',
    origenId: 'BL003',
    origenNombre: 'Bloque Calacatta Gold #2',
    cantidadLosas: 20,
    metrosCuadrados: 6.4,
    precioM2: 320,
    imagen: '/marble-calacatta.jpg'
  },
  {
    id: 'P006',
    nombre: 'Piso Emperador 60x40 Crudo',
    tipo: 'Piso',
    estado: 'Crudo',
    dimension: '60x40',
    origenId: 'BL002',
    origenNombre: 'Bloque Emperador #3',
    cantidadLosas: 35,
    metrosCuadrados: 8.4,
    precioM2: 140,
    imagen: '/marble-emperador.jpg'
  }
]

export const trabajadores: Trabajador[] = [
  {
    id: 'T001',
    nombre: 'Carlos Mendoza',
    email: 'carlos.mendoza@taller.com',
    telefono: '+52 555 123 4567',
    rol: 'Operario',
    especialidad: ['picar', 'escuadrar'],
    fechaIngreso: '2024-03-15',
    estado: 'activo',
    tarifasPersonalizadas: null, // Usa tarifas globales
    losasProducidas: 450,
    pagosTotales: 180000,
    bonosTotales: 5000,
    acumuladoPendiente: 9500
  },
  {
    id: 'T002',
    nombre: 'Roberto Sánchez',
    email: 'roberto.sanchez@taller.com',
    telefono: '+52 555 234 5678',
    rol: 'Operario',
    especialidad: ['pulir'],
    fechaIngreso: '2023-08-01',
    estado: 'activo',
    tarifasPersonalizadas: { picar: 400, pulir: 280, escuadrar: 100 }, // Tarifa especial para pulir
    losasProducidas: 620,
    pagosTotales: 155000,
    bonosTotales: 8000,
    acumuladoPendiente: 5600
  },
  {
    id: 'T003',
    nombre: 'Miguel Ángel Torres',
    email: 'miguel.torres@taller.com',
    telefono: '+52 555 345 6789',
    rol: 'Operario',
    especialidad: ['picar', 'pulir', 'escuadrar'],
    fechaIngreso: '2022-01-10',
    estado: 'activo',
    tarifasPersonalizadas: { picar: 420, pulir: 270, escuadrar: 120 }, // Senior, mejores tarifas
    losasProducidas: 890,
    pagosTotales: 310000,
    bonosTotales: 15000,
    acumuladoPendiente: 7600
  },
  {
    id: 'T004',
    nombre: 'Fernando Ruiz',
    email: 'fernando.ruiz@taller.com',
    telefono: '+52 555 456 7890',
    rol: 'Supervisor',
    especialidad: ['picar', 'pulir', 'escuadrar'],
    fechaIngreso: '2021-06-20',
    estado: 'activo',
    tarifasPersonalizadas: { picar: 450, pulir: 300, escuadrar: 130 }, // Supervisor, mejores tarifas
    losasProducidas: 1200,
    pagosTotales: 420000,
    bonosTotales: 25000,
    acumuladoPendiente: 9750
  },
  {
    id: 'T005',
    nombre: 'José García',
    email: 'jose.garcia@taller.com',
    telefono: '+52 555 567 8901',
    rol: 'Operario',
    especialidad: ['escuadrar'],
    fechaIngreso: '2025-02-01',
    estado: 'inactivo',
    tarifasPersonalizadas: null,
    losasProducidas: 150,
    pagosTotales: 15000,
    bonosTotales: 0,
    acumuladoPendiente: 0
  }
]

export const produccionDiaria: ProduccionDiaria[] = [
  {
    id: 'PD001',
    fecha: '2026-01-28',
    trabajadorId: 'T001',
    trabajadorNombre: 'Carlos Mendoza',
    accion: 'picar',
    origenId: 'BL001',
    origenNombre: 'Bloque Carrara #1',
    tipo: 'Piso',
    dimension: '60x40',
    cantidadLosas: 15,
    pagoPorLosa: 400,
    pagoTotal: 6000,
    bono: 500,
    pagoFinal: 6500,
    pagado: false
  },
  {
    id: 'PD002',
    fecha: '2026-01-28',
    trabajadorId: 'T002',
    trabajadorNombre: 'Roberto Sánchez',
    accion: 'pulir',
    origenId: 'BL001',
    origenNombre: 'Bloque Carrara #1',
    tipo: 'Piso',
    dimension: '60x40',
    cantidadLosas: 20,
    pagoPorLosa: 280, // Tarifa personalizada
    pagoTotal: 5600,
    bono: 0,
    pagoFinal: 5600,
    pagado: false
  },
  {
    id: 'PD003',
    fecha: '2026-01-28',
    trabajadorId: 'T003',
    trabajadorNombre: 'Miguel Ángel Torres',
    accion: 'escuadrar',
    origenId: 'BL002',
    origenNombre: 'Bloque Emperador #3',
    tipo: 'Piso',
    dimension: '40x40',
    cantidadLosas: 25,
    pagoPorLosa: 120,
    pagoTotal: 3000,
    bono: 300,
    pagoFinal: 3300,
    pagado: false
  },
  {
    id: 'PD004',
    fecha: '2026-01-27',
    trabajadorId: 'T001',
    trabajadorNombre: 'Carlos Mendoza',
    accion: 'escuadrar',
    origenId: 'LT001',
    origenNombre: 'Lote Crema Marfil #15',
    tipo: 'Piso',
    dimension: '60x40',
    cantidadLosas: 30,
    pagoPorLosa: 100,
    pagoTotal: 3000,
    bono: 0,
    pagoFinal: 3000,
    pagado: false
  },
  {
    id: 'PD005',
    fecha: '2026-01-27',
    trabajadorId: 'T004',
    trabajadorNombre: 'Fernando Ruiz',
    accion: 'pulir',
    origenId: 'LT001',
    origenNombre: 'Lote Crema Marfil #15',
    tipo: 'Piso',
    dimension: '60x40',
    cantidadLosas: 35,
    pagoPorLosa: 300,
    pagoTotal: 10500,
    bono: 1000,
    pagoFinal: 11500,
    pagado: true // Ya fue pagado
  },
  {
    id: 'PD006',
    fecha: '2026-01-26',
    trabajadorId: 'T003',
    trabajadorNombre: 'Miguel Ángel Torres',
    accion: 'picar',
    origenId: 'BL002',
    origenNombre: 'Bloque Emperador #3',
    tipo: 'Plancha',
    dimension: '80x40',
    cantidadLosas: 12,
    pagoPorLosa: 420,
    pagoTotal: 5040,
    bono: 0,
    pagoFinal: 5040,
    pagado: true
  }
]

// Mermas ahora en METROS CUADRADOS directamente
export const mermas: Merma[] = [
  {
    id: 'M001',
    fecha: '2026-01-28',
    origenId: 'BL001',
    origenNombre: 'Bloque Carrara #1',
    tipo: 'Piso',
    dimension: '60x40',
    metrosCuadrados: 0.45, // Parte de una losa que se perdió
    motivo: 'Partida al picar',
    observaciones: 'Vetas internas causaron fractura parcial, se recuperó parte para losa 40x40'
  },
  {
    id: 'M002',
    fecha: '2026-01-27',
    origenId: 'BL002',
    origenNombre: 'Bloque Emperador #3',
    tipo: 'Piso',
    dimension: '40x40',
    metrosCuadrados: 0.32,
    motivo: 'Partida al pulir',
    observaciones: 'Presión excesiva en el proceso, pérdida total de 2 losas'
  },
  {
    id: 'M003',
    fecha: '2026-01-25',
    origenId: 'LT001',
    origenNombre: 'Lote Crema Marfil #15',
    tipo: 'Piso',
    dimension: '60x40',
    metrosCuadrados: 0.12,
    motivo: 'Recorte aprovechable',
    observaciones: 'Recorte de bordes para escuadrar, material muy pequeño para reutilizar'
  },
  {
    id: 'M004',
    fecha: '2026-01-24',
    origenId: 'BL003',
    origenNombre: 'Bloque Calacatta Gold #2',
    tipo: 'Plancha',
    dimension: '80x40',
    metrosCuadrados: 0.64,
    motivo: 'Defecto de material',
    observaciones: 'Grieta natural descubierta al procesar'
  }
]

export const ventas: Venta[] = [
  {
    id: 'V001',
    productoId: 'P001',
    productoNombre: 'Piso Carrara 60x40 Pulido',
    cantidadM2: 5.5,
    precioM2: 200,
    descuento: 5,
    fondoOperativo: 50,
    subtotal: 1100,
    total: 1095,
    clienteNombre: 'Constructora Moderna S.A.',
    clienteEmail: 'compras@constructoramoderna.com',
    clienteTelefono: '+52 555 111 2222',
    fecha: '2026-01-28',
    estado: 'completada'
  },
  {
    id: 'V002',
    productoId: 'P005',
    productoNombre: 'Plancha Calacatta 80x40 Pulido',
    cantidadM2: 3.2,
    precioM2: 320,
    descuento: 0,
    fondoOperativo: 100,
    subtotal: 1024,
    total: 1124,
    clienteNombre: 'Diseños Interiores Premium',
    clienteEmail: 'pedidos@diseñospremium.com',
    clienteTelefono: '+52 555 333 4444',
    fecha: '2026-01-27',
    estado: 'completada'
  },
  {
    id: 'V003',
    productoId: 'P004',
    productoNombre: 'Piso Crema Marfil 60x40 Pulido',
    cantidadM2: 12.0,
    precioM2: 200,
    descuento: 10,
    fondoOperativo: 75,
    subtotal: 2400,
    total: 2235,
    clienteNombre: 'Residencial Los Pinos',
    clienteEmail: 'admin@lospinos.com',
    clienteTelefono: '+52 555 555 6666',
    fecha: '2026-01-26',
    estado: 'pendiente'
  },
  {
    id: 'V004',
    productoId: 'P003',
    productoNombre: 'Piso Emperador 40x40 Pulido',
    cantidadM2: 8.0,
    precioM2: 180,
    descuento: 0,
    fondoOperativo: 60,
    subtotal: 1440,
    total: 1500,
    clienteNombre: 'Hotel Grand Palace',
    clienteEmail: 'mantenimiento@grandpalace.com',
    clienteTelefono: '+52 555 777 8888',
    fecha: '2026-01-25',
    estado: 'completada'
  }
]

// Historial de pagos realizados
export const historialPagos: HistorialPago[] = [
  {
    id: 'HP001',
    trabajadorId: 'T004',
    trabajadorNombre: 'Fernando Ruiz',
    fecha: '2026-01-27',
    produccionIds: ['PD005'],
    montoAcciones: 10500,
    montoBonos: 1000,
    bonoExtra: 500,
    motivoBonoExtra: 'Excelente trabajo en lote especial',
    totalPagado: 12000,
    observaciones: 'Pago semanal'
  },
  {
    id: 'HP002',
    trabajadorId: 'T003',
    trabajadorNombre: 'Miguel Ángel Torres',
    fecha: '2026-01-26',
    produccionIds: ['PD006'],
    montoAcciones: 5040,
    montoBonos: 0,
    bonoExtra: 0,
    motivoBonoExtra: '',
    totalPagado: 5040,
    observaciones: 'Pago por producción del día'
  }
]

// Categorías para el catálogo público
export const categories = ['Todos', 'Piso', 'Plancha', 'Pulido', 'Crudo']

// Dimensiones disponibles
export const dimensiones = ['40x40', '60x40', '80x40']

// Motivos de merma actualizados
export const motivosMerma = [
  'Partida al picar',
  'Partida al pulir', 
  'Defecto de material',
  'Recorte aprovechable',
  'Otro'
]

// Tipos de producto
export const tiposProducto = ['Piso', 'Plancha']

// Estados de losa
export const estadosLosa = ['Crudo', 'Pulido']

// Acciones disponibles
export const acciones = ['picar', 'pulir', 'escuadrar']
