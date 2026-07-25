import { useMemo, useState } from 'react'
import { Link2 } from 'lucide-react'
import type { ScannerSetupCompany } from '@/api/scanner'
import { CompanyAvatar } from '@/components/tracker/CompanyAvatar'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type Props = {
  open: boolean
  companies: ScannerSetupCompany[]
  enabledIds: Set<string>
  onOpenChange: (open: boolean) => void
  onSave: (enabledIds: Set<string>) => void
}

export function ScannerCompaniesModal({
  open,
  companies,
  enabledIds,
  onOpenChange,
  onSave,
}: Props) {
  const [draftEnabledIds, setDraftEnabledIds] = useState(enabledIds)

  const isDirty = useMemo(() => {
    if (draftEnabledIds.size !== enabledIds.size) return true
    for (const id of draftEnabledIds) {
      if (!enabledIds.has(id)) return true
    }
    return false
  }, [draftEnabledIds, enabledIds])

  const selectable = useMemo(
    () => companies.filter((company) => Boolean(company.careers_url?.trim())),
    [companies],
  )

  const selectedCount = selectable.filter((company) =>
    draftEnabledIds.has(company.id),
  ).length
  const allSelected =
    selectable.length > 0 && selectedCount === selectable.length

  const syncDraft = (nextOpen: boolean) => {
    if (nextOpen) {
      setDraftEnabledIds(new Set(enabledIds))
    }
    onOpenChange(nextOpen)
  }

  const toggleCompany = (companyId: string, checked: boolean) => {
    setDraftEnabledIds((current) => {
      const next = new Set(current)
      if (checked) {
        next.add(companyId)
      } else {
        next.delete(companyId)
      }
      return next
    })
  }

  const toggleAll = () => {
    setDraftEnabledIds(
      allSelected
        ? new Set()
        : new Set(selectable.map((company) => company.id)),
    )
  }

  return (
    <Dialog open={open} onOpenChange={syncDraft}>
      <DialogContent className="flex max-h-[min(640px,calc(100vh-2rem))] flex-col gap-0 overflow-hidden border border-border/60 bg-card p-0 ring-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border-subtle px-6 py-5 pr-14">
          <DialogTitle className="text-lg font-semibold tracking-tight">
            Companies to scan
          </DialogTitle>
          <DialogDescription className="max-w-md leading-relaxed">
            Choose which tracked companies the scanner watches.
            <br />
            Unticked companies are skipped even if they have a careers URL.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 border-b border-border-subtle px-6 py-3 text-[13px]">
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">{selectedCount}</span>{' '}
            of {selectable.length} selected
          </span>
          <span className="flex-1" />
          <Button type="button" variant="ghost" size="sm" onClick={toggleAll}>
            {allSelected ? 'Deselect all' : 'Select all'}
          </Button>
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {companies.map((company) => {
            const hasCareersUrl = Boolean(company.careers_url?.trim())
            const checked = draftEnabledIds.has(company.id)

            return (
              <li key={company.id}>
                <label
                  className={cn(
                    'flex items-center gap-3 rounded-md px-4 py-3 select-none',
                    hasCareersUrl
                      ? 'cursor-pointer hover:bg-muted/50'
                      : 'cursor-not-allowed opacity-60',
                  )}
                >
                  <Checkbox
                    checked={hasCareersUrl && checked}
                    disabled={!hasCareersUrl}
                    className={cn(
                      'size-[17px] cursor-pointer rounded-[5px] border-[1.5px] border-border-strong bg-transparent shadow-none',
                      'hover:border-brand',
                      'data-checked:border-brand data-checked:bg-brand data-checked:text-brand-foreground',
                      'dark:bg-transparent dark:data-checked:border-brand dark:data-checked:bg-brand dark:data-checked:text-brand-foreground',
                      'disabled:cursor-not-allowed',
                    )}
                    onCheckedChange={(value) =>
                      toggleCompany(company.id, value === true)
                    }
                  />
                  <CompanyAvatar name={company.company_name} />
                  <span className="min-w-0 flex-1 text-sm font-medium">
                    {company.company_name}
                  </span>
                  {!hasCareersUrl ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Link2 className="size-3.5" />
                      no careers URL
                    </span>
                  ) : null}
                </label>
              </li>
            )
          })}
        </ul>

        <DialogFooter className="flex-row items-center border-t border-border-subtle px-6 py-4 sm:justify-between">
          <p className="text-[13px] text-muted-foreground">
            Applies from your next scan.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => syncDraft(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!isDirty}
              onClick={() => {
                if (!isDirty) return
                onSave(draftEnabledIds)
                onOpenChange(false)
              }}
            >
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
