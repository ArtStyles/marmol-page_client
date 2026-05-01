'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/admin/admin-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { AdminShell, AdminPanelCard } from '@/components/admin/admin-shell'
import { Bell, Building, Shield, Tags } from 'lucide-react'
import { acciones, dimensiones } from '@/lib/data'
import type { AccionLosa, ConfiguracionSistema, Dimension, RolConSalarioFijo } from '@/lib/types'
import { useConfiguracion } from '@/hooks/use-configuracion'

type ConfigTab = 'empresa' | 'notificaciones' | 'tarifas' | 'seguridad'

type EmpresaDraft = Pick<ConfiguracionSistema, 'nombreEmpresa' | 'email' | 'telefono' | 'direccion'>
type NotificacionesDraft = Pick<ConfiguracionSistema, 'notificacionesEmail' | 'alertasStockBajo' | 'reportesVentas'>
type TarifasDraft = Pick<ConfiguracionSistema, 'tarifasGlobales' | 'salariosFijosPorRol' | 'preciosM2' | 'monoHiloGrosorDiscoMm' | 'monoHiloEspesorLosaCm'>

type SecuritySettings = {
  twoFactorAuth: boolean
  sessionTimeout: boolean
}

type SalarioEditable = {
  rol: RolConSalarioFijo
  etiqueta: string
  salario: number
}

const ROLE_LABEL_OVERRIDES: Record<string, string> = {
  'Jefe de Almacen': 'Jefe de Almacén',
  'Jefe de Turno de Produccion': 'Jefe de Turno de Producción',
  'Jefe de Turno de Producción': 'Jefe de Turno de Producción',
  'Jefe de Turno de ProducciÃ³n': 'Jefe de Turno de Producción',
}

const initialSecuritySettings: SecuritySettings = {
  twoFactorAuth: false,
  sessionTimeout: true,
}

const createEmpresaDraft = (value: ConfiguracionSistema): EmpresaDraft => ({
  nombreEmpresa: value.nombreEmpresa,
  email: value.email,
  telefono: value.telefono,
  direccion: value.direccion,
})

const createNotificacionesDraft = (value: ConfiguracionSistema): NotificacionesDraft => ({
  notificacionesEmail: value.notificacionesEmail,
  alertasStockBajo: value.alertasStockBajo,
  reportesVentas: value.reportesVentas,
})

const createTarifasDraft = (value: ConfiguracionSistema): TarifasDraft => ({
  tarifasGlobales: { ...value.tarifasGlobales },
  salariosFijosPorRol: { ...value.salariosFijosPorRol },
  preciosM2: {
    '40x40': { ...value.preciosM2['40x40'] },
    '60x40': { ...value.preciosM2['60x40'] },
    '80x40': { ...value.preciosM2['80x40'] },
    '160x60': { ...value.preciosM2['160x60'] },
    '160x65': { ...value.preciosM2['160x65'] },
  },
  monoHiloGrosorDiscoMm: value.monoHiloGrosorDiscoMm,
  monoHiloEspesorLosaCm: value.monoHiloEspesorLosaCm,
})

const getRoleLabel = (role: string) => ROLE_LABEL_OVERRIDES[role] ?? role

const buildSalariosEditables = (salarios: Record<RolConSalarioFijo, number>): SalarioEditable[] => {
  const byLabel = new Map<string, SalarioEditable>()

  for (const [rol, salario] of Object.entries(salarios) as Array<[RolConSalarioFijo, number]>) {
    const etiqueta = getRoleLabel(rol)
    const existing = byLabel.get(etiqueta)
    if (!existing || existing.salario === 0) {
      byLabel.set(etiqueta, { rol, etiqueta, salario })
    }
  }

  return Array.from(byLabel.values())
}

export default function ConfiguracionPage() {
  const { config, saveConfig, loading, error } = useConfiguracion()
  const [activeTab, setActiveTab] = useState<ConfigTab>('empresa')
  const [empresaDraft, setEmpresaDraft] = useState<EmpresaDraft>(() => createEmpresaDraft(config))
  const [notificacionesDraft, setNotificacionesDraft] = useState<NotificacionesDraft>(() => createNotificacionesDraft(config))
  const [tarifasDraft, setTarifasDraft] = useState<TarifasDraft>(() => createTarifasDraft(config))
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(initialSecuritySettings)

  useEffect(() => {
    setEmpresaDraft(createEmpresaDraft(config))
    setNotificacionesDraft(createNotificacionesDraft(config))
    setTarifasDraft(createTarifasDraft(config))
  }, [config])

  const salariosResumen = useMemo(
    () => buildSalariosEditables(config.salariosFijosPorRol),
    [config.salariosFijosPorRol],
  )

  const salariosEditablesTarifas = useMemo(
    () => buildSalariosEditables(tarifasDraft.salariosFijosPorRol),
    [tarifasDraft.salariosFijosPorRol],
  )

  const saveWithFeedback = async (nextConfig: ConfiguracionSistema, successMessage: string) => {
    const ok = await saveConfig(nextConfig)
    if (ok) {
      alert(successMessage)
    }
  }

  const handleSaveEmpresa = async () => {
    await saveWithFeedback(
      {
        ...config,
        ...empresaDraft,
      },
      'Información de la empresa guardada correctamente.',
    )
  }

  const handleSaveNotificaciones = async () => {
    await saveWithFeedback(
      {
        ...config,
        ...notificacionesDraft,
      },
      'Notificaciones guardadas correctamente.',
    )
  }

  const handleSaveTarifas = async () => {
    await saveWithFeedback(
      {
        ...config,
        ...tarifasDraft,
      },
      'Tarifas y precios guardados correctamente.',
    )
  }

  const handleSaveSeguridad = () => {
    alert('Preferencias de seguridad guardadas para esta sesión.')
  }

  const updateTarifa = (accion: AccionLosa, value: number) => {
    setTarifasDraft((prev) => ({
      ...prev,
      tarifasGlobales: {
        ...prev.tarifasGlobales,
        [accion]: value,
      },
    }))
  }

  const updatePrecioM2 = (dimension: Dimension, tipo: 'crudo' | 'pulido', value: number) => {
    setTarifasDraft((prev) => ({
      ...prev,
      preciosM2: {
        ...prev.preciosM2,
        [dimension]: {
          ...prev.preciosM2[dimension],
          [tipo]: value,
        },
      },
    }))
  }

  const updateSalarioFijo = (rol: RolConSalarioFijo, value: number) => {
    setTarifasDraft((prev) => {
      const etiquetaObjetivo = getRoleLabel(rol)
      const salariosFijosPorRol = { ...prev.salariosFijosPorRol }

      for (const currentRole of Object.keys(salariosFijosPorRol) as RolConSalarioFijo[]) {
        if (getRoleLabel(currentRole) === etiquetaObjetivo) {
          salariosFijosPorRol[currentRole] = value
        }
      }

      return {
        ...prev,
        salariosFijosPorRol,
      }
    })
  }

  const rightPanel = (
    <div className="space-y-4">
      <AdminPanelCard title="Resumen del sistema" meta="Configuración">
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-start justify-between gap-3">
            <span className="min-w-0">Empresa</span>
            <span className="min-w-0 max-w-[60%] break-words text-right font-semibold leading-tight">{config.nombreEmpresa}</span>
          </div>
          <div className="flex items-start justify-between gap-3">
            <span className="min-w-0">Correo</span>
            <span className="min-w-0 max-w-[60%] break-words text-right font-semibold leading-tight">{config.email}</span>
          </div>
          <div className="flex items-start justify-between gap-3">
            <span className="min-w-0">Alertas de stock</span>
            <span className="min-w-0 max-w-[60%] break-words text-right font-semibold leading-tight">
              {config.alertasStockBajo ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <div className="flex items-start justify-between gap-3">
            <span className="min-w-0">Reportes de ventas</span>
            <span className="min-w-0 max-w-[60%] break-words text-right font-semibold leading-tight">
              {config.reportesVentas ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Tarifas base" meta="Por losa">
        <div className="space-y-2 text-sm text-slate-700">
          {acciones.map((accion) => (
            <div key={accion} className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2">
              <span className="capitalize">{accion}</span>
              <span className="font-semibold">${config.tarifasGlobales[accion as AccionLosa]}</span>
            </div>
          ))}
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Salarios fijos" meta="Por rol">
        <div className="space-y-2 text-sm text-slate-700">
          {salariosResumen.map((item) => (
            <div key={item.etiqueta} className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2">
              <span>{item.etiqueta}</span>
              <span className="font-semibold">${item.salario.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Mono hilo" meta="Tecnico">
        <div className="space-y-2 text-sm text-slate-700">
          <div className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2">
            <span>Disco</span>
            <span className="font-semibold">{config.monoHiloGrosorDiscoMm} mm</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2">
            <span>Espesor losa</span>
            <span className="font-semibold">{config.monoHiloEspesorLosaCm} cm</span>
          </div>
        </div>
      </AdminPanelCard>
    </div>
  )

  return (
    <AdminShell rightPanel={rightPanel}>
      <div className="space-y-8">
        <div>
          <h1 className="font-sans text-3xl font-bold text-foreground">Configuración</h1>
          <p className="mt-1 font-sans text-muted-foreground">Administra la configuración del sistema</p>
          {loading ? <p className="mt-2 text-sm text-slate-500">Cargando configuración...</p> : null}
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ConfigTab)} className="space-y-4">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-xl border border-[var(--dash-border)] bg-[var(--dash-card)] p-2">
            <TabsTrigger value="empresa" className="h-10 flex-none rounded-xl px-4">
              Empresa
            </TabsTrigger>
            <TabsTrigger value="notificaciones" className="h-10 flex-none rounded-xl px-4">
              Notificaciones
            </TabsTrigger>
            <TabsTrigger value="tarifas" className="h-10 flex-none rounded-xl px-4">
              Tarifas y precios
            </TabsTrigger>
            <TabsTrigger value="seguridad" className="h-10 flex-none rounded-xl px-4">
              Seguridad
            </TabsTrigger>
          </TabsList>

          <TabsContent value="empresa">
            <Card className="rounded-[var(--agent-radius-panel)] border border-[var(--dash-border)] bg-[var(--dash-card)] shadow-[var(--dash-shadow)] backdrop-blur-xl">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-primary" />
                  <CardTitle>Información de la empresa</CardTitle>
                </div>
                <CardDescription>Datos básicos de tu negocio</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nombre de la empresa</Label>
                  <Input
                    id="companyName"
                    value={empresaDraft.nombreEmpresa}
                    onChange={(e) => setEmpresaDraft((prev) => ({ ...prev, nombreEmpresa: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Correo de contacto</Label>
                  <Input
                    id="email"
                    type="email"
                    value={empresaDraft.email}
                    onChange={(e) => setEmpresaDraft((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={empresaDraft.telefono}
                    onChange={(e) => setEmpresaDraft((prev) => ({ ...prev, telefono: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Textarea
                    id="address"
                    value={empresaDraft.direccion}
                    onChange={(e) => setEmpresaDraft((prev) => ({ ...prev, direccion: e.target.value }))}
                    rows={2}
                  />
                </div>
                <div className="flex justify-end">
                  <Button size="lg" onClick={handleSaveEmpresa} disabled={loading}>
                    Guardar información de la empresa
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notificaciones">
            <Card className="rounded-[var(--agent-radius-panel)] border border-[var(--dash-border)] bg-[var(--dash-card)] shadow-[var(--dash-shadow)] backdrop-blur-xl">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  <CardTitle>Notificaciones</CardTitle>
                </div>
                <CardDescription>Configura las alertas del sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Notificaciones por correo</p>
                    <p className="text-sm text-muted-foreground">Recibe alertas importantes en tu correo</p>
                  </div>
                  <Switch
                    checked={notificacionesDraft.notificacionesEmail}
                    onCheckedChange={(checked) =>
                      setNotificacionesDraft((prev) => ({ ...prev, notificacionesEmail: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Alertas de stock bajo</p>
                    <p className="text-sm text-muted-foreground">Aviso cuando el inventario esté bajo</p>
                  </div>
                  <Switch
                    checked={notificacionesDraft.alertasStockBajo}
                    onCheckedChange={(checked) =>
                      setNotificacionesDraft((prev) => ({ ...prev, alertasStockBajo: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Reportes de ventas</p>
                    <p className="text-sm text-muted-foreground">Resumen semanal de ventas</p>
                  </div>
                  <Switch
                    checked={notificacionesDraft.reportesVentas}
                    onCheckedChange={(checked) =>
                      setNotificacionesDraft((prev) => ({ ...prev, reportesVentas: checked }))
                    }
                  />
                </div>
                <div className="flex justify-end">
                  <Button size="lg" onClick={handleSaveNotificaciones} disabled={loading}>
                    Guardar notificaciones
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tarifas">
            <Card className="rounded-[var(--agent-radius-panel)] border border-[var(--dash-border)] bg-[var(--dash-card)] shadow-[var(--dash-shadow)] backdrop-blur-xl">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Tags className="h-5 w-5 text-primary" />
                  <CardTitle>Tarifas y precios</CardTitle>
                </div>
                <CardDescription>Ajusta pagos por acción y precios por m² según dimensión</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <h4 className="font-medium">Pagos por acción (por losa)</h4>
                  <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 md:pb-0">
                    {acciones.map((accion) => (
                      <div key={accion} className="space-y-2">
                        <Label className="capitalize">{accion}</Label>
                        <Input
                          type="number"
                          min="0"
                          value={tarifasDraft.tarifasGlobales[accion as AccionLosa]}
                          onChange={(e) => updateTarifa(accion as AccionLosa, Number(e.target.value))}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Salarios fijos por rol</h4>
                  <p className="text-xs text-muted-foreground">
                    Solo aplica para roles administrativos. Obrero se paga por producción.
                  </p>
                  <div className="space-y-3">
                    {salariosEditablesTarifas.map((item) => (
                      <div key={item.etiqueta} className="rounded-lg border border-border/60 p-4">
                        <Label className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">
                          {item.etiqueta}
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          value={item.salario}
                          onChange={(e) => updateSalarioFijo(item.rol, Number(e.target.value))}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Precio por m² según dimensión</h4>
                  <div className="space-y-4">
                    {dimensiones.map((dimension) => (
                      <div key={dimension} className="rounded-lg border border-border/60 p-4">
                        <p className="mb-3 font-medium">{dimension} cm</p>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Crudo</Label>
                            <Input
                              type="number"
                              min="0"
                              value={tarifasDraft.preciosM2[dimension as Dimension].crudo}
                              onChange={(e) => updatePrecioM2(dimension as Dimension, 'crudo', Number(e.target.value))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Pulido</Label>
                            <Input
                              type="number"
                              min="0"
                              value={tarifasDraft.preciosM2[dimension as Dimension].pulido}
                              onChange={(e) => updatePrecioM2(dimension as Dimension, 'pulido', Number(e.target.value))}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Parametros tecnicos de mono hilo</h4>
                  <p className="text-xs text-muted-foreground">
                    Estos valores se aplican automaticamente al registrar masas desde produccion.
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Grosor de disco (mm)</Label>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={tarifasDraft.monoHiloGrosorDiscoMm}
                        onChange={(e) =>
                          setTarifasDraft((prev) => ({
                            ...prev,
                            monoHiloGrosorDiscoMm: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Espesor de losa (cm)</Label>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={tarifasDraft.monoHiloEspesorLosaCm}
                        onChange={(e) =>
                          setTarifasDraft((prev) => ({
                            ...prev,
                            monoHiloEspesorLosaCm: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button size="lg" onClick={handleSaveTarifas} disabled={loading}>
                    Guardar tarifas y precios
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seguridad">
            <Card className="rounded-[var(--agent-radius-panel)] border border-[var(--dash-border)] bg-[var(--dash-card)] shadow-[var(--dash-shadow)] backdrop-blur-xl">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <CardTitle>Seguridad</CardTitle>
                </div>
                <CardDescription>Opciones de seguridad de la cuenta</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Autenticación de dos factores</p>
                    <p className="text-sm text-muted-foreground">Añade una capa extra de seguridad</p>
                  </div>
                  <Switch
                    checked={securitySettings.twoFactorAuth}
                    onCheckedChange={(checked) => setSecuritySettings({ ...securitySettings, twoFactorAuth: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Cierre de sesión automático</p>
                    <p className="text-sm text-muted-foreground">Cerrar sesión tras 30 min de inactividad</p>
                  </div>
                  <Switch
                    checked={securitySettings.sessionTimeout}
                    onCheckedChange={(checked) => setSecuritySettings({ ...securitySettings, sessionTimeout: checked })}
                  />
                </div>
                <Button variant="outline" className="w-full bg-transparent">
                  Cambiar contraseña
                </Button>
                <div className="flex justify-end">
                  <Button size="lg" onClick={handleSaveSeguridad}>
                    Guardar seguridad
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminShell>
  )
}

