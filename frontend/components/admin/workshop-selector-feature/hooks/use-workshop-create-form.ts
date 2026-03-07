'use client'

import { useState } from 'react'
import type { WorkshopCreateInput } from '@/lib/workshops'
import { EMPTY_WORKSHOP_INPUT } from '../model/constants'

type UseWorkshopCreateFormResult = {
  isDialogOpen: boolean
  setIsDialogOpen: (value: boolean) => void
  formData: WorkshopCreateInput
  updateField: <K extends keyof WorkshopCreateInput>(field: K, value: WorkshopCreateInput[K]) => void
  handleSubmit: (event: React.FormEvent) => void
}

const createInitialInput = (): WorkshopCreateInput => ({ ...EMPTY_WORKSHOP_INPUT })

export const useWorkshopCreateForm = (
  onCreate: (input: WorkshopCreateInput) => void,
): UseWorkshopCreateFormResult => {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState<WorkshopCreateInput>(createInitialInput)

  const updateField = <K extends keyof WorkshopCreateInput>(field: K, value: WorkshopCreateInput[K]) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    onCreate(formData)
    setIsDialogOpen(false)
    setFormData(createInitialInput())
  }

  return {
    isDialogOpen,
    setIsDialogOpen,
    formData,
    updateField,
    handleSubmit,
  }
}
