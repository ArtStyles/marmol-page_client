import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Ruler } from 'lucide-react'

const steps = [
  'Levantamiento de medidas y planificación de cortes.',
  'Preparación de base y verificación de nivelación.',
  'Instalación con adhesivos premium y sellado profesional.',
  'Entrega con guía de cuidado y mantenimiento inicial.',
]

export default function InstalacionPage() {
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
            <p className="text-xs uppercase tracking-[0.4em] text-[#9a7a54]">Servicios</p>
            <h1 className="mt-4 font-serif text-3xl font-semibold uppercase tracking-[0.18em] text-[#2e2a25] md:text-5xl">
              Instalación especializada
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-sm text-[#5f564d]">
              Coordinamos instalación con técnicos certificados para garantizar precisión y acabados impecables.
            </p>
          </div>
        </section>

        <section className="px-4 pb-24">
          <div className="container mx-auto grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-[#e2d7c8] bg-white/90 p-6 shadow-[0_18px_45px_-35px_rgba(34,29,24,0.5)]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#efe5d7]">
                  <Ruler className="h-5 w-5 text-[#9a7a54]" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[#9a7a54]">Proceso</p>
                  <h2 className="mt-2 font-serif text-2xl text-[#2e2a25]">Montaje con precisión milimétrica</h2>
                </div>
              </div>
              <ul className="mt-6 space-y-3 text-sm text-[#6b6056]">
                {steps.map((step) => (
                  <li key={step} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#9a7a54]" />
                    {step}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-[#e2d7c8] bg-white/80 p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-[#9a7a54]">Incluye</p>
              <h3 className="mt-3 font-serif text-xl text-[#2e2a25]">Supervisión técnica y garantía de obra</h3>
              <p className="mt-3 text-sm text-[#6b6056]">
                Supervisión en sitio, control de humedad y recomendaciones para prolongar el brillo natural del mármol.
              </p>
              <Link href="/contacto">
                <Button className="mt-6 w-full rounded-none bg-[#9a7a54] text-xs uppercase tracking-[0.35em] text-white hover:bg-[#8b6c49]">
                  Agendar instalación
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
