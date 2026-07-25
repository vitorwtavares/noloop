import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'brand' | 'ok' | 'err'

type Props = {
  variant: Variant
  children: ReactNode
  className?: string
}

export function ScannerStatusIcon({ variant, children, className }: Props) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-[38px] shrink-0 place-items-center rounded-[10px]',
        variant === 'brand' && 'bg-brand-soft text-brand',
        variant === 'ok' && 'bg-success-soft text-success',
        variant === 'err' && 'bg-danger-soft text-danger',
        className,
      )}
    >
      {children}
    </span>
  )
}
