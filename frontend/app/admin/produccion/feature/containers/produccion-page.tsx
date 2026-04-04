'use client'

import { useEffect, useState } from 'react'
import { AdminShell } from '@/components/admin/admin-shell'
import { Button } from '@/components/admin/admin-button'
import { Input } from '@/components/ui/input'
import { ADMIN_STORAGE_KEY, hasPermission, type AdminUser } from '@/lib/admin-auth'
import { Search } from 'lucide-react'
import { useProduccionPageState } from '../hooks/use-produccion-page-state'
import { ProduccionCreateDialog } from '../components/create-dialog/produccion-create-dialog'
import { ProduccionRightPanel } from '../components/produccion-right-panel'
import { ProduccionRegistrosList } from '../components/produccion-registros-list'

export default function ProduccionPage() {
  const {
    addUsage,
    almacenApprovalLoadingById,
    approvalError,
    approveProduccionAlmacenRegistro,
    approveProduccionTallerRegistro,
    dependenciesError,
    dateEditPolicy,
    dateFilter,
    equiposActivos,
    fechaResumen,
    fechasOrdenadas,
    formData,
    formError,
    getLosasDisponiblesParaAccion,
    getDatePolicy,
    groupedByDate,
    handleSubmit,
    isDialogOpen,
    loadingDependencies,
    origenesActivosByAccion,
    origenesActivosResumen,
    prepareNewForm,
    removeUsage,
    resetFormAndClose,
    resumenAcciones,
    resumenPartidas,
    searchTerm,
    setDateFilter,
    setFormData,
    setIsDialogOpen,
    setSearchTerm,
    tallerApprovalLoadingById,
    topOrigenesResumen,
    today,
    totalLosasResumen,
    totalM2Resumen,
    toggleUsageDimension,
    trabajadoresActivos,
    updateUsage,
    updateUsageDimension,
  } = useProduccionPageState()

  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY)
    if (!raw) return
    try {
      setCurrentUser(JSON.parse(raw) as AdminUser)
    } catch {
      window.localStorage.removeItem(ADMIN_STORAGE_KEY)
    }
  }, [])

  const canApproveTaller = currentUser ? hasPermission(currentUser, 'produccion:approve_taller') : false
  const canApproveAlmacen = currentUser ? hasPermission(currentUser, 'inventario:approve') : false

  const rightPanel = (
    <ProduccionRightPanel
      fechaResumen={fechaResumen}
      origenesActivosResumen={origenesActivosResumen}
      resumenAcciones={resumenAcciones}
      resumenPartidas={resumenPartidas}
      topOrigenesResumen={topOrigenesResumen}
      totalLosasResumen={totalLosasResumen}
      totalM2Resumen={totalM2Resumen}
    />
  )

  return (
    <AdminShell rightPanel={rightPanel}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground font-sans">Produccion diaria</h1>
            <p className="mt-1 text-muted-foreground font-sans">
              Registra produccion en uno o varios envios por fecha. Cada subfila permite bloque/lote, tipo y dimension independientes.
            </p>
            {dependenciesError ? <p className="mt-2 text-sm text-destructive">{dependenciesError}</p> : null}
            {loadingDependencies ? (
              <p className="mt-2 text-sm text-slate-500">Cargando catalogos de produccion...</p>
            ) : null}
            {approvalError ? <p className="mt-2 text-sm text-destructive">{approvalError}</p> : null}
          </div>
          <ProduccionCreateDialog
            addUsage={addUsage}
            dateEditPolicy={dateEditPolicy}
            equiposActivos={equiposActivos}
            formData={formData}
            formError={formError}
            getLosasDisponiblesParaAccion={getLosasDisponiblesParaAccion}
            handleSubmit={handleSubmit}
          isDialogOpen={isDialogOpen}
            origenesActivosByAccion={origenesActivosByAccion}
            prepareNewForm={prepareNewForm}
            removeUsage={removeUsage}
            resetFormAndClose={resetFormAndClose}
            setFormData={setFormData}
            setIsDialogOpen={setIsDialogOpen}
            toggleUsageDimension={toggleUsageDimension}
            today={today}
            trabajadoresActivos={trabajadoresActivos}
            updateUsage={updateUsage}
            updateUsageDimension={updateUsageDimension}
          />
        </div>

        <div className="rounded-[24px] border border-white/60 bg-white/70 p-4 shadow-[var(--dash-shadow)] backdrop-blur-xl">
          <div className="grid gap-3 sm:grid-cols-[minmax(260px,1fr)_220px_auto] sm:items-end">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Buscar</p>
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por fecha, origen, tipo o dimension..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Filtrar fecha</p>
              <Input
                type="date"
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
              />
            </div>

            <div>
              <Button
                type="button"
                variant="outline"
                className="bg-transparent"
                onClick={() => setDateFilter('')}
                disabled={!dateFilter}
              >
                Limpiar fecha
              </Button>
            </div>
          </div>
        </div>

        <ProduccionRegistrosList
          canApproveAlmacen={canApproveAlmacen}
          canApproveTaller={canApproveTaller}
          fechasOrdenadas={fechasOrdenadas}
          groupedByDate={groupedByDate}
          getDatePolicy={getDatePolicy}
          onApproveAlmacen={approveProduccionAlmacenRegistro}
          onApproveTaller={approveProduccionTallerRegistro}
          almacenApprovalLoadingById={almacenApprovalLoadingById}
          tallerApprovalLoadingById={tallerApprovalLoadingById}
        />
      </div>
    </AdminShell>
  )
}
