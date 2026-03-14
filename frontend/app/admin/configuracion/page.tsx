'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/admin/admin-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { AdminShell, AdminPanelCard } from '@/components/admin/admin-shell'
import { Building, Bell, Shield, Palette } from 'lucide-react'
import { acciones, dimensiones } from '@/lib/data'
import type { AccionLosa, Dimension, RolConSalarioFijo } from '@/lib/types'
import { useConfiguracion } from '@/hooks/use-configuracion'

export default function ConfiguracionPage() {
  const { config, setConfig, saveConfig, loading, error } = useConfiguracion()
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    sessionTimeout: true,
  })

  const handleSave = async () => {
    const ok = await saveConfig()
    if (ok) {
      alert('Configuracion guardada correctamente')
    }
  }

  const updateTarifa = (accion: AccionLosa, value: number) => {
    setConfig({
      ...config,
      tarifasGlobales: {
        ...config.tarifasGlobales,
        [accion]: value,
      },
    })
  }

  const updatePrecioM2 = (dimension: Dimension, tipo: 'crudo' | 'pulido', value: number) => {
    setConfig({
      ...config,
      preciosM2: {
        ...config.preciosM2,
        [dimension]: {
          ...config.preciosM2[dimension],
          [tipo]: value,
        },
      },
    })
  }

  const updateSalarioFijo = (rol: RolConSalarioFijo, value: number) => {
    setConfig({
      ...config,
      salariosFijosPorRol: {
        ...config.salariosFijosPorRol,
        [rol]: value,
      },
    })
  }

  const rightPanel = (
    <div className="space-y-4">
      <AdminPanelCard title="Resumen sistema" meta="Configuracion">
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>Empresa</span>
            <span className="font-semibold">{config.nombreEmpresa}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Email</span>
            <span className="font-semibold">{config.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Alertas stock</span>
            <span className="font-semibold">{config.alertasStockBajo ? 'Activo' : 'Inactivo'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Reportes ventas</span>
            <span className="font-semibold">{config.reportesVentas ? 'Activo' : 'Inactivo'}</span>
          </div>
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Tarifas base" meta="Por losa">
        <div className="space-y-2 text-sm text-slate-700">
          {acciones.map((accion) => (
            <div key={accion} className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2">
              <span className="capitalize">{accion}</span>
              <span className="font-semibold">${config.tarifasGlobales[accion as AccionLosa]}</span>
            </div>
          ))}
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Salarios fijos" meta="Por rol">
        <div className="space-y-2 text-sm text-slate-700">
          {Object.entries(config.salariosFijosPorRol).map(([rol, salario]) => (
            <div key={rol} className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2">
              <span>{rol}</span>
              <span className="font-semibold">${salario.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </AdminPanelCard>
    </div>
  )

  return (
    <AdminShell rightPanel={rightPanel}>
      <div className="space-y-8">
        <div>
          <h1 className="font-sans text-3xl font-bold text-foreground">Configuracion</h1>
          <p className="mt-1 font-sans text-muted-foreground">Administra la configuracion del sistema</p>
          {loading ? <p className="mt-2 text-sm text-slate-500">Cargando configuracion...</p> : null}
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-[24px] border border-[var(--dash-border)] bg-[var(--dash-card)] shadow-[var(--dash-shadow)] backdrop-blur-xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building className="h-5 w-5 text-primary" />
                <CardTitle>Informacion de la empresa</CardTitle>
              </div>
              <CardDescription>Datos basicos de tu negocio</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Nombre de la empresa</Label>
                <Input
                  id="companyName"
                  value={config.nombreEmpresa}
                  onChange={(e) => setConfig({ ...config, nombreEmpresa: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email de contacto</Label>
                <Input
                  id="email"
                  type="email"
                  value={config.email}
                  onChange={(e) => setConfig({ ...config, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefono</Label>
                <Input
                  id="phone"
                  value={config.telefono}
                  onChange={(e) => setConfig({ ...config, telefono: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Direccion</Label>
                <Textarea
                  id="address"
                  value={config.direccion}
                  onChange={(e) => setConfig({ ...config, direccion: e.target.value })}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[24px] border border-[var(--dash-border)] bg-[var(--dash-card)] shadow-[var(--dash-shadow)] backdrop-blur-xl">
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
                  <p className="font-medium">Notificaciones por email</p>
                  <p className="text-sm text-muted-foreground">Recibe alertas importantes en tu correo</p>
                </div>
                <Switch
                  checked={config.notificacionesEmail}
                  onCheckedChange={(checked) => setConfig({ ...config, notificacionesEmail: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Alertas de stock bajo</p>
                  <p className="text-sm text-muted-foreground">Aviso cuando el inventario este bajo</p>
                </div>
                <Switch
                  checked={config.alertasStockBajo}
                  onCheckedChange={(checked) => setConfig({ ...config, alertasStockBajo: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Reportes de ventas</p>
                  <p className="text-sm text-muted-foreground">Resumen semanal de ventas</p>
                </div>
                <Switch
                  checked={config.reportesVentas}
                  onCheckedChange={(checked) => setConfig({ ...config, reportesVentas: checked })}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[24px] border border-[var(--dash-border)] bg-[var(--dash-card)] shadow-[var(--dash-shadow)] backdrop-blur-xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building className="h-5 w-5 text-primary" />
                <CardTitle>Tarifas y precios</CardTitle>
              </div>
              <CardDescription>Ajusta pagos por accion y precios por m2 segun dimension</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <h4 className="font-medium">Pagos por accion (por losa)</h4>
                <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 md:pb-0">
                  {acciones.map((accion) => (
                    <div key={accion} className="space-y-2">
                      <Label className="capitalize">{accion}</Label>
                      <Input
                        type="number"
                        min="0"
                        value={config.tarifasGlobales[accion as AccionLosa]}
                        onChange={(e) => updateTarifa(accion as AccionLosa, Number(e.target.value))}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Salarios fijos por rol</h4>
                <p className="text-xs text-muted-foreground">
                  Solo aplica para roles administrativos. Obrero se paga por produccion.
                </p>
                <div className="space-y-3">
                  {Object.entries(config.salariosFijosPorRol).map(([rol, salario]) => (
                    <div key={rol} className="rounded-lg border border-border/60 p-4">
                      <Label className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">{rol}</Label>
                      <Input
                        type="number"
                        min="0"
                        value={salario}
                        onChange={(e) => updateSalarioFijo(rol as RolConSalarioFijo, Number(e.target.value))}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Precio por m2 segun dimension</h4>
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
                            value={config.preciosM2[dimension as Dimension].crudo}
                            onChange={(e) => updatePrecioM2(dimension as Dimension, 'crudo', Number(e.target.value))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Pulido</Label>
                          <Input
                            type="number"
                            min="0"
                            value={config.preciosM2[dimension as Dimension].pulido}
                            onChange={(e) => updatePrecioM2(dimension as Dimension, 'pulido', Number(e.target.value))}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[24px] border border-[var(--dash-border)] bg-[var(--dash-card)] shadow-[var(--dash-shadow)] backdrop-blur-xl">
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
                  <p className="font-medium">Autenticacion de dos factores</p>
                  <p className="text-sm text-muted-foreground">Anade una capa extra de seguridad</p>
                </div>
                <Switch
                  checked={securitySettings.twoFactorAuth}
                  onCheckedChange={(checked) => setSecuritySettings({ ...securitySettings, twoFactorAuth: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Cierre de sesion automatico</p>
                  <p className="text-sm text-muted-foreground">Cerrar sesion tras 30 min de inactividad</p>
                </div>
                <Switch
                  checked={securitySettings.sessionTimeout}
                  onCheckedChange={(checked) => setSecuritySettings({ ...securitySettings, sessionTimeout: checked })}
                />
              </div>
              <Button variant="outline" className="w-full bg-transparent">
                Cambiar contrasena
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-[24px] border border-[var(--dash-border)] bg-[var(--dash-card)] shadow-[var(--dash-shadow)] backdrop-blur-xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                <CardTitle>Apariencia</CardTitle>
              </div>
              <CardDescription>Personaliza la interfaz</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tema</Label>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 bg-transparent">
                    Claro
                  </Button>
                  <Button variant="outline" className="flex-1 bg-transparent">
                    Oscuro
                  </Button>
                  <Button variant="default" className="flex-1">
                    Sistema
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Idioma</Label>
                <div className="flex gap-2">
                  <Button variant="default" className="flex-1">
                    Espanol
                  </Button>
                  <Button variant="outline" className="flex-1 bg-transparent">
                    English
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button size="lg" onClick={handleSave}>
            Guardar cambios
          </Button>
        </div>
      </div>
    </AdminShell>
  )
}
