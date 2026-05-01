import * as React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type AdminButtonProps = React.ComponentProps<typeof Button> & {
  tone?: 'default' | 'danger'
}

const baseClasses =
  'rounded-[var(--agent-radius-control)] border !border-[var(--agent-border)] !bg-[var(--agent-surface-strong)] !text-slate-900 !shadow-[0_12px_28px_-22px_rgba(15,23,42,0.22)] backdrop-blur-sm transition'
const hoverClasses = 'hover:!border-[var(--agent-border-strong)] hover:!bg-white/95'
const dangerClasses =
  '!border-red-200/80 !bg-red-50/90 !text-red-700 hover:!border-red-300 hover:!bg-red-100'

export function AdminButton({
  className,
  tone,
  variant = 'ghost',
  ...props
}: AdminButtonProps) {
  const resolvedTone = tone ?? (variant === 'destructive' ? 'danger' : 'default')

  return (
    <Button
      {...props}
      variant={variant}
      className={cn(
        className,
        baseClasses,
        hoverClasses,
        resolvedTone === 'danger' && dangerClasses,
      )}
    />
  )
}

export { AdminButton as Button }


