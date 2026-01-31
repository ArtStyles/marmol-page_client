'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Building, Bell, Shield, Palette } from 'lucide-react'
import { acciones, dimensiones } from '@/lib/data'
import type { AccionLosa, Dimension } from '@/lib/types'
import { useConfiguracion } from '@/hooks/use-configuracion'

export default function ConfiguracionPage() {
  const { config, setConfig, saveConfig } = useConfiguracion()
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    sessionTimeout: true
  })

  const handleSave = () => {
    saveConfig()
    alert('Configuración guardada correctamente')
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl font-bold text-foreground">
          Configuración
        </h1>
        <p className="mt-1 text-muted-foreground">
          Administra la configuración del sistema
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Company Info */}
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              <CardTitle>Información de la Empresa</CardTitle>
            </div>
            <CardDescription>
              Datos básicos de tu negocio
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nombre de la Empresa</Label>
              <Input
                id="companyName"
                value={config.nombreEmpresa}
                onChange={(e) => setConfig({ ...config, nombreEmpresa: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email de Contacto</Label>
              <Input
                id="email"
                type="email"
                value={config.email}
                onChange={(e) => setConfig({ ...config, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={config.telefono}
                onChange={(e) => setConfig({ ...config, telefono: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Textarea
                id="address"
                value={config.direccion}
                onChange={(e) => setConfig({ ...config, direccion: e.target.value })}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle>Notificaciones</CardTitle>
            </div>
            <CardDescription>
              Configura las alertas del sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Notificaciones por Email</p>
                <p className="text-sm text-muted-foreground">
                  Recibe alertas importantes en tu correo
                </p>
              </div>
              <Switch
                checked={config.notificacionesEmail}
                onCheckedChange={(checked) => 
                  setConfig({ ...config, notificacionesEmail: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Alertas de Stock Bajo</p>
                <p className="text-sm text-muted-foreground">
                  Aviso cuando el inventario este bajo
                </p>
              </div>
              <Switch
                checked={config.alertasStockBajo}
                onCheckedChange={(checked) => 
                  setConfig({ ...config, alertasStockBajo: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Reportes de Ventas</p>
                <p className="text-sm text-muted-foreground">
                  Resumen semanal de ventas
                </p>
              </div>
              <Switch
                checked={config.reportesVentas}
                onCheckedChange={(checked) => 
                  setConfig({ ...config, reportesVentas: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Tarifas y Precios */}
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              <CardTitle>Tarifas y Precios</CardTitle>
            </div>
            <CardDescription>
              Ajusta pagos por acción y precios por m2 segAún dimensión
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <h4 className="font-medium">Pagos por acción (por losa)</h4>
              <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
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
              <h4 className="font-medium">Precio por m2 según dimensión</h4>
              <div className="space-y-4">
                {dimensiones.map((dimension) => (
                  <div key={dimension} className="rounded-lg border border-border/60 p-4">
                    <p className="font-medium mb-3">{dimension} cm</p>
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

        {/* Security */}
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Seguridad</CardTitle>
            </div>
            <CardDescription>
              Opciones de seguridad de la cuenta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Autenticación de Dos Factores</p>
                <p className="text-sm text-muted-foreground">
                  AA?ade una capa extra de seguridad
                </p>
              </div>
              <Switch
                checked={securitySettings.twoFactorAuth}
                onCheckedChange={(checked) => 
                  setSecuritySettings({ ...securitySettings, twoFactorAuth: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Cierre de SesiA3n AutomA?tico</p>
                <p className="text-sm text-muted-foreground">
                  Cerrar sesión tras 30 min de inactividad
                </p>
              </div>
              <Switch
                checked={securitySettings.sessionTimeout}
                onCheckedChange={(checked) => 
                  setSecuritySettings({ ...securitySettings, sessionTimeout: checked })
                }
              />
            </div>
            <Button variant="outline" className="w-full bg-transparent">
              Cambiar ContraseA?a
            </Button>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <CardTitle>Apariencia</CardTitle>
            </div>
            <CardDescription>
              Personaliza la interfaz
            </CardDescription>
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
                  EspaA?ol
                </Button>
                <Button variant="outline" className="flex-1 bg-transparent">
                  English
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button size="lg" onClick={handleSave}>
          Guardar Cambios
        </Button>
      </div>
    </div>
  )
}

