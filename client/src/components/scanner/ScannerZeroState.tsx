import { type ReactNode } from 'react'
import { CheckCircle2, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  title?: string
  description?: ReactNode
  /** Neutral for idle / empty results; danger for error empty states. */
  tone?: 'neutral' | 'danger'
  icon?: LucideIcon
}

export function ScannerZeroState({
  title = 'No new matching roles',
  description = 'Every board was checked and nothing new cleared your filters this time.',
  tone = 'neutral',
  icon: Icon = CheckCircle2,
}: Props) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-border bg-card px-8 py-[4.5rem] text-center">
      <div
        aria-hidden="true"
        className={cn(
          'mb-5 grid size-[60px] place-items-center rounded-[14px]',
          tone === 'danger'
            ? 'bg-danger-soft text-danger'
            : 'bg-secondary text-muted-foreground',
        )}
      >
        <Icon className="size-7" />
      </div>
      <h3 className="text-[19px] font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
        {description}
      </p>
    </div>
  )
}
