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
import {
  ADMIN_STORAGE_KEY,
  ADMIN_TOKEN_STORAGE_KEY,
  getAccessForRole,
  isPathAllowed,
  type AdminUser,
} from '@/lib/admin-auth'
import {
  extractWorkshopIdFromAdminPath,
  normalizeAdminPath,
  routeWithWorkshop,
} from '@/lib/admin-routes'
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
  const workshopIdFromPath = useMemo(() => extractWorkshopIdFromAdminPath(pathname), [pathname])

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
      const targetPath = routeWithWorkshop(nextAccess.home, isSuperAdmin ? null : user.workshopId)
      if (!isPathAllowed(pathname, nextAccess)) {
        router.replace(targetPath)
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
    if (authUser?.role === 'Super Admin') {
      router.replace(routeWithWorkshop('/admin', workshopId))
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
    if (authUser.role === 'Super Admin') return

    if (selectedWorkshopId !== authUser.workshopId) {
      setSelectedWorkshopId(authUser.workshopId)
    }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(WORKSHOP_STORAGE_KEY, authUser.workshopId)
    }
  }, [authUser, selectedWorkshopId])

  useEffect(() => {
    if (!authUser || authUser.role !== 'Super Admin') return
    if (selectedWorkshopId) return
    if (!workshopIdFromPath) return
    setSelectedWorkshopId(workshopIdFromPath)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(WORKSHOP_STORAGE_KEY, workshopIdFromPath)
    }
  }, [authUser, selectedWorkshopId, workshopIdFromPath])

  useEffect(() => {
    if (!authUser) return
    const scopedWorkshopId =
      authUser.role === 'Super Admin' ? selectedWorkshopId : authUser.workshopId
    if (!scopedWorkshopId) return

    const normalizedPath = normalizeAdminPath(pathname)
    const scopedPath = routeWithWorkshop(normalizedPath, scopedWorkshopId)
    if (scopedPath !== pathname) {
      router.replace(scopedPath)
    }
  }, [authUser, pathname, router, selectedWorkshopId])

  if (!isReady) {
    return <div className="min-h-screen bg-background" />
  }

  if (!authUser) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(140deg,#f4f7fb_0%,#e7eef8_42%,#f5efe5_100%)]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-[#d8e8ff]/70 blur-3xl" />
          <div className="absolute right-0 top-16 h-64 w-64 rounded-full bg-[#ffe5c7]/60 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-[#d8f3e8]/55 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(255,255,255,0.75),transparent_42%),radial-gradient(circle_at_75%_0%,rgba(255,255,255,0.48),transparent_48%)]" />
        </div>

        <div className="relative mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-6 py-10 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="hidden lg:block">
            <div className="max-w-xl space-y-6">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Marble Control Hub</p>
              <h1 className="font-serif text-5xl leading-tight text-slate-900">
                Gestion operativa de talleres en un solo panel.
              </h1>
              <p className="max-w-lg text-base text-slate-600">
                Supervisa inventario, produccion, ventas y equipos con trazabilidad por taller y
                acceso por rol.
              </p>
            </div>
          </section>

          <Card className="w-full border-slate-200/80 bg-white/75 shadow-[0_30px_80px_-42px_rgba(15,23,42,0.45)] backdrop-blur-xl">
            <CardHeader className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Acceso administrativo</p>
              <CardTitle className="font-serif text-3xl text-slate-900">Iniciar sesion</CardTitle>
              <CardDescription className="text-slate-600">
                Ingresa tus credenciales para abrir el panel de gestion.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-700">Correo</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="usuario@empresa.com"
                    className="h-11 border-slate-200 bg-white/85"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-700">Contrasena</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="********"
                    className="h-11 border-slate-200 bg-white/85"
                    required
                  />
                </div>
                {error && (
                  <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {error}
                  </p>
                )}
                <Button
                  type="submit"
                  className="h-11 w-full bg-slate-900 text-white hover:bg-slate-800"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Ingresando...' : 'Entrar al panel'}
                </Button>
              </form>

              <Button asChild variant="ghost" className="w-full text-slate-700 hover:bg-slate-100/70">
                <Link href="/">Volver al sitio</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
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
                    <Link
                      href={routeWithWorkshop(
                        access.home,
                        authUser.role === 'Super Admin' ? selectedWorkshopId : authUser.workshopId,
                      )}
                    >
                      Ir a tu panel
                    </Link>
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

