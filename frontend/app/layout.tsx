import React from "react"
import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Mármoles Elegance | Losas de Mármol Premium',
  description: 'Descubre nuestra exclusiva colección de losas de mármol italiano y español. Calidad premium para proyectos de lujo.',
  keywords: ['mármol', 'losas', 'carrara', 'calacatta', 'diseño interior', 'construcción'],
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className="font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
