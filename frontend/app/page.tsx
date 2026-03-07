import Image from 'next/image'
import Link from 'next/link'
import { Cormorant_Garamond, Manrope } from 'next/font/google'
import { QuickCart } from '@/components/landing/quick-cart'
import { ScrollToTop } from '@/components/landing/scroll-to-top'

const headingFont = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

const bodyFont = Manrope({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
})

const galleryItems = [
  {
    title: 'Carrara',
    subtitle: 'Luz natural',
    image: '/marble-carrara.jpg',
  },
  {
    title: 'Calacatta',
    subtitle: 'Veta suave',
    image: '/marble-calacatta.jpg',
  },
  {
    title: 'Nero',
    subtitle: 'Contraste editorial',
    image: '/marble-nero.jpg',
  },
]

export default function HomePage() {
  return (
    <div className={`landing-root ${bodyFont.className} min-h-screen bg-[#f7f4ef] text-[#2b241f]`}>
      <ScrollToTop />
      <header className="sticky top-0 z-50 w-full border-b border-black/5 bg-[#f7f4ef]/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <a
            href="#top"
            className={`${headingFont.className} text-2xl font-semibold tracking-[0.14em] transition-opacity hover:opacity-80`}
          >
            Marmoles Elegance
          </a>
          <nav className="flex flex-wrap items-center gap-6 text-[11px] uppercase tracking-[0.35em] text-[#6e5d4c]">
            <a href="#galeria" className="transition-colors hover:text-[#2b241f]">
              Coleccion
            </a>
            <a href="#contacto" className="transition-colors hover:text-[#2b241f]">
              Compra
            </a>
            <Link
              href="/admin"
              className="rounded-full border border-black/10 bg-white/80 px-4 py-2 text-[10px] tracking-[0.3em] text-[#2b241f] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              Panel
            </Link>
          </nav>
        </div>
      </header>

      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 top-8 h-72 w-72 rounded-full bg-white/80 blur-[120px]" />
          <div className="absolute right-0 top-32 h-80 w-80 translate-x-1/3 rounded-full bg-[#d9c4aa]/60 blur-[140px]" />
          <div className="absolute bottom-0 left-1/2 h-64 w-64 -translate-x-1/2 translate-y-1/3 rounded-full bg-[#eee3d4] blur-[150px]" />
        </div>

        <main className="relative z-10">
          <section
            id="top"
            className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-10 lg:grid-cols-[1.1fr_0.9fr]"
          >
            <div className="relative aspect-[4/5] overflow-hidden rounded-[32px] border border-black/5 bg-white/70 shadow-[0_40px_120px_-80px_rgba(44,32,20,0.55)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-6">
              <Image
                src="/hero-marble.jpg"
                alt="Superficie de marmol en ambiente sereno"
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/15 via-transparent to-white/10" />
            </div>

            <div className="flex flex-col justify-center motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-6 motion-safe:delay-100">
              <p className="text-[11px] uppercase tracking-[0.45em] text-[#8a7056]">Atelier de piedra</p>
              <h1
                className={`${headingFont.className} mt-5 text-4xl leading-tight tracking-[0.08em] text-[#2b241f] sm:text-5xl`}
              >
                Superficies serenas para interiores con calma.
              </h1>
              <p className="mt-5 max-w-md text-sm text-[#5f554c]">
                Seleccion curada de marmol y piedra natural para proyectos residenciales. Cortes a
                medida, vetas suaves y asesoramiento personalizado.
              </p>

              <div className="mt-8 space-y-3 text-sm text-[#2b241f]">
                <div className="flex items-center justify-between border-b border-black/10 pb-2">
                  <span className="text-[10px] uppercase tracking-[0.4em] text-[#8a7056]">
                    Contacto
                  </span>
                  <a href="mailto:info@marmoleselegance.com" className="font-medium">
                    info@marmoleselegance.com
                  </a>
                </div>
                <div className="flex items-center justify-between border-b border-black/10 pb-2">
                  <span className="text-[10px] uppercase tracking-[0.4em] text-[#8a7056]">
                    Telefono
                  </span>
                  <a href="tel:+525551234567" className="font-medium">
                    +52 555 123 4567
                  </a>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-[0.4em] text-[#8a7056]">
                    Showroom
                  </span>
                  <span className="font-medium">CDMX, Mexico</span>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a
                  href="#contacto"
                  className="rounded-full border border-black/10 bg-white/90 px-6 py-3 text-xs uppercase tracking-[0.3em] text-[#2b241f] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  Ir a compra
                </a>
                <a
                  href="#galeria"
                  className="rounded-full bg-[#2b241f] px-6 py-3 text-xs uppercase tracking-[0.3em] text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  Ver coleccion
                </a>
              </div>
            </div>
          </section>

          <section id="galeria" className="relative scroll-mt-28 bg-white/70">
            <div className="mx-auto max-w-6xl px-6 py-16">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.45em] text-[#8a7056]">Coleccion</p>
                  <h2
                    className={`${headingFont.className} mt-4 text-3xl tracking-[0.1em] text-[#2b241f] sm:text-4xl`}
                  >
                    Texturas con presencia editorial.
                  </h2>
                </div>
                <p className="max-w-sm text-sm text-[#5f554c]">
                  Tres piedras esenciales para una paleta contemporanea. Vetas limpias, volumen
                  suave y acabados satinados.
                </p>
              </div>

              <div className="mt-10 grid gap-8 md:grid-cols-3">
                {galleryItems.map((item, index) => (
                  <figure
                    key={item.title}
                    className="group motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-6"
                    style={{ animationDelay: `${index * 120}ms` }}
                  >
                    <div className="relative aspect-[4/5] overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-[0_30px_80px_-70px_rgba(44,32,20,0.5)]">
                      <Image
                        src={item.image}
                        alt={`Marmol ${item.title}`}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-black/20 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                    </div>
                    <figcaption className="mt-4">
                      <p className={`${headingFont.className} text-lg text-[#2b241f]`}>
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.3em] text-[#8a7056]">
                        {item.subtitle}
                      </p>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </section>

          <section id="contacto" className="relative scroll-mt-28">
            <div className="mx-auto max-w-6xl px-6 py-16">
              <div className="grid gap-10 rounded-[32px] border border-black/5 bg-white/80 p-8 shadow-[0_40px_120px_-90px_rgba(44,32,20,0.55)] lg:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-6">
                  <p className="text-[11px] uppercase tracking-[0.45em] text-[#8a7056]">Compra</p>
                  <h2
                    className={`${headingFont.className} text-3xl tracking-[0.08em] text-[#2b241f] sm:text-4xl`}
                  >
                    Compra directa por WhatsApp.
                  </h2>
                  <p className="text-sm text-[#5f554c]">
                    Selecciona tus piezas, agrega los m2 necesarios y finaliza la compra directo en
                    WhatsApp.
                  </p>
                  <div className="space-y-3 text-sm text-[#2b241f]">
                    <a href="mailto:info@marmoleselegance.com" className="block font-medium">
                      info@marmoleselegance.com
                    </a>
                    <a href="tel:+525551234567" className="block font-medium">
                      +52 555 123 4567
                    </a>
                    <p>Av. Principal 123, Col. Centro, CDMX</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.3em] text-[#8a7056]">
                    <span className="rounded-full border border-black/10 px-3 py-1">Muestras</span>
                    <span className="rounded-full border border-black/10 px-3 py-1">Entrega</span>
                    <span className="rounded-full border border-black/10 px-3 py-1">Soporte</span>
                  </div>
                  <span className="text-xs uppercase tracking-[0.3em] text-[#8a7056]">
                    Respuesta en horario laboral
                  </span>
                </div>

                <QuickCart />
              </div>

              <footer className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-black/5 pt-6 text-[11px] uppercase tracking-[0.3em] text-[#8a7056] sm:flex-row">
                <span>Hecho en Mexico</span>
                <span className={`${headingFont.className} text-sm tracking-[0.2em] text-[#2b241f]`}>
                  Marmoles Elegance
                </span>
                <span>(c) {new Date().getFullYear()}</span>
              </footer>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
