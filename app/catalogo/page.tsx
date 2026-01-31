'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { ProductCard } from '@/components/product-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { dimensiones } from '@/lib/data'
import type { Producto } from '@/lib/types'
import { CheckCircle2, Sparkles } from 'lucide-react'
import { useProductosStore } from '@/hooks/use-productos'

const tipoOptions = ['Todos', 'Piso', 'Plancha']
const acabadoOptions = ['Todos', 'Pulido', 'Crudo']
const dimensionOptions = ['Todos', ...dimensiones]
const sortOptions = [
  { value: 'destacados', label: 'Destacados' },
  { value: 'precio-asc', label: 'Precio: menor a mayor' },
  { value: 'precio-desc', label: 'Precio: mayor a menor' },
  { value: 'nombre', label: 'Nombre A-Z' },
  { value: 'stock', label: 'Mayor stock' },
]

export default function CatalogoPage() {
  const { productos } = useProductosStore()
  const [search, setSearch] = useState('')
  const [tipo, setTipo] = useState('Todos')
  const [acabado, setAcabado] = useState('Todos')
  const [dimension, setDimension] = useState('Todos')
  const [sortBy, setSortBy] = useState('destacados')
  const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null)
  const [requestedM2, setRequestedM2] = useState('')

  const whatsappNumber = '5354789597'

  const buildWhatsappUrl = (product?: Producto) => {
    const metros = Number.parseFloat(requestedM2)
    const losasNecesarias = product ? calculateLosas(product.dimension, metros) : null
    const messageLines = [
      'Solicitud de compra desde el catálogo',
      product ? `Producto: ${product.nombre}` : 'Producto: No especificado',
      product ? `Tipo: ${product.tipo}` : '',
      product ? `Acabado: ${product.estado}` : '',
      product ? `Dimensión: ${product.dimension} cm` : '',
      product ? `Precio: $${product.precioM2}/m2` : '',
      product ? `Stock: ${product.cantidadLosas} losas` : '',
      metros ? `Metros solicitados: ${metros} m2` : '',
      losasNecesarias ? `Losas aproximadas: ${losasNecesarias}` : '',
    ].filter(Boolean)

    const message = messageLines.join('\n')
    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`
  }

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    const filtered = productos.filter((product) => {
      const matchesSearch =
        !normalizedSearch ||
        product.nombre.toLowerCase().includes(normalizedSearch) ||
        product.origenNombre.toLowerCase().includes(normalizedSearch)
      const matchesTipo = tipo === 'Todos' || product.tipo === tipo
      const matchesAcabado = acabado === 'Todos' || product.estado === acabado
      const matchesDimension = dimension === 'Todos' || product.dimension === dimension

      return matchesSearch && matchesTipo && matchesAcabado && matchesDimension
    })

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'precio-asc':
          return a.precioM2 - b.precioM2
        case 'precio-desc':
          return b.precioM2 - a.precioM2
        case 'nombre':
          return a.nombre.localeCompare(b.nombre)
        case 'stock':
          return b.cantidadLosas - a.cantidadLosas
        default:
          return b.cantidadLosas - a.cantidadLosas
      }
    })
  }, [search, tipo, acabado, dimension, sortBy])

  const calculateLosas = (dimensionValue: string, metros: number) => {
    if (!metros || metros <= 0) return null
    const parts = dimensionValue.split('x').map((value) => Number.parseFloat(value))
    if (parts.length !== 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) return null
    const areaLosa = (parts[0] / 100) * (parts[1] / 100)
    if (areaLosa <= 0) return null
    return Math.ceil(metros / areaLosa)
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f1ea]">
      <Navbar />
      <main className="flex-1">
        <section className="relative overflow-hidden px-4 pb-16 pt-20">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-0 top-0 h-56 w-56 -translate-x-1/3 -translate-y-1/3 rounded-full bg-white/80 blur-[120px]" />
            <div className="absolute bottom-0 right-0 h-72 w-72 translate-x-1/4 translate-y-1/4 rounded-full bg-[#d6c2a6]/40 blur-[140px]" />
          </div>

          <div className="container relative mx-auto">
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.4em] text-[#9a7a54]">Catálogo premium</p>
              <h1 className="mt-4 font-serif text-3xl font-semibold uppercase tracking-[0.18em] text-[#2e2a25] md:text-5xl">
                Piedras seleccionadas para espacios memorables
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-sm text-[#5f564d]">
                Filtra por tipo, acabado y dimensión. Cada producto incluye ficha técnica, origen y disponibilidad
                actualizada.
              </p>
            </div>

            <div className="mt-10 rounded-3xl border border-[#e2d7c8] bg-white/80 p-6 shadow-[0_20px_55px_-40px_rgba(34,29,24,0.45)]">
              <div className="grid gap-4 lg:grid-cols-[1.4fr_repeat(4,1fr)_0.7fr]">
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-[#9a7a54]">Búsqueda</p>
                  <Input
                    placeholder="Buscar por nombre u origen"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-[#9a7a54]">Tipo</p>
                  <Select value={tipo} onValueChange={setTipo}>
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {tipoOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-[#9a7a54]">Acabado</p>
                  <Select value={acabado} onValueChange={setAcabado}>
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue placeholder="Acabado" />
                    </SelectTrigger>
                    <SelectContent>
                      {acabadoOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-[#9a7a54]">Dimensión</p>
                  <Select value={dimension} onValueChange={setDimension}>
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue placeholder="Dimensión" />
                    </SelectTrigger>
                    <SelectContent>
                      {dimensionOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-[#9a7a54]">Orden</p>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue placeholder="Ordenar" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  className="w-full border-[#d6c2a6] text-xs uppercase tracking-[0.25em] text-[#9a7a54]"
                  onClick={() => {
                    setSearch('')
                    setTipo('Todos')
                    setAcabado('Todos')
                    setDimension('Todos')
                    setSortBy('destacados')
                  }}
                >
                  Limpiar
                </Button>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.25em] text-[#9a7a54]">
                <span>{filteredProducts.length} resultados</span>
                <span className="text-[#d6c2a6]">·</span>
                <span>Stock verificado</span>
                <span className="text-[#d6c2a6]">·</span>
                <span>Envío programado</span>
              </div>
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onViewDetails={(item) => {
                    setRequestedM2('')
                    setSelectedProduct(item)
                  }}
                />
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="mt-12 rounded-2xl border border-dashed border-[#d6c2a6] bg-white/70 p-10 text-center">
                <p className="text-sm text-[#6b6056]">No hay productos con esos filtros. Prueba otra combinación.</p>
              </div>
            )}

            <div className="mt-16 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[#e2d7c8] bg-white/80 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#efe5d7]">
                  <Sparkles className="h-5 w-5 text-[#9a7a54]" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[#9a7a54]">Asesoría guiada</p>
                  <p className="mt-2 text-lg font-semibold text-[#2e2a25]">
                    Recibe una recomendación curada para tu proyecto
                  </p>
                  <p className="mt-1 text-sm text-[#6b6056]">
                    Envíanos planos y te sugerimos vetas, formatos y combinaciones.
                  </p>
                </div>
              </div>
              <Link href="/contacto">
                <Button className="rounded-none bg-[#9a7a54] px-8 text-xs uppercase tracking-[0.35em] text-white hover:bg-[#8b6c49]">
                  Solicitar propuesta
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />

      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto border-[#e2d7c8] bg-[#f6f1ea]">
          {selectedProduct && (
            <div className="grid gap-8 md:grid-cols-[1fr_1.1fr]">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-white">
                <Image
                  src={selectedProduct.imagen || '/placeholder.svg'}
                  alt={selectedProduct.nombre}
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <DialogHeader>
                  <DialogTitle className="font-serif text-2xl text-[#2e2a25]">
                    {selectedProduct.nombre}
                  </DialogTitle>
                  <DialogDescription className="text-[#6b6056]">
                    Selección premium con disponibilidad inmediata.
                  </DialogDescription>
                </DialogHeader>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge className="bg-[#9a7a54] text-white">{selectedProduct.tipo}</Badge>
                  <Badge variant="secondary" className="bg-white text-[#9a7a54]">
                    {selectedProduct.estado}
                  </Badge>
                  <Badge variant="outline" className="border-[#d6c2a6] text-[#9a7a54]">
                    {selectedProduct.dimension} cm
                  </Badge>
                </div>

                <div className="mt-6 rounded-2xl border border-[#e2d7c8] bg-white/80 p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-[0.25em] text-[#9a7a54]">Precio</span>
                    <span className="font-serif text-3xl text-[#2e2a25]">
                      ${selectedProduct.precioM2}
                      <span className="text-sm text-[#6b6056]">/m2</span>
                    </span>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-[#6b6056]">
                    <p className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#9a7a54]" />
                      {selectedProduct.cantidadLosas} losas disponibles
                    </p>
                    <p className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#9a7a54]" />
                      {selectedProduct.metrosCuadrados.toFixed(1)} m2 listos para entrega
                    </p>
                    <p className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#9a7a54]" />
                      Selección y curaduría por veta
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-[#e2d7c8] bg-white/80 p-5">
                  <p className="text-xs uppercase tracking-[0.25em] text-[#9a7a54]">Solicitud de compra</p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                    <div className="space-y-2">
                      <label className="text-[11px] uppercase tracking-[0.25em] text-[#9a7a54]">
                        Metros cuadrados necesarios
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="Ej. 12.5"
                        value={requestedM2}
                        onChange={(event) => setRequestedM2(event.target.value)}
                        className="bg-white"
                      />
                    </div>
                    <div className="rounded-xl border border-[#e2d7c8] bg-white px-4 py-3 text-sm text-[#6b6056]">
                      {requestedM2 && calculateLosas(selectedProduct.dimension, Number.parseFloat(requestedM2))
                        ? `${calculateLosas(selectedProduct.dimension, Number.parseFloat(requestedM2))} losas aprox.`
                        : 'Ingresa m² para calcular'}
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 text-sm text-[#6b6056]">
                  <div className="flex justify-between border-b border-[#e2d7c8] pb-2">
                    <span>Tipo</span>
                    <span className="font-semibold text-[#2e2a25]">{selectedProduct.tipo}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#e2d7c8] pb-2">
                    <span>Acabado</span>
                    <span className="font-semibold text-[#2e2a25]">{selectedProduct.estado}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#e2d7c8] pb-2">
                    <span>Dimensión</span>
                    <span className="font-semibold text-[#2e2a25]">{selectedProduct.dimension} cm</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stock disponible</span>
                    <span className="font-semibold text-[#2e2a25]">{selectedProduct.cantidadLosas} losas</span>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Button
                    className="flex-1 rounded-none bg-[#9a7a54] text-xs uppercase tracking-[0.35em] text-white hover:bg-[#8b6c49]"
                    onClick={() => window.open(buildWhatsappUrl(selectedProduct), '_blank', 'noopener,noreferrer')}
                  >
                    Reservar lote
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 rounded-none border-[#d6c2a6] text-xs uppercase tracking-[0.3em] text-[#9a7a54]"
                    onClick={() => window.open(buildWhatsappUrl(selectedProduct), '_blank', 'noopener,noreferrer')}
                  >
                    Solicitar muestra
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
