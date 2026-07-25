import { Plus, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Props = {
  readyCount: number
  missingCount: number
  onManageCompanies: () => void
  onAddUrls: () => void
}

function ReadinessDot({ tone }: { tone: 'success' | 'warn' }) {
  return (
    <span className="flex shrink-0 items-center justify-center overflow-visible p-[3px]">
      <span
        aria-hidden
        className={cn(
          'size-[7px] rounded-full',
          tone === 'success'
            ? 'bg-success shadow-[0_0_0_3px_var(--success-soft-strong)]'
            : 'bg-warning shadow-[0_0_0_3px_rgba(251,191,36,0.18)]',
        )}
      />
    </span>
  )
}

export function ScannerReadinessStrip({
  readyCount,
  missingCount,
  onManageCompanies,
  onAddUrls,
}: Props) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-secondary/60 px-4 py-3">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 gap-2 rounded-lg px-2 text-[13px] font-normal hover:bg-muted dark:hover:bg-muted"
        onClick={onManageCompanies}
      >
        <ReadinessDot tone="success" />
        <span className="font-medium text-foreground tabular-nums">
          {readyCount}
        </span>
        companies ready to scan
        <SlidersHorizontal className="size-3.5 text-muted-foreground" />
      </Button>

      <span className="hidden h-4 w-px bg-border sm:block" aria-hidden="true" />

      {missingCount > 0 ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-2 rounded-lg px-2 text-[13px] font-normal hover:bg-muted dark:hover:bg-muted"
          onClick={onAddUrls}
        >
          <ReadinessDot tone="warn" />
          <span className="font-medium text-foreground tabular-nums">
            {missingCount}
          </span>
          missing a careers URL
          <Plus className="size-3.5 text-muted-foreground" />
        </Button>
      ) : (
        <div className="inline-flex h-8 items-center gap-2 px-1 text-[13px] text-muted-foreground">
          <ReadinessDot tone="success" />
          <span className="font-medium text-foreground tabular-nums">
            {missingCount}
          </span>
          missing a careers URL
        </div>
      )}
    </div>
  )
}
