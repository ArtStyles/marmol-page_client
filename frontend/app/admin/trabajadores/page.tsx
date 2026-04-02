'use client'

import dynamic from 'next/dynamic'

const TrabajadoresPageClient = dynamic(
  () => import('./feature/containers/trabajadores-page'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-background p-6 text-sm text-muted-foreground">
        Cargando trabajadores...
      </div>
    ),
  },
)

export default function TrabajadoresPage() {
  return <TrabajadoresPageClient />
}

