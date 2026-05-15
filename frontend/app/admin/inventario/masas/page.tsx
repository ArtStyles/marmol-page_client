'use client'

import dynamic from 'next/dynamic'

const InventarioMasasPageClient = dynamic(
  () => import('../feature/containers/inventario-masas-page'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-background p-6 text-sm text-muted-foreground">
        Cargando inventario de masas...
      </div>
    ),
  },
)

export default function InventarioMasasPage() {
  return <InventarioMasasPageClient />
}
