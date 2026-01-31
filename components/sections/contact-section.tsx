'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Mail, Phone, MapPin, Clock, ArrowRight } from 'lucide-react'

const contactInfo = [
  {
    icon: Phone,
    title: 'Telefono',
    value: '+52 555 123 4567',
    subtitle: 'Lun - Vie: 9am - 6pm',
  },
  {
    icon: Mail,
    title: 'Email',
    value: 'info@marmoleselegance.com',
    subtitle: 'Respondemos en 24 horas',
  },
  {
    icon: MapPin,
    title: 'Direccion',
    value: 'Av. Principal 123',
    subtitle: 'Col. Centro, CDMX',
  },
  {
    icon: Clock,
    title: 'Horario',
    value: 'Lun - Sab',
    subtitle: '9:00 AM - 7:00 PM',
  },
]

export function ContactSection() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const whatsappNumber = '5354789597'
    const message = [
      'Nueva solicitud de compra',
      `Nombre: ${formData.name}`,
      `Email: ${formData.email}`,
      `Teléfono: ${formData.phone || 'No especificado'}`,
      `Detalle: ${formData.message}`,
    ].join('\n')

    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank', 'noopener,noreferrer')
    setFormData({ name: '', email: '', phone: '', message: '' })
  }

  return (
    <section id="contacto" className="relative overflow-hidden bg-[#f6f1ea] py-24">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-0 h-56 w-56 -translate-x-1/4 -translate-y-1/3 rounded-full bg-white/80 blur-[110px]" />
        <div className="absolute bottom-0 right-0 h-72 w-72 translate-x-1/4 translate-y-1/4 rounded-full bg-[#d6c2a6]/40 blur-[120px]" />
      </div>

      <div className="container relative mx-auto px-4">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-[#9a7a54]">Let us help</p>
          <h2 className="mt-4 font-serif text-3xl font-semibold uppercase tracking-[0.18em] text-[#2e2a25] md:text-4xl">
            Hablemos de tu proyecto
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm text-[#5f564d]">
            Comparte medidas, acabado y tiempos. Un asesor responde con stock, costo y propuesta en 24 horas.
          </p>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-[#e2d7c8] bg-white/80 p-6 shadow-[0_18px_45px_-35px_rgba(34,29,24,0.5)]">
              <p className="text-[11px] uppercase tracking-[0.35em] text-[#9a7a54]">Respuesta garantizada</p>
              <p className="mt-3 text-lg font-semibold text-[#2e2a25]">
                Cotizacion en 24 horas y visita a showroom opcional
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-xs uppercase tracking-[0.2em] text-[#9a7a54]">
                <span className="rounded-full border border-[#e2d7c8] px-3 py-1">Muestras 24h</span>
                <span className="rounded-full border border-[#e2d7c8] px-3 py-1">Entrega programada</span>
                <span className="rounded-full border border-[#e2d7c8] px-3 py-1">Soporte en obra</span>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {contactInfo.map((info) => (
                <Card key={info.title} className="border-[#e2d7c8] bg-white/90">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#efe5d7]">
                        <info.icon className="h-5 w-5 text-[#9a7a54]" />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.25em] text-[#9a7a54]">{info.title}</p>
                        <p className="mt-2 text-sm font-semibold text-[#2e2a25]">{info.value}</p>
                        <p className="text-xs text-[#6b6056]">{info.subtitle}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-[#e2d7c8] bg-white/90">
              <CardContent className="pt-6">
                <p className="text-[11px] uppercase tracking-[0.35em] text-[#9a7a54]">Proceso simple</p>
                <ul className="mt-4 space-y-3 text-sm text-[#6b6056]">
                  <li className="flex items-start gap-2">
                    <ArrowRight className="mt-0.5 h-4 w-4 text-[#9a7a54]" />
                    Envia medidas y fotos del espacio.
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="mt-0.5 h-4 w-4 text-[#9a7a54]" />
                    Recibe propuesta con acabados y precio.
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="mt-0.5 h-4 w-4 text-[#9a7a54]" />
                    Coordinamos corte, entrega y colocacion.
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card className="border-[#e2d7c8] bg-white/95 shadow-[0_25px_70px_-55px_rgba(34,29,24,0.6)]">
            <CardContent className="pt-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-xs uppercase tracking-[0.25em] text-[#9a7a54]">
                      Nombre completo
                    </Label>
                    <Input
                      id="name"
                      placeholder="Tu nombre"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs uppercase tracking-[0.25em] text-[#9a7a54]">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-xs uppercase tracking-[0.25em] text-[#9a7a54]">
                    Telefono
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+52 555 000 0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message" className="text-xs uppercase tracking-[0.25em] text-[#9a7a54]">
                    Mensaje
                  </Label>
                  <Textarea
                    id="message"
                    placeholder="Cuentanos sobre tu proyecto, metraje y acabado..."
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full rounded-none bg-[#9a7a54] text-xs uppercase tracking-[0.35em] text-white hover:bg-[#8b6c49]"
                >
                  Enviar solicitud
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
