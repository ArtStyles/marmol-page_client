'use client'

import React from "react"
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/admin/admin-button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  ADMIN_STORAGE_KEY,
  MOCK_ADMIN_USERS,
  getAccessForRole,
  getUserByCredentials,
  isPathAllowed,
  type AdminUser,
} from '@/lib/admin-auth'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [authUser, setAuthUser] = useState<AdminUser | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY)
    if (raw) {
      try {
        setAuthUser(JSON.parse(raw) as AdminUser)
      } catch {
        window.localStorage.removeItem(ADMIN_STORAGE_KEY)
      }
    }
    setIsReady(true)
  }, [])

  const access = useMemo(() => (authUser ? getAccessForRole(authUser.role) : null), [authUser])

  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault()
    const user = getUserByCredentials(email.trim(), password)
    if (!user) {
      setError('Credenciales invalidas. Revisa el correo y la contrasena.')
      return
    }
    setError('')
    setAuthUser(user)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(user))
    }
    const nextAccess = getAccessForRole(user.role)
    if (!isPathAllowed(pathname, nextAccess)) {
      router.replace(nextAccess.home)
    }
  }

  if (!isReady) {
    return <div className="min-h-screen bg-background" />
  }

  if (!authUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md border-border/60 bg-card shadow-sm">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">Acceso al panel</CardTitle>
            <CardDescription>
              Inicia sesion para entrar al panel administrativo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="usuario@marmol.local"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contrasena</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="********"
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full">
                Ingresar
              </Button>
            </form>

            <div className="rounded-lg border border-border/60 bg-muted/40 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                Credenciales demo
              </p>
              <div className="mt-3 space-y-3">
                {MOCK_ADMIN_USERS.map((entry) => (
                  <div key={entry.email} className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">{entry.user.name}</p>
                        <p className="text-xs text-muted-foreground">{entry.user.email}</p>
                      </div>
                      <Badge variant="outline">{entry.user.role}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Contrasena: {entry.password}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEmail(entry.user.email)
                          setPassword(entry.password)
                        }}
                      >
                        Usar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button asChild variant="ghost" className="w-full">
              <Link href="/">Volver al sitio</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isAllowed = access ? isPathAllowed(pathname, access) : false

  return (
    <div className="min-h-screen bg-background">
      <main className="min-h-screen  ">
        <div className="">
          {isAllowed ? (
            children
          ) : (
            <div className="bg-card p-6">
              <p className="text-sm font-semibold text-foreground">Sin acceso a esta seccion.</p>
              {access && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Tu rol ({access.label}) solo puede gestionar su area asignada.
                </p>
              )}
              {access && (
                <Button asChild className="mt-4">
                  <Link href={access.home}>Ir a tu panel</Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

