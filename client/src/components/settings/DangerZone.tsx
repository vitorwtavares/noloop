import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface DangerZoneProps {
  children: ReactNode
  className?: string
}

export function DangerZone({ children, className }: DangerZoneProps) {
  return (
    <div
      className={cn(
        'mt-8 rounded-lg border border-destructive/30 bg-destructive/5 p-4',
        className,
      )}
    >
      <p className="text-[12px] font-medium tracking-[0.08em] text-destructive uppercase">
        Danger zone
      </p>
      <div className="mt-2 flex flex-col divide-y divide-border/70">
        {children}
      </div>
    </div>
  )
}
