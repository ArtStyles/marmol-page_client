import * as React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type AdminButtonProps = React.ComponentProps<typeof Button> & {
  tone?: 'default' | 'danger'
}

const baseClasses =
  'rounded-2xl border !border-slate-900/10 !bg-white/90 !text-slate-900 !shadow-[0_8px_24px_-16px_rgba(15,23,42,0.35)] backdrop-blur-sm transition'
const hoverClasses = 'hover:!border-slate-900/20 hover:!bg-white/95'
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
