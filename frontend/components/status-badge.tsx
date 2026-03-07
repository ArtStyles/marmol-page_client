import { Badge } from '@/components/ui/badge'

type Status = 'pending' | 'completed' | 'cancelled' | 'active' | 'inactive'

interface StatusBadgeProps {
  status: Status
}

const statusConfig: Record<Status, { label: string; className: string }> = {
  pending: {
    label: 'Pendiente',
    className: 'bg-amber-100 text-amber-800 hover:bg-amber-100'
  },
  completed: {
    label: 'Completado',
    className: 'bg-green-100 text-green-800 hover:bg-green-100'
  },
  cancelled: {
    label: 'Cancelado',
    className: 'bg-red-100 text-red-800 hover:bg-red-100'
  },
  active: {
    label: 'Activo',
    className: 'bg-green-100 text-green-800 hover:bg-green-100'
  },
  inactive: {
    label: 'Inactivo',
    className: 'bg-gray-100 text-gray-800 hover:bg-gray-100'
  }
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status]
  
  return (
    <Badge variant="secondary" className={config.className}>
      {config.label}
    </Badge>
  )
}
