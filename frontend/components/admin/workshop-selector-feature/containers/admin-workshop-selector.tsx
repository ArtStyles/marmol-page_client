'use client'

import { useMemo } from 'react'
import { CreateWorkshopDialog } from '../components/create-workshop-dialog'
import { WorkshopCard } from '../components/workshop-card'
import { WorkshopSelectorHeader } from '../components/workshop-selector-header'
import { useWorkshopCreateForm } from '../hooks/use-workshop-create-form'
import { sortWorkshops } from '../lib/utils'
import { backgroundStyle } from '../model/constants'
import { type AdminWorkshopSelectorProps } from '../model/types'

export const AdminWorkshopSelector = ({
  user,
  workshops,
  onSelect,
  onCreate,
  onToggleStatus,
  onDelete,
  onLogout,
}: AdminWorkshopSelectorProps) => {
  const sortedWorkshops = useMemo(() => sortWorkshops(workshops), [workshops])
  const { isDialogOpen, setIsDialogOpen, formData, updateField, handleSubmit } = useWorkshopCreateForm(onCreate)

  return (
    <div className="relative min-h-screen overflow-hidden p-6" style={backgroundStyle}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 right-8 h-56 w-56 rounded-full bg-[#dbe7ff] opacity-70 blur-3xl" />
        <div className="absolute -bottom-24 left-[-40px] h-72 w-72 rounded-full bg-[#f6e7d2] opacity-70 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.7),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.5),transparent_50%)]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6">
        <WorkshopSelectorHeader user={user} onLogout={onLogout} />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sortedWorkshops.map((workshop) => (
            <WorkshopCard
              key={workshop.id}
              workshop={workshop}
              onSelect={onSelect}
              onToggleStatus={onToggleStatus}
              onDelete={onDelete}
            />
          ))}

          <CreateWorkshopDialog
            isOpen={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            formData={formData}
            onFieldChange={updateField}
            onSubmit={handleSubmit}
          />
        </div>
      </div>
    </div>
  )
}
