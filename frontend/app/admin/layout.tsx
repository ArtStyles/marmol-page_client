'use client'

import React from "react"
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/admin/admin-button'
import { AdminWorkshopSelector } from '@/components/admin/workshop-selector'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  ADMIN_STORAGE_KEY,
  ADMIN_TOKEN_STORAGE_KEY,
  MOCK_ADMIN_USERS,
  getAccessForRole,
  isPathAllowed,
  type AdminUser,
} from '@/lib/admin-auth'
import {
  WORKSHOP_STORAGE_KEY,
  type WorkshopCreateInput,
  type WorkshopTenant,
} from '@/lib/workshops'
import {
  createWorkshop,
  deleteWorkshop,
  getWorkshops,
  loginAdmin,
  updateWorkshop,
} from '@/lib/admin-api'
import { setStoredAccessToken } from '@/lib/api-client'

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
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<string | null>(null)
  const [workshops, setWorkshops] = useState<WorkshopTenant[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY)
    const token = window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY)
    const storedWorkshop = window.localStorage.getItem(WORKSHOP_STORAGE_KEY)
    if (raw) {
      try {
        if (!token) {
          window.localStorage.removeItem(ADMIN_STORAGE_KEY)
        } else {
          const parsed = JSON.parse(raw) as AdminUser
          setAuthUser(parsed)
          if (parsed.role === 'Super Admin') {
            setSelectedWorkshopId(storedWorkshop ?? null)
          } else {
            setSelectedWorkshopId(parsed.workshopId ?? null)
          }
        }
      } catch {
        window.localStorage.removeItem(ADMIN_STORAGE_KEY)
        window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY)
      }
    }
    if (storedWorkshop) setSelectedWorkshopId(storedWorkshop)
    setIsReady(true)
  }, [])

  useEffect(() => {
    if (!authUser) return
    let active = true
    const load = async () => {
      try {
        const items = await getWorkshops()
        if (!active) return
        setWorkshops(items)
      } catch {
        if (!active) return
        setWorkshops([])
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [authUser])

  const access = useMemo(() => (authUser ? getAccessForRole(authUser.role) : null), [authUser])

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      setError('')
      setIsSubmitting(true)
      const result = await loginAdmin({
        email: email.trim(),
        password,
      })

      const user = result.user
      const isSuperAdmin = user.role === 'Super Admin'
      setStoredAccessToken(result.accessToken)
      setAuthUser(user)
      setSelectedWorkshopId(isSuperAdmin ? null : user.workshopId)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(user))
        if (isSuperAdmin) {
          window.localStorage.removeItem(WORKSHOP_STORAGE_KEY)
        } else {
          window.localStorage.setItem(WORKSHOP_STORAGE_KEY, user.workshopId)
        }
      }
      const nextAccess = getAccessForRole(user.role)
      if (!isPathAllowed(pathname, nextAccess)) {
        router.replace(nextAccess.home)
      }
    } catch {
      setError('Credenciales invalidas o backend no disponible.')
      setAuthUser(null)
      setStoredAccessToken(null)
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(ADMIN_STORAGE_KEY)
      }
      return
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLogout = () => {
    setAuthUser(null)
    setSelectedWorkshopId(null)
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(ADMIN_STORAGE_KEY)
      window.localStorage.removeItem(WORKSHOP_STORAGE_KEY)
      window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY)
    }
    setStoredAccessToken(null)
  }

  const handleSelectWorkshop = (workshopId: string) => {
    setSelectedWorkshopId(workshopId)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(WORKSHOP_STORAGE_KEY, workshopId)
    }
  }

  const handleCreateWorkshop = async (input: WorkshopCreateInput) => {
    try {
      const newWorkshop = await createWorkshop(input)
      setWorkshops((prev) => [newWorkshop, ...prev])
      handleSelectWorkshop(newWorkshop.id)
    } catch {
      setError('No se pudo crear el taller en el backend.')
    }
  }

  const handleToggleWorkshopStatus = async (workshopId: string) => {
    const current = workshops.find((workshop) => workshop.id === workshopId)
    if (!current) return
    const nextStatus = current.estado === 'activo' ? 'pausado' : 'activo'
    try {
      const updated = await updateWorkshop(workshopId, { estado: nextStatus })
      if (!updated) return
      setWorkshops((prev) =>
        prev.map((workshop) => (workshop.id === workshopId ? updated : workshop)),
      )
    } catch {
      setError('No se pudo actualizar el estado del taller.')
    }
  }

  const handleDeleteWorkshop = async (workshopId: string) => {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm('Deseas eliminar este taller? Esta accion no se puede deshacer.')
      if (!confirmed) return
    }
    try {
      await deleteWorkshop(workshopId)
      setWorkshops((prev) => prev.filter((workshop) => workshop.id !== workshopId))
    } catch {
      setError('No se pudo eliminar el taller en el backend.')
      return
    }

    if (selectedWorkshopId === workshopId) {
      const fallbackWorkshopId =
        authUser?.role === 'Super Admin' ? null : (authUser?.workshopId ?? null)
      setSelectedWorkshopId(fallbackWorkshopId)
      if (typeof window !== 'undefined') {
        if (fallbackWorkshopId) {
          window.localStorage.setItem(WORKSHOP_STORAGE_KEY, fallbackWorkshopId)
        } else {
          window.localStorage.removeItem(WORKSHOP_STORAGE_KEY)
        }
      }
    }
  }

  useEffect(() => {
    if (!authUser) return
    if (authUser.role !== 'Super Admin' && !selectedWorkshopId && authUser.workshopId) {
      handleSelectWorkshop(authUser.workshopId)
    }
  }, [authUser, selectedWorkshopId])

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
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Ingresando...' : 'Ingresar'}
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
  const needsWorkshopSelection =
    authUser.role === 'Super Admin' && !selectedWorkshopId

  return (
    <div className="min-h-screen bg-background">
      <main className="min-h-screen">
        {needsWorkshopSelection ? (
          <AdminWorkshopSelector
            user={authUser}
            workshops={workshops}
            onSelect={handleSelectWorkshop}
            onCreate={handleCreateWorkshop}
            onToggleStatus={handleToggleWorkshopStatus}
            onDelete={handleDeleteWorkshop}
            onLogout={handleLogout}
          />
        ) : (
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
        )}
      </main>
    </div>
  )
}

