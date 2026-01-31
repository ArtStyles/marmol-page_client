'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Inicio', href: '/' },
  { label: 'Catálogo', href: '/catalogo' },
  { label: 'Nosotros', href: '/nosotros' },
  { label: 'Contacto', href: '/contacto' },
]

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-colors duration-300',
        isScrolled
          ? 'border-b border-border/60 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/70'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <nav className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className={cn('h-8 w-8 rounded-full', isScrolled ? 'bg-primary' : 'bg-transparent')} />
          <span
            className={cn(
              'font-serif text-xl font-bold transition-colors',
              isScrolled ? 'text-foreground' : 'text-black',
            )}
          >
            Mármoles Elegance
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'text-sm font-medium transition-colors',
                isScrolled ? 'text-muted-foreground hover:text-foreground' : 'text-black/80 hover:text-gray-500',
              )}
            >
              {item.label}
            </Link>
          ))}
          <Link href="/admin">
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'transition-colors',
                isScrolled
                  ? 'border-border text-foreground hover:bg-accent'
                  : 'border-black/60 bg-transparent text-black hover:border-black hover:bg-white/15',
              )}
            >
              Panel Admin
            </Button>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn('md:hidden', isScrolled ? 'text-foreground' : 'text-black hover:text-black')}
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? 'Cerrar menu' : 'Abrir menu'}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </nav>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="border-t border-border/50 bg-background md:hidden">
          <div className="container mx-auto flex flex-col gap-4 px-4 py-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link href="/admin" onClick={() => setIsOpen(false)}>
              <Button variant="outline" size="sm" className="w-full bg-transparent">
                Panel Admin
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
