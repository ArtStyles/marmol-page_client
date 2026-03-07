'use client'

import Image from 'next/image'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { CatalogoItem } from '@/lib/types'
import { ArrowUpRight } from 'lucide-react'

interface ProductCardProps {
  product: CatalogoItem
  onViewDetails?: (product: CatalogoItem) => void
}

export function ProductCard({ product, onViewDetails }: ProductCardProps) {
  return (
    <Card className="group overflow-hidden border-border/50 bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <Image
          src={product.imagen || "/placeholder.svg"}
          alt={product.nombre}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <Badge
          className="absolute top-3 right-3 bg-primary text-primary-foreground"
        >
          {product.tipo}
        </Badge>
        <Badge
          variant={product.acabado === 'Pulido' ? 'default' : 'secondary'}
          className="absolute top-3 left-3"
        >
          {product.acabado}
        </Badge>
      </div>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-serif text-lg font-semibold text-foreground">
            {product.nombre}
          </h3>
          <span className="rounded-full bg-secondary px-2 py-1 text-xs text-muted-foreground">
            {product.stockLosas} losas
          </span>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {product.dimension} cm
          </span>
          <span className="font-serif text-xl font-bold text-primary">
            ${product.precioM2}
            <span className="text-xs font-normal text-muted-foreground">/m2</span>
          </span>
        </div>
      </CardContent>
      <CardFooter className="p-5 pt-0">
        <Button
          type="button"
          className="w-full"
          onClick={() => onViewDetails?.(product)}
        >
          Ver detalles
          <ArrowUpRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  )
}
