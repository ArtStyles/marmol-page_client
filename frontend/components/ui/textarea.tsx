import * as React from 'react'

import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'placeholder:text-muted-foreground flex field-sizing-content min-h-16 w-full rounded-xl border bg-[var(--field-surface)] px-3 py-2 text-base shadow-[0_1px_0_rgba(15,23,42,0.03)] transition-[color,background-color,box-shadow,border-color] outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'border-[var(--field-border)] hover:border-[var(--field-border-hover)] focus-visible:border-[var(--field-ring)] focus-visible:ring-ring/30 focus-visible:ring-[3px]',
        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
