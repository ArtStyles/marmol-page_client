import Image from 'next/image'
import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Gem, Sparkles, ShieldCheck } from 'lucide-react'

const values = [
  {
    icon: Gem,
    title: 'Selección curada',
    description: 'Trabajamos con canteras certificadas y revisamos cada lote para garantizar vetas limpias.',
  },
  {
    icon: ShieldCheck,
    title: 'Calidad controlada',
    description: 'Procesos de corte y sellado precisos para reducir desperdicio y asegurar acabados homogéneos.',
  },
  {
    icon: Sparkles,
    title: 'Asesoría integral',
    description: 'Acompañamiento desde la elección de textura hasta la entrega final en obra.',
  },
]

export default function NosotrosPage() {
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
            <p className="text-xs uppercase tracking-[0.4em] text-[#9a7a54]">Nosotros</p>
            <h1 className="mt-4 font-serif text-3xl font-semibold uppercase tracking-[0.18em] text-[#2e2a25] md:text-5xl">
              Tradición y precisión en cada veta
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-sm text-[#5f564d]">
              Más de dos décadas acompañando proyectos residenciales y corporativos con mármol de origen certificado.
            </p>
          </div>
        </section>

        <section className="px-4 pb-20">
          <div className="container mx-auto grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6">
              <p className="text-xs uppercase tracking-[0.35em] text-[#9a7a54]">Nuestra historia</p>
              <h2 className="font-serif text-3xl font-semibold text-[#2e2a25]">
                Desde 1998 seleccionamos la piedra con rigor artesanal
              </h2>
              <p className="text-sm text-[#5f564d]">
                Nuestro equipo combina curaduría de vetas, tecnología de corte y logística especializada para entregar
                superficies listas para instalar. Cada lote se evalúa por tonalidad, resistencia y balance visual.
              </p>
              <div className="grid gap-3 text-sm text-[#6b6056]">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#9a7a54]" />
                  Origen certificado en Italia, España y América.
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#9a7a54]" />
                  Corte preciso y sellado para instalaciones sin sorpresas.
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#9a7a54]" />
                  Entregas programadas con embalaje especializado.
                </span>
              </div>
              <Link href="/contacto">
                <Button className="rounded-none bg-[#9a7a54] px-8 text-xs uppercase tracking-[0.35em] text-white hover:bg-[#8b6c49]">
                  Agenda una visita
                </Button>
              </Link>
            </div>
            <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-[#e2d7c8] bg-white shadow-[0_20px_60px_-45px_rgba(34,29,24,0.55)]">
              <Image
                src="/marble-statuario.jpg"
                alt="Mármoles seleccionados"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </section>

        <section className="px-4 pb-24">
          <div className="container mx-auto">
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.35em] text-[#9a7a54]">Lo que nos define</p>
              <h2 className="mt-4 font-serif text-3xl font-semibold text-[#2e2a25]">
                Tres pilares para proyectos impecables
              </h2>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {values.map((value) => (
                <div
                  key={value.title}
                  className="rounded-3xl border border-[#e2d7c8] bg-white/90 p-6 shadow-[0_18px_45px_-35px_rgba(34,29,24,0.5)]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#efe5d7]">
                    <value.icon className="h-5 w-5 text-[#9a7a54]" />
                  </div>
                  <h3 className="mt-4 font-serif text-xl text-[#2e2a25]">{value.title}</h3>
                  <p className="mt-3 text-sm text-[#6b6056]">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
