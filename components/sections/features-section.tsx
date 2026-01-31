import Image from 'next/image'
import { Instagram, Pin } from 'lucide-react'

const inspirationStrip = [
  { id: 1, image: '/marble-calacatta.jpg' },
  { id: 2, image: '/marble-nero.jpg' },
  { id: 3, image: '/marble-emperador.jpg' },
  { id: 4, image: '/marble-carrara.jpg', label: 'Colores favoritos 2026' },
  { id: 5, image: '/marble-crema.jpg' },
  { id: 6, image: '/marble-statuario.jpg' },
]

export function FeaturesSection() {
  return (
    <section id="nosotros" className="relative overflow-hidden bg-[#f8f4ee] py-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-10 h-52 w-52 rounded-full bg-white/70 blur-[90px]" />
        <div className="absolute right-10 top-0 h-44 w-44 rounded-full bg-[#d6c2a6]/40 blur-[90px]" />
      </div>

      <div className="container relative mx-auto px-4">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-[#9a7a54]">
            Necesitas mas inspiracion? siguemos para ver lo ultimo
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-[11px] uppercase tracking-[0.25em] text-[#9a7a54]">
            <span className="inline-flex items-center gap-2">
              <Instagram className="h-4 w-4" />
              Instagram
            </span>
            <span className="inline-flex items-center gap-2">
              <Pin className="h-4 w-4" />
              Pinterest
            </span>
          </div>
        </div>

        <div className="mt-10 flex gap-4 overflow-x-auto pb-4 md:grid md:grid-cols-6 md:overflow-visible">
          {inspirationStrip.map((item) => (
            <article
              key={item.id}
              className="group relative min-w-[180px] overflow-hidden bg-white shadow-[0_18px_45px_-35px_rgba(34,29,24,0.5)] md:min-w-0"
            >
              <div className="relative aspect-4/3">
                <Image
                  src={item.image}
                  alt="Inspiracion en marmol"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/10" />
                {item.label && (
                  <div className="absolute bottom-3 left-3 rounded-sm bg-black/60 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-white">
                      {item.label}
                    </p>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
