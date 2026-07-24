import { useRef, useState, type ReactNode } from 'react'
import { Check, Loader2, SlidersHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import {
  updateScannerPreferences,
  type ScannerFilters,
  type ScannerPreferences,
} from '@/api/scanner'
import { FilterChipEditor } from '@/components/scanner/FilterChipEditor'
import {
  EMPTY_SCANNER_FILTERS,
  scannerFiltersAreValid,
} from '@/components/scanner/scannerUtils'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

type Props = {
  savedFilters: ScannerFilters
  onSaved: (preferences: ScannerPreferences) => void
}

function RequiredMark() {
  return <span className="text-warning-accent">*</span>
}

function FilterSectionTitle({
  children,
  required = false,
}: {
  children: ReactNode
  required?: boolean
}) {
  return (
    <h4 className="text-[11px] font-medium tracking-[0.07em] text-text-faint uppercase">
      {children}
      {required ? (
        <>
          {' '}
          <RequiredMark />
        </>
      ) : null}
    </h4>
  )
}

export function ScannerFiltersPanel({ savedFilters, onSaved }: Props) {
  const [filters, setFilters] = useState<ScannerFilters>(savedFilters)
  const [pendingSaves, setPendingSaves] = useState(0)
  const [hasSaved, setHasSaved] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [confirmResetOpen, setConfirmResetOpen] = useState(false)
  // Serialises writes so a fast edit sequence can't land out of order, and keeps
  // the last persisted value around to roll back to when a write fails.
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve())
  const lastSavedRef = useRef(savedFilters)

  const isSaving = pendingSaves > 0
  const filtersValid = scannerFiltersAreValid(filters)
  const hasAnyFilter =
    filters.title.positive.length > 0 ||
    filters.title.negative.length > 0 ||
    filters.location.length > 0

  const persist = (next: ScannerFilters): Promise<void> => {
    setFilters(next)
    setPendingSaves((count) => count + 1)

    saveQueueRef.current = saveQueueRef.current.then(async () => {
      try {
        const preferences = await updateScannerPreferences(next)
        lastSavedRef.current = next
        setHasSaved(true)
        onSaved(preferences)
      } catch (err) {
        setFilters(lastSavedRef.current)
        const message =
          err instanceof Error ? err.message : 'Failed to save filters'
        toast.error(message)
      } finally {
        setPendingSaves((count) => count - 1)
      }
    })

    return saveQueueRef.current
  }

  const handleReset = async () => {
    setIsResetting(true)
    await persist(EMPTY_SCANNER_FILTERS)
    setIsResetting(false)
    setConfirmResetOpen(false)
  }

  return (
    <section className="mb-4 overflow-hidden rounded-[14px] border border-border bg-card">
      <div className="flex items-center gap-2.5 px-5 py-4">
        <SlidersHorizontal
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
        />
        <h3 className="shrink-0 text-[15px] font-semibold tracking-tight">
          Match filters
        </h3>
        <span className="min-w-0 flex-1" aria-hidden="true" />
        <span
          aria-live="polite"
          className="flex shrink-0 items-center gap-1.5 text-[12px] whitespace-nowrap text-muted-foreground"
        >
          {isSaving ? (
            <>
              <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
              Saving…
            </>
          ) : !filtersValid ? (
            <span className="text-warning-accent">
              Add at least one positive keyword and one location to scan
            </span>
          ) : hasSaved ? (
            <>
              <Check aria-hidden="true" className="size-3.5 text-brand" />
              Saved — applies to your next scan
            </>
          ) : (
            'Changes save automatically'
          )}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0"
          disabled={!hasAnyFilter || isSaving}
          onClick={() => setConfirmResetOpen(true)}
        >
          Reset
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-7 border-t border-border-subtle px-5 py-5 md:grid-cols-2">
        <div className="space-y-6">
          <div className="space-y-2">
            <FilterSectionTitle required>
              Positive keywords — match any
            </FilterSectionTitle>
            <p className="text-[12px] leading-snug text-muted-foreground">
              Matched against the role title. Add at least one.
            </p>
            <FilterChipEditor
              items={filters.title.positive}
              onChange={(positive) =>
                void persist({
                  ...filters,
                  title: { ...filters.title, positive },
                })
              }
              addLabel="Add keyword"
            />
          </div>

          <div className="space-y-2">
            <FilterSectionTitle>Negative keywords</FilterSectionTitle>
            <p className="text-[12px] leading-snug text-muted-foreground">
              Roles containing any of these are excluded.
            </p>
            <FilterChipEditor
              items={filters.title.negative}
              onChange={(negative) =>
                void persist({
                  ...filters,
                  title: { ...filters.title, negative },
                })
              }
              exclude
              addLabel="Add exclude"
            />
          </div>
        </div>

        <div className="space-y-2">
          <FilterSectionTitle required>
            Locations — match any
          </FilterSectionTitle>
          <p className="text-[12px] leading-snug text-muted-foreground">
            Only roles based in one of these are surfaced. Add at least one.
          </p>
          <FilterChipEditor
            items={filters.location}
            onChange={(location) => void persist({ ...filters, location })}
            addLabel="Add location"
          />
        </div>
      </div>

      <ConfirmDialog
        open={confirmResetOpen}
        onOpenChange={setConfirmResetOpen}
        title="Clear all filters?"
        description="This removes every keyword and location right away. Scanning stays disabled until you add at least one positive keyword and one location again."
        confirmLabel="Clear filters"
        confirmingLabel="Clearing…"
        isConfirming={isResetting}
        onConfirm={() => void handleReset()}
      />
    </section>
  )
}
