import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const galleryItems = [
  {
    title: 'Galeria de inspiracion',
    image: '/marble-calacatta.jpg',
    className: 'lg:col-span-4 lg:row-span-2',
  },
  {
    title: 'Tendencias 2026',
    image: '/marble-carrara.jpg',
    className: 'lg:col-span-4',
  },
  {
    title: 'Herramientas visuales',
    image: '/marble-nero.jpg',
    className: 'lg:col-span-4',
  },
  {
    title: 'Blog',
    image: '/marble-crema.jpg',
    className: 'lg:col-span-4',
  },
  {
    title: 'Experiencia madera',
    image: '/marble-emperador.jpg',
    className: 'lg:col-span-4',
  },
  {
    title: 'Tonos calidos',
    image: '/marble-statuario.jpg',
    className: 'lg:col-span-4',
  },
]

export function CatalogSection() {
  return (
    <section id="catalogo" className="relative overflow-hidden bg-[#f6f1ea] py-24">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-0 h-56 w-56 -translate-x-1/3 -translate-y-1/3 rounded-full bg-[#d6c2a6]/40 blur-[90px]" />
        <div className="absolute bottom-0 right-0 h-72 w-72 translate-x-1/4 translate-y-1/4 rounded-full bg-white/70 blur-[120px]" />
      </div>

      <div className="container relative mx-auto px-4">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-[#9a7a54]">Get inspired</p>
          <h2 className="mt-4 font-serif text-3xl font-semibold uppercase tracking-[0.18em] text-[#2e2a25] md:text-4xl">
            Inspiracion para espacios impecables
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm text-[#5f564d]">
            Curaduria de acabados, aplicaciones y combinaciones para transformar proyectos residenciales y comerciales.
          </p>
        </div>

        <div className="mt-12 grid auto-rows-[200px] gap-6 lg:grid-cols-12">
          {galleryItems.map((item) => (
            <article
              key={item.title}
              className={`group relative overflow-hidden bg-white shadow-[0_18px_45px_-35px_rgba(34,29,24,0.5)] ${item.className}`}
            >
              <Image
                src={item.image}
                alt={item.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-linear-to-b from-black/0 via-black/0 to-black/50" />
              <p className="absolute bottom-3 left-4 text-[11px] uppercase tracking-[0.3em] text-white/90">
                {item.title}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-12 flex items-center justify-center">
          <Link href="#contacto">
            <Button className="rounded-none bg-[#9a7a54] px-10 text-xs uppercase tracking-[0.35em] text-white hover:bg-[#8b6c49]">
              Discover more
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
