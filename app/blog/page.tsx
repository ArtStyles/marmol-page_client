import Image from 'next/image'
import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'

const posts = [
  {
    title: 'Cómo elegir el mármol ideal para cocinas contemporáneas',
    date: '12 Ene 2026',
    category: 'Tendencias',
    image: '/marble-carrara.jpg',
    excerpt: 'Guía práctica para seleccionar vetas, acabados y formatos que resisten el uso diario.',
  },
  {
    title: 'Cortes precisos: la diferencia entre un proyecto bueno y uno impecable',
    date: '28 Dic 2025',
    category: 'Proceso',
    image: '/marble-emperador.jpg',
    excerpt: 'Descubre cómo planificamos el corte y el sellado para minimizar desperdicio.',
  },
  {
    title: 'Tonos cálidos en mármol: combinaciones que elevan espacios residenciales',
    date: '05 Dic 2025',
    category: 'Inspiración',
    image: '/marble-crema.jpg',
    excerpt: 'Paletas, texturas y aplicaciones para crear ambientes acogedores sin perder elegancia.',
  },
]

export default function BlogPage() {
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
            <p className="text-xs uppercase tracking-[0.4em] text-[#9a7a54]">Blog</p>
            <h1 className="mt-4 font-serif text-3xl font-semibold uppercase tracking-[0.18em] text-[#2e2a25] md:text-5xl">
              Ideas, tendencias y guías de instalación
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-sm text-[#5f564d]">
              Curaduría editorial para ayudarte a elegir el mármol correcto según tu proyecto y estilo.
            </p>
          </div>
        </section>

        <section className="px-4 pb-24">
          <div className="container mx-auto grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <article
                key={post.title}
                className="overflow-hidden rounded-3xl border border-[#e2d7c8] bg-white/90 shadow-[0_18px_45px_-35px_rgba(34,29,24,0.5)]"
              >
                <div className="relative aspect-[4/3]">
                  <Image src={post.image} alt={post.title} fill className="object-cover" />
                </div>
                <div className="p-6">
                  <p className="text-xs uppercase tracking-[0.3em] text-[#9a7a54]">
                    {post.category} · {post.date}
                  </p>
                  <h3 className="mt-3 font-serif text-xl text-[#2e2a25]">{post.title}</h3>
                  <p className="mt-3 text-sm text-[#6b6056]">{post.excerpt}</p>
                  <Button variant="ghost" className="mt-4 p-0 text-xs uppercase tracking-[0.25em] text-[#9a7a54]">
                    Leer artículo
                  </Button>
                </div>
              </article>
            ))}
          </div>

          <div className="container mx-auto mt-12 flex items-center justify-center">
            <Link href="/contacto">
              <Button className="rounded-none bg-[#9a7a54] px-8 text-xs uppercase tracking-[0.35em] text-white hover:bg-[#8b6c49]">
                Recibir asesoría
              </Button>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
