import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TagProps {
  children: React.ReactNode
  onRemove?: () => void
  className?: string
}

export function Tag({ children, onRemove, className }: TagProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-[5px] bg-brand-soft px-2 py-0.5 text-[13px] font-medium whitespace-nowrap text-brand',
        className,
      )}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove tag"
          className="-mr-0.5 flex cursor-pointer items-center text-brand/50 transition-colors hover:text-danger"
        >
          <X size={12} />
        </button>
      )}
    </span>
  )
}
