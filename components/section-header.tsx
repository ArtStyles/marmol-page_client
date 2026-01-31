interface SectionHeaderProps {
  eyebrow?: string
  title: string
  subtitle?: string
  align?: 'left' | 'center'
}

export function SectionHeader({ 
  eyebrow,
  title, 
  subtitle, 
  align = 'center' 
}: SectionHeaderProps) {
  return (
    <div className={`mb-12 ${align === 'center' ? 'text-center' : 'text-left'}`}>
      {eyebrow && (
        <p className={`text-xs uppercase tracking-[0.2em] text-primary ${align === 'center' ? '' : 'mb-2'}`}>
          {eyebrow}
        </p>
      )}
      <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground md:text-4xl text-balance">
        {title}
      </h2>
      {subtitle && (
        <p className={`mt-4 max-w-2xl text-muted-foreground text-pretty ${align === 'center' ? 'mx-auto' : ''}`}>
          {subtitle}
        </p>
      )}
      <div className={`mt-6 h-1 w-16 bg-primary ${align === 'center' ? 'mx-auto' : ''}`} />
    </div>
  )
}
