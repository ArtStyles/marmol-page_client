import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { CheckCircle2, MessageCircle } from 'lucide-react'

const focusAreas = [
  'Selección de vetas y paletas según iluminación.',
  'Recomendación de formatos y espesores por uso.',
  'Optimización de presupuesto y tiempos de entrega.',
  'Propuesta visual con combinaciones de materiales.',
]

export default function AsesoriaPage() {
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
              Asesoría personalizada
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-sm text-[#5f564d]">
              Te acompañamos desde la curaduría inicial hasta la propuesta final para que elijas con seguridad.
            </p>
          </div>
        </section>

        <section className="px-4 pb-24">
          <div className="container mx-auto grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-[#e2d7c8] bg-white/90 p-6 shadow-[0_18px_45px_-35px_rgba(34,29,24,0.5)]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#efe5d7]">
                  <MessageCircle className="h-5 w-5 text-[#9a7a54]" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[#9a7a54]">Acompañamiento</p>
                  <h2 className="mt-2 font-serif text-2xl text-[#2e2a25]">Curaduría experta de materiales</h2>
                </div>
              </div>
              <ul className="mt-6 space-y-3 text-sm text-[#6b6056]">
                {focusAreas.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#9a7a54]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-[#e2d7c8] bg-white/80 p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-[#9a7a54]">Recomendación</p>
              <h3 className="mt-3 font-serif text-xl text-[#2e2a25]">Sesión 1:1 con especialistas</h3>
              <p className="mt-3 text-sm text-[#6b6056]">
                Recibe una propuesta con variantes de tono, acabado y presupuesto con tiempos reales de entrega.
              </p>
              <Link href="/contacto">
                <Button className="mt-6 w-full rounded-none bg-[#9a7a54] text-xs uppercase tracking-[0.35em] text-white hover:bg-[#8b6c49]">
                  Agendar asesoría
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
