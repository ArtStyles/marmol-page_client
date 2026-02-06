'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { catalogoItems } from '@/lib/catalogo-data'
import type { CatalogoItem } from '@/lib/types'

const whatsappNumber = '5354789597'

const featuredItems = catalogoItems.filter((item) => item.destacado).slice(0, 3)

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value)

export function QuickCart() {
  const [cart, setCart] = useState<Record<string, number>>({})

  const itemsById = useMemo(
    () => Object.fromEntries(catalogoItems.map((item) => [item.id, item])),
    [],
  )

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .filter(([, m2]) => m2 > 0)
      .map(([id, m2]) => {
        const item = itemsById[id]
        return {
          item,
          m2,
          subtotal: item ? item.precioM2 * m2 : 0,
        }
      })
      .filter(
        (entry): entry is { item: CatalogoItem; m2: number; subtotal: number } =>
          Boolean(entry.item),
      )
  }, [cart, itemsById])

  const total = useMemo(
    () => cartItems.reduce((sum, entry) => sum + entry.subtotal, 0),
    [cartItems],
  )

  const addToCart = (id: string) => {
    setCart((prev) => ({
      ...prev,
      [id]: Math.max(1, Math.round((prev[id] ?? 0) + 5)),
    }))
  }

  const updateM2 = (id: string, value: string) => {
    const parsed = Number.parseFloat(value)
    setCart((prev) => ({
      ...prev,
      [id]: Number.isFinite(parsed) && parsed > 0 ? parsed : 0,
    }))
  }

  const removeItem = (id: string) => {
    setCart((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const handleCheckout = () => {
    if (cartItems.length === 0) return
    const messageLines = [
      'Compra desde el sitio',
      ...cartItems.map(
        ({ item, m2, subtotal }) =>
          `${item.nombre} | ${m2} m2 x $${item.precioM2}/m2 = $${subtotal.toFixed(0)}`,
      ),
      `Total estimado: $${total.toFixed(0)}`,
    ]
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(messageLines.join('\n'))}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-[24px] border border-black/5 bg-white/90 p-6 shadow-[0_20px_60px_-55px_rgba(44,32,20,0.45)]">
        <p className="text-[11px] uppercase tracking-[0.45em] text-[#8a7056]">Seleccion</p>
        <h3 className="mt-3 text-lg font-semibold text-[#2b241f]">Piezas destacadas</h3>
        <p className="mt-2 text-sm text-[#5f554c]">
          Agrega m2 estimados y completa la compra por WhatsApp.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {featuredItems.map((item) => (
            <div
              key={item.id}
              className="flex flex-col overflow-hidden rounded-[20px] border border-black/5 bg-[#f7f4ef] shadow-[0_18px_40px_-35px_rgba(44,32,20,0.35)]"
            >
              <div className="relative aspect-[4/3]">
                <Image src={item.imagen} alt={item.nombre} fill className="object-cover" />
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <p className="text-sm font-semibold text-[#2b241f]">{item.nombre}</p>
                <p className="text-[11px] uppercase tracking-[0.3em] text-[#8a7056]">
                  {item.acabado} · {item.dimension} cm
                </p>
                <div className="mt-auto flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#2b241f]">
                    ${item.precioM2}/m2
                  </span>
                  <button
                    type="button"
                    onClick={() => addToCart(item.id)}
                    aria-label={`Agregar ${item.nombre} al carrito`}
                    title="Agregar"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-base font-semibold text-[#2b241f] transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[24px] border border-black/5 bg-white/80 p-6">
        <div className="flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.45em] text-[#8a7056]">Carrito</p>
          <span className="text-xs uppercase tracking-[0.3em] text-[#8a7056]">
            {cartItems.length} items
          </span>
        </div>

        <div className="mt-4 space-y-4">
          {cartItems.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-black/10 bg-[#f7f4ef] p-4 text-sm text-[#6b5f55]">
              Aun no agregas piezas. Selecciona una y agrega los m2 estimados.
            </p>
          ) : (
            cartItems.map(({ item, m2, subtotal }) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/5 bg-white/90 p-4"
              >
                <div>
                  <p className="text-sm font-semibold text-[#2b241f]">{item.nombre}</p>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-[#8a7056]">
                    {item.acabado} · {item.dimension} cm
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-2">
                    <span className="text-[10px] uppercase tracking-[0.3em] text-[#8a7056]">
                      m2
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={m2}
                      onChange={(event) => updateM2(item.id, event.target.value)}
                      className="w-16 bg-transparent text-sm text-[#2b241f] focus:outline-none"
                    />
                  </div>
                  <span className="text-sm font-semibold text-[#2b241f]">
                    ${subtotal.toFixed(0)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="text-[10px] uppercase tracking-[0.3em] text-[#8a7056] transition hover:text-[#2b241f]"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-[#8a7056]">Total estimado</p>
            <p className="text-lg font-semibold text-[#2b241f]">{formatCurrency(total)}</p>
          </div>
          <button
            type="button"
            disabled={cartItems.length === 0}
            onClick={handleCheckout}
            className="rounded-full bg-[#2b241f] px-6 py-3 text-xs uppercase tracking-[0.3em] text-white transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:bg-[#a3988d]"
          >
            Comprar por WhatsApp
          </button>
        </div>
      </div>
    </div>
  )
}
