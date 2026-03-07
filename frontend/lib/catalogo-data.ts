import type { CatalogoItem } from './types'

export const catalogoItems: CatalogoItem[] = [
  {
    id: 'C001',
    nombre: 'Marmol Carrara Select 60x40',
    tipo: 'Piso',
    acabado: 'Pulido',
    dimension: '60x40',
    precioM2: 210,
    stockLosas: 120,
    destacado: true,
    descripcion:
      'Veta suave y elegante, ideal para salas, cocinas premium y proyectos residenciales.',
    imagen: '/marble-carrara.jpg'
  },
  {
    id: 'C002',
    nombre: 'Calacatta Gold Signature 80x40',
    tipo: 'Plancha',
    acabado: 'Pulido',
    dimension: '80x40',
    precioM2: 340,
    stockLosas: 48,
    destacado: true,
    descripcion:
      'Alta demanda en barras y muros de impacto. Tonos dorados con vetas definidas.',
    imagen: '/marble-calacatta.jpg'
  },
  {
    id: 'C003',
    nombre: 'Emperador Dark 60x40',
    tipo: 'Piso',
    acabado: 'Crudo',
    dimension: '60x40',
    precioM2: 170,
    stockLosas: 90,
    destacado: false,
    descripcion:
      'Acabado natural para proyectos boutique y espacios comerciales con alto trafico.',
    imagen: '/marble-emperador.jpg'
  },
  {
    id: 'C004',
    nombre: 'Crema Marfil Classic 40x40',
    tipo: 'Piso',
    acabado: 'Pulido',
    dimension: '40x40',
    precioM2: 160,
    stockLosas: 150,
    destacado: false,
    descripcion:
      'Tono calido y uniforme, excelente para proyectos hoteleros y residenciales.',
    imagen: '/marble-crema.jpg'
  },
  {
    id: 'C005',
    nombre: 'Nero Marquina 60x40',
    tipo: 'Piso',
    acabado: 'Pulido',
    dimension: '60x40',
    precioM2: 230,
    stockLosas: 70,
    destacado: false,
    descripcion:
      'Contraste dramatico para entradas, baños de lujo y recepciones corporativas.',
    imagen: '/marble-nero.jpg'
  },
  {
    id: 'C006',
    nombre: 'Statuario Luxe 80x40',
    tipo: 'Plancha',
    acabado: 'Crudo',
    dimension: '80x40',
    precioM2: 280,
    stockLosas: 36,
    destacado: true,
    descripcion:
      'Veta marcada y fondo claro, ideal para piezas protagonistas y muros completos.',
    imagen: '/marble-statuario.jpg'
  }
]
