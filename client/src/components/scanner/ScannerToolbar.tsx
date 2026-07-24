import { Activity, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Props = {
  jobCount: number
  isScanning: boolean
  railOpen: boolean
  filtersOpen: boolean
  onToggleRail: () => void
  onToggleFilters: () => void
}

export function ScannerToolbar({
  jobCount,
  isScanning,
  railOpen,
  filtersOpen,
  onToggleRail,
  onToggleFilters,
}: Props) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <h2 className="inline-flex items-center gap-1.5 text-lg font-semibold tracking-tight">
        {isScanning ? 'Matches so far' : 'Matching roles'}
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-[6px] bg-brand-soft px-1.5 py-px font-mono text-[12px] leading-[1] font-medium text-brand">
          {jobCount}
        </span>
      </h2>

      <span className="min-w-0 flex-1" aria-hidden="true" />

      {!isScanning && (
        <Button
          variant="outline"
          size="sm"
          aria-pressed={railOpen}
          onClick={onToggleRail}
          className={cn(railOpen && 'border-brand/40')}
        >
          <Activity size={14} />
          Activity log
        </Button>
      )}

      <Button
        variant="outline"
        size="sm"
        aria-pressed={filtersOpen}
        onClick={onToggleFilters}
        className={cn(filtersOpen && 'border-brand/40')}
      >
        <Filter size={14} />
        Filters
      </Button>
    </div>
  )
}
