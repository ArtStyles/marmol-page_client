'use client'

import dynamic from 'next/dynamic'

const InventarioPageClient = dynamic(
  () => import('./feature/containers/inventario-page'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-background p-6 text-sm text-muted-foreground">
        Cargando inventario...
      </div>
    ),
  },
)

export default function InventarioPage() {
  return <InventarioPageClient />
}


