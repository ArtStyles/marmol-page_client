import Link from 'next/link'
import { Mail, Phone, MapPin } from 'lucide-react'

const quickLinks = [
  { label: 'Catálogo', href: '/catalogo' },
  { label: 'Nosotros', href: '/nosotros' },
  { label: 'Proyectos', href: '/proyectos' },
  { label: 'Blog', href: '/blog' },
]

const serviceLinks = [
  { label: 'Instalación', href: '/servicios/instalacion' },
  { label: 'Asesoría', href: '/servicios/asesoria' },
  { label: 'Mantenimiento', href: '/servicios/mantenimiento' },
  { label: 'Garantía', href: '/servicios/garantia' },
]

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-secondary">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary" />
              <span className="font-serif text-lg font-bold text-foreground">
                Mármoles Elegance
              </span>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Más de 25 años ofreciendo las mejores losas de mármol para proyectos exclusivos.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-foreground">Enlaces Rápidos</h4>
            <ul className="mt-4 space-y-2">
              {quickLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground">Servicios</h4>
            <ul className="mt-4 space-y-2">
              {serviceLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground">Contacto</h4>
            <ul className="mt-4 space-y-3">
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                +52 555 123 4567
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                info@marmoleselegance.com
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4" />
                Av. Principal 123, Col. Centro
              </li>
              <li>
                <Link
                  href="/contacto"
                  className="text-sm font-semibold text-foreground underline-offset-4 hover:underline"
                >
                  Ir a contacto
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border/50 pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Mármoles Elegance. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}
