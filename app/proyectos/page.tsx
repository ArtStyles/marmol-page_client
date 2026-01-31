import Image from 'next/image'
import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'

const projects = [
  {
    title: 'Residencia Vista Mar',
    location: 'Los Cabos',
    image: '/marble-calacatta.jpg',
    description: 'Pisos en Calacatta con acabado pulido y cortes a medida para áreas sociales.',
  },
  {
    title: 'Hotel Grand Palace',
    location: 'CDMX',
    image: '/marble-emperador.jpg',
    description: 'Lobby y recepciones con Emperador oscuro, sellado premium anti-manchas.',
  },
  {
    title: 'Showroom Levante',
    location: 'Guadalajara',
    image: '/marble-statuario.jpg',
    description: 'Muros y barras en Statuario con vetas continuas seleccionadas.',
  },
  {
    title: 'Casa Lago',
    location: 'Querétaro',
    image: '/marble-crema.jpg',
    description: 'Baños y cocinas en Crema Marfil con corte bookmatch.',
  },
  {
    title: 'Torre Corporativa Norte',
    location: 'Monterrey',
    image: '/marble-nero.jpg',
    description: 'Fachadas interiores con Nero Marquina y detalles satinados.',
  },
  {
    title: 'Penthouse Aura',
    location: 'Puebla',
    image: '/marble-carrara.jpg',
    description: 'Cocinas en Carrara con espesores personalizados y cantos biselados.',
  },
]

export default function ProyectosPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f1ea]">
      <Navbar />
      <main className="flex-1">
        <section className="relative overflow-hidden px-4 pb-16 pt-20">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-0 top-0 h-56 w-56 -translate-x-1/3 -translate-y-1/3 rounded-full bg-white/80 blur-[120px]" />
            <div className="absolute bottom-0 right-0 h-72 w-72 translate-x-1/4 translate-y-1/4 rounded-full bg-[#d6c2a6]/40 blur-[140px]" />
          </div>
          <div className="container relative mx-auto text-center">
            <p className="text-xs uppercase tracking-[0.4em] text-[#9a7a54]">Proyectos</p>
            <h1 className="mt-4 font-serif text-3xl font-semibold uppercase tracking-[0.18em] text-[#2e2a25] md:text-5xl">
              Espacios reales, resultados impecables
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-sm text-[#5f564d]">
              Casos seleccionados donde el mármol elevó la experiencia, la luz y la identidad del proyecto.
            </p>
          </div>
        </section>

        <section className="px-4 pb-24">
          <div className="container mx-auto grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <article
                key={project.title}
                className="group overflow-hidden rounded-3xl border border-[#e2d7c8] bg-white/90 shadow-[0_18px_45px_-35px_rgba(34,29,24,0.5)]"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={project.image}
                    alt={project.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="p-6">
                  <p className="text-xs uppercase tracking-[0.3em] text-[#9a7a54]">{project.location}</p>
                  <h3 className="mt-3 font-serif text-xl text-[#2e2a25]">{project.title}</h3>
                  <p className="mt-3 text-sm text-[#6b6056]">{project.description}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="container mx-auto mt-14 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[#e2d7c8] bg-white/80 p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#9a7a54]">Tu próximo proyecto</p>
              <h3 className="mt-2 font-serif text-2xl text-[#2e2a25]">
                Hagamos realidad una propuesta a la medida
              </h3>
            </div>
            <Link href="/contacto">
              <Button className="rounded-none bg-[#9a7a54] px-8 text-xs uppercase tracking-[0.35em] text-white hover:bg-[#8b6c49]">
                Cotizar proyecto
              </Button>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
