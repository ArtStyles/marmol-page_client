import Image from 'next/image'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export function HeroSection() {
  return (
    <section className="relative min-h-[92vh] overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src="/hero-marble.jpg"
          alt="Interior de lujo con marmol"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/35" />
        <div className="absolute inset-0 bg-linear-to-b from-black/40 via-black/10 to-black/40" />
      </div>

      <div className="container relative z-10 mx-auto flex min-h-[92vh] items-center justify-center px-4 py-24">
        <div className="text-center text-white">
          <p className="text-xs uppercase tracking-[0.6em] text-white/70">The stone company</p>
          <h1 className="mt-6 font-serif text-4xl font-semibold uppercase tracking-[0.12em] sm:text-5xl md:text-6xl">
            Construyendo juntos
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-sm text-white/80 sm:text-base">
            Superficies en marmol y piedra natural para proyectos residenciales y comerciales.
          </p>
          <div className="mt-10 flex items-center justify-center">
            <Button
              asChild
              size="lg"
              className="rounded-none bg-white/85 px-10 text-xs font-semibold uppercase tracking-[0.3em] text-slate-900 hover:bg-white"
            >
              <Link href="#catalogo">Inspirate</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
