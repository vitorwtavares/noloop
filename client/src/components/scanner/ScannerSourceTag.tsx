import { cn } from '@/lib/utils'

const SOURCE_META: Record<
  string,
  { label: string; dotClassName?: string; dotColor?: string }
> = {
  ashby: { label: 'Ashby', dotColor: '#3f37a3' },
  lever: { label: 'Lever', dotColor: '#e0b43a' },
  greenhouse: { label: 'Greenhouse', dotColor: '#219a74' },
  smartrecruiters: { label: 'SmartRecruiters', dotColor: '#e07a2f' },
}

interface ScannerSourceTagProps {
  source: string
  className?: string
}

export function ScannerSourceTag({ source, className }: ScannerSourceTagProps) {
  const normalized = source.trim().toLowerCase()
  const meta = SOURCE_META[normalized] ?? {
    label: source,
    dotClassName: 'bg-muted-foreground/60',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-sm text-muted-foreground',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn('size-[7px] shrink-0 rounded-full', meta.dotClassName)}
        style={meta.dotColor ? { backgroundColor: meta.dotColor } : undefined}
      />
      {meta.label}
    </span>
  )
}
