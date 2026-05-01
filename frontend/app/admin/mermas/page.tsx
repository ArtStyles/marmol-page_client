'use client'

import dynamic from 'next/dynamic'

const MermasPageClient = dynamic(
  () => import('./feature/containers/mermas-page'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-background p-6 text-sm text-muted-foreground">
        Cargando mermas...
      </div>
    ),
  },
)

export default function MermasPage() {
  return <MermasPageClient />
}


