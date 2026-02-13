'use client'

import { useEffect, useMemo, useState } from 'react'
import { AdminPanelCard, AdminShell } from '@/components/admin/admin-shell'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ADMIN_STORAGE_KEY, type AdminUser } from '@/lib/admin-auth'
import { historialPagos, produccionTrabajadores, trabajadores } from '@/lib/data'
import { losasAMetros, type AccionLosa, type ProduccionTrabajador, type Trabajador } from '@/lib/types'
import { cn } from '@/lib/utils'
import { CircleDollarSign, Hammer, Hourglass, Wallet } from 'lucide-react'

const actionOrder: AccionLosa[] = ['picar', 'pulir', 'escuadrar']

const actionColors: Record<AccionLosa, string> = {
  picar: 'bg-blue-100 text-blue-800',
  pulir: 'bg-green-100 text-green-800',
  escuadrar: 'bg-amber-100 text-amber-800',
}

function sortByDateDesc<T extends { fecha: string }>(items: T[]) {
  return [...items].sort((a, b) => b.fecha.localeCompare(a.fecha))
}

export default function ObreroPage() {
  const [sessionUser, setSessionUser] = useState<AdminUser | null>(null)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY)
    if (!raw) {
      setSessionReady(true)
      return
    }
    try {
      setSessionUser(JSON.parse(raw) as AdminUser)
    } catch {
      window.localStorage.removeItem(ADMIN_STORAGE_KEY)
    } finally {
      setSessionReady(true)
    }
  }, [])

  const isObreroSession = sessionUser?.role === 'Obrero'

  const obreroActual = useMemo<Trabajador | null>(() => {
    if (!sessionUser || !isObreroSession) return null
    const obreros = trabajadores.filter((worker) => worker.rol === 'Obrero')
    if (obreros.length === 0) return null
    return obreros.find((worker) => worker.email.toLowerCase() === sessionUser.email.toLowerCase()) ?? null
  }, [isObreroSession, sessionUser])

  const produccionObrero = useMemo<ProduccionTrabajador[]>(() => {
    if (!obreroActual) return []
    return sortByDateDesc(
      produccionTrabajadores.filter((item) => item.trabajadorId === obreroActual.id),
    )
  }, [obreroActual])

  const produccionPendiente = produccionObrero.filter((item) => !item.pagado)

  const historialObrero = useMemo(() => {
    if (!obreroActual) return []
    return sortByDateDesc(historialPagos.filter((item) => item.trabajadorId === obreroActual.id))
  }, [obreroActual])

  const totalPendienteBase = produccionPendiente.reduce((sum, item) => sum + item.pagoTotal, 0)
  const totalPendienteBonos = produccionPendiente.reduce((sum, item) => sum + item.bono, 0)
  const totalPendiente = totalPendienteBase + totalPendienteBonos
  const totalCobrado = historialObrero.reduce((sum, item) => sum + item.totalPagado, 0)

  const totalLosasTrabajadas = produccionObrero.reduce((sum, item) => sum + item.cantidadLosas, 0)
  const totalM2Trabajados = produccionObrero.reduce(
    (sum, item) => sum + losasAMetros(item.cantidadLosas, item.dimension),
    0,
  )
  const m2Pendiente = produccionPendiente.reduce(
    (sum, item) => sum + losasAMetros(item.cantidadLosas, item.dimension),
    0,
  )

  const resumenAccionesPendientes = produccionPendiente.reduce<
    Record<AccionLosa, { losas: number; total: number }>
  >(
    (acc, item) => {
      acc[item.accion].losas += item.cantidadLosas
      acc[item.accion].total += item.pagoFinal
      return acc
    },
    {
      picar: { losas: 0, total: 0 },
      pulir: { losas: 0, total: 0 },
      escuadrar: { losas: 0, total: 0 },
    },
  )

  const pendientesByDate = produccionPendiente.reduce<Record<string, ProduccionTrabajador[]>>(
    (acc, item) => {
      if (!acc[item.fecha]) {
        acc[item.fecha] = []
      }
      acc[item.fecha].push(item)
      return acc
    },
    {},
  )
  const fechasPendientes = Object.keys(pendientesByDate).sort((a, b) => b.localeCompare(a))

  const rightPanel = (
    <div className="space-y-4">
      <AdminPanelCard title="Estado de cobro" meta="Obrero">
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>Pendiente</span>
            <span className="font-semibold text-emerald-700">${totalPendiente.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Registros sin pago</span>
            <span className="font-semibold">{produccionPendiente.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>M2 pendientes</span>
            <span className="font-semibold">{m2Pendiente.toFixed(2)} m2</span>
          </div>
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Pendiente por accion" meta="Produccion actual">
        <div className="space-y-2 text-sm text-slate-700">
          {actionOrder.map((accion) => (
            <div key={accion} className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2">
              <span className="capitalize">{accion}</span>
              <span className="font-semibold">
                {resumenAccionesPendientes[accion].losas} losas
              </span>
            </div>
          ))}
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Historico" meta={`${historialObrero.length} pagos`}>
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>Total cobrado</span>
            <span className="font-semibold">${totalCobrado.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Losas trabajadas</span>
            <span className="font-semibold">{totalLosasTrabajadas}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>M2 trabajados</span>
            <span className="font-semibold">{totalM2Trabajados.toFixed(2)} m2</span>
          </div>
        </div>
      </AdminPanelCard>
    </div>
  )

  if (!sessionReady) {
    return (
      <AdminShell rightPanel={rightPanel}>
        <div className="rounded-[24px] border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          Cargando panel de obrero...
        </div>
      </AdminShell>
    )
  }

  if (!isObreroSession) {
    return (
      <AdminShell rightPanel={rightPanel}>
        <div className="rounded-[24px] border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          Esta vista solo esta disponible para usuarios con rol obrero.
        </div>
      </AdminShell>
    )
  }

  if (!obreroActual) {
    return (
      <AdminShell rightPanel={rightPanel}>
        <div className="rounded-[24px] border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          No se encontro un perfil de obrero vinculado a este usuario.
        </div>
      </AdminShell>
    )
  }

  return (
    <AdminShell rightPanel={rightPanel}>
      <div className="space-y-6">
        <div className="rounded-[24px] border border-white/60 bg-white/70 p-5 shadow-[var(--dash-shadow)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Mi panel</p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900">{obreroActual.nombre}</h1>
              <p className="mt-1 text-sm text-slate-600">
                Aqui puedes ver tu produccion pendiente de pago y el historico de pagos realizados.
              </p>
            </div>
            <Badge className="w-fit border-emerald-200/70 bg-emerald-50 text-emerald-700">
              {obreroActual.estado}
            </Badge>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[20px] border border-slate-200/70 bg-white/80 p-4 shadow-[0_16px_30px_-30px_rgba(15,23,42,0.35)]">
            <div className="flex items-center gap-2 text-slate-500">
              <Hourglass className="h-4 w-4" />
              <p className="text-[10px] uppercase tracking-[0.24em]">Pendiente</p>
            </div>
            <p className="mt-2 text-2xl font-semibold text-emerald-700">${totalPendiente.toLocaleString()}</p>
          </div>
          <div className="rounded-[20px] border border-slate-200/70 bg-white/80 p-4 shadow-[0_16px_30px_-30px_rgba(15,23,42,0.35)]">
            <div className="flex items-center gap-2 text-slate-500">
              <Hammer className="h-4 w-4" />
              <p className="text-[10px] uppercase tracking-[0.24em]">Sin pagar</p>
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{produccionPendiente.length} registros</p>
          </div>
          <div className="rounded-[20px] border border-slate-200/70 bg-white/80 p-4 shadow-[0_16px_30px_-30px_rgba(15,23,42,0.35)]">
            <div className="flex items-center gap-2 text-slate-500">
              <CircleDollarSign className="h-4 w-4" />
              <p className="text-[10px] uppercase tracking-[0.24em]">Bonos pendientes</p>
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900">${totalPendienteBonos.toLocaleString()}</p>
          </div>
          <div className="rounded-[20px] border border-slate-200/70 bg-white/80 p-4 shadow-[0_16px_30px_-30px_rgba(15,23,42,0.35)]">
            <div className="flex items-center gap-2 text-slate-500">
              <Wallet className="h-4 w-4" />
              <p className="text-[10px] uppercase tracking-[0.24em]">Total cobrado</p>
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900">${totalCobrado.toLocaleString()}</p>
          </div>
        </div>

        <Card className="bg-transparent border-none outline-none shadow-none p-0">
          <CardContent className="p-0">
            <div className="space-y-2">
              <div className="rounded-[20px] border border-slate-200/70 bg-white/80 px-4 py-3 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.3)]">
                <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">
                  Produccion pendiente de pago
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Desglose de lo que ya trabajaste y aun no se ha liquidado.
                </p>
              </div>

              {fechasPendientes.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                  No tienes produccion pendiente de pago.
                </div>
              ) : (
                fechasPendientes.map((fecha) => {
                  const registros = pendientesByDate[fecha]
                  const totalFecha = registros.reduce((sum, item) => sum + item.pagoFinal, 0)

                  return (
                    <div
                      key={fecha}
                      className="overflow-hidden rounded-[20px] border border-slate-200/70 bg-white/80 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.3)] backdrop-blur-xl"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200/70 px-4 py-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Fecha</p>
                          <p className="text-sm font-semibold text-slate-900">{fecha}</p>
                        </div>
                        <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/70 px-2.5 py-1 text-right text-emerald-700">
                          <p className="text-[10px] uppercase tracking-[0.2em]">Pendiente</p>
                          <p className="text-sm font-semibold">${totalFecha.toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="hidden lg:grid lg:grid-cols-[minmax(0,1.4fr)_110px_90px_120px_100px_120px] border-b border-slate-200/70 bg-slate-50/70 px-4 py-2">
                        <span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Origen</span>
                        <span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Accion</span>
                        <span className="text-[10px] uppercase tracking-[0.28em] text-right text-slate-500">Losas</span>
                        <span className="text-[10px] uppercase tracking-[0.28em] text-right text-slate-500">Base</span>
                        <span className="text-[10px] uppercase tracking-[0.28em] text-right text-slate-500">Bono</span>
                        <span className="text-[10px] uppercase tracking-[0.28em] text-right text-slate-500">Total</span>
                      </div>

                      <div className="divide-y divide-slate-200/60">
                        {registros.map((item) => (
                          <div key={item.id} className="px-4 py-3">
                            <div className="grid gap-2 lg:grid-cols-[minmax(0,1.4fr)_110px_90px_120px_100px_120px] lg:items-center">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{item.origenNombre}</p>
                                <p className="text-[11px] text-slate-500">
                                  {item.tipo} / {item.dimension}
                                </p>
                              </div>
                              <div>
                                <Badge className={cn('capitalize', actionColors[item.accion])}>
                                  {item.accion}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between text-sm lg:block lg:text-right">
                                <span className="text-[10px] uppercase tracking-[0.24em] text-slate-500 lg:hidden">Losas</span>
                                <span className="font-semibold text-slate-900">{item.cantidadLosas}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm lg:block lg:text-right">
                                <span className="text-[10px] uppercase tracking-[0.24em] text-slate-500 lg:hidden">Base</span>
                                <span className="font-semibold text-slate-900">${item.pagoTotal.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm lg:block lg:text-right">
                                <span className="text-[10px] uppercase tracking-[0.24em] text-slate-500 lg:hidden">Bono</span>
                                <span className={cn('font-semibold', item.bono > 0 ? 'text-emerald-700' : 'text-slate-500')}>
                                  {item.bono > 0 ? `+$${item.bono.toLocaleString()}` : '-'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm lg:block lg:text-right">
                                <span className="text-[10px] uppercase tracking-[0.24em] text-slate-500 lg:hidden">Total</span>
                                <span className="font-semibold text-emerald-700">${item.pagoFinal.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-transparent border-none outline-none shadow-none p-0">
          <CardContent className="p-0">
            <div className="space-y-2">
              <div className="rounded-[20px] border border-slate-200/70 bg-white/80 px-4 py-3 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.3)]">
                <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Historico de pagos</p>
                <p className="mt-1 text-sm text-slate-600">
                  Constancia de los pagos registrados a tu nombre.
                </p>
              </div>

              {historialObrero.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                  Aun no hay pagos registrados para este obrero.
                </div>
              ) : (
                <div className="divide-y divide-slate-200/60 overflow-hidden rounded-[20px] border border-slate-200/70 bg-white/80 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.3)] backdrop-blur-xl">
                  {historialObrero.map((pago) => (
                    <div key={pago.id} className="px-4 py-3">
                      <div className="grid gap-2 lg:grid-cols-[120px_120px_120px_minmax(0,1fr)] lg:items-center">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">ID</p>
                          <p className="text-sm font-semibold text-slate-900">{pago.id}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Fecha</p>
                          <p className="text-sm font-semibold text-slate-900">{pago.fecha}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Total</p>
                          <p className="text-sm font-semibold text-emerald-700">${pago.totalPagado.toLocaleString()}</p>
                        </div>
                        <div className="text-sm text-slate-600">
                          {pago.produccionIds.length > 0
                            ? `${pago.produccionIds.length} registros incluidos`
                            : 'Sin produccion asociada'}
                          {pago.observaciones ? ` | ${pago.observaciones}` : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  )
}


