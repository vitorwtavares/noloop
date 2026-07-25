import { Fragment, useMemo, useState } from 'react'
import { Check, Link2, Loader2 } from 'lucide-react'
import type { ScannerSetupCompany } from '@/api/scanner'
import { CompanyAvatar } from '@/components/tracker/CompanyAvatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { isValidCareersUrl, sanitizeCareersUrl } from '@/utils/sanitizeUrl'

type Props = {
  open: boolean
  companies: ScannerSetupCompany[]
  onOpenChange: (open: boolean) => void
  onSave: (
    updates: Array<{ application_id: string; careers_url: string }>,
  ) => Promise<void>
}

const CAREERS_URL_ERROR = 'Enter a valid URL like company.com/careers'

export function ScannerAddUrlsModal({
  open,
  companies,
  onOpenChange,
  onSave,
}: Props) {
  const missingCompanies = useMemo(
    () => companies.filter((company) => !company.careers_url?.trim()),
    [companies],
  )

  const [draftUrls, setDraftUrls] = useState<Record<string, string>>({})
  const [touchedIds, setTouchedIds] = useState<Set<string>>(() => new Set())
  const [isSaving, setIsSaving] = useState(false)

  const syncDraft = (nextOpen: boolean) => {
    if (nextOpen) {
      setDraftUrls(
        Object.fromEntries(missingCompanies.map((company) => [company.id, ''])),
      )
      setTouchedIds(new Set())
    }
    onOpenChange(nextOpen)
  }

  const filledCount = missingCompanies.filter((company) =>
    draftUrls[company.id]?.trim(),
  ).length

  const hasInvalidFilled = missingCompanies.some((company) => {
    const raw = draftUrls[company.id]?.trim()
    return raw && !isValidCareersUrl(raw)
  })

  const showFormError = hasInvalidFilled

  const markTouched = (companyId: string) => {
    setTouchedIds((current) => new Set(current).add(companyId))
  }

  const markAllFilledTouched = () => {
    setTouchedIds(
      new Set(
        missingCompanies
          .filter((company) => draftUrls[company.id]?.trim())
          .map((company) => company.id),
      ),
    )
  }

  const setUrl = (companyId: string, value: string) => {
    setDraftUrls((current) => ({ ...current, [companyId]: value }))
  }

  const handleSave = async () => {
    if (hasInvalidFilled) {
      markAllFilledTouched()
      return
    }

    const updates: Array<{ application_id: string; careers_url: string }> = []

    for (const company of missingCompanies) {
      const raw = draftUrls[company.id]?.trim()
      if (!raw) continue

      const sanitized = sanitizeCareersUrl(raw)
      if (!sanitized) continue

      updates.push({
        application_id: company.id,
        careers_url: sanitized,
      })
    }

    if (updates.length === 0) {
      onOpenChange(false)
      return
    }

    setIsSaving(true)
    try {
      await onSave(updates)
      onOpenChange(false)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={syncDraft}>
      <DialogContent className="flex max-h-[min(640px,calc(100vh-2rem))] flex-col gap-0 overflow-hidden border border-border/60 bg-card p-0 ring-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border-subtle px-6 py-5 pr-14">
          <DialogTitle className="text-lg font-semibold tracking-tight">
            Add careers URLs
          </DialogTitle>
          <DialogDescription className="max-w-xl leading-relaxed">
            Paste the careers page URL for each company. Saving updates the
            company&apos;s record in Applications so it can be scanned.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-4 border-b border-border-subtle px-6 py-3 text-[13px]">
          <span className="shrink-0 text-muted-foreground">
            <span className="font-medium text-foreground">{filledCount}</span>{' '}
            of {missingCompanies.length} filled in
          </span>
          {showFormError ? (
            <p className="text-right text-destructive">{CAREERS_URL_ERROR}</p>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-[minmax(130px,0.9fr)_1.6fr] items-center gap-x-4 gap-y-2.5">
            <div className="pb-0.5 text-[10.5px] font-medium tracking-[0.07em] text-text-faint uppercase">
              Company
            </div>
            <div className="pb-0.5 text-[10.5px] font-medium tracking-[0.07em] text-text-faint uppercase">
              Careers URL
            </div>

            {missingCompanies.map((company) => {
              const value = draftUrls[company.id] ?? ''
              const trimmed = value.trim()
              const invalid = Boolean(trimmed) && !isValidCareersUrl(trimmed)
              const showError = invalid && touchedIds.has(company.id)

              return (
                <Fragment key={company.id}>
                  <div className="flex items-center gap-2.5 py-1">
                    <CompanyAvatar name={company.company_name} />
                    <span className="min-w-0 text-sm font-medium">
                      {company.company_name}
                    </span>
                  </div>
                  <div
                    className={cn(
                      'flex h-9 items-center gap-2 rounded-lg border bg-secondary/60 px-3 transition-colors',
                      showError
                        ? 'border-destructive focus-within:border-destructive'
                        : 'border-border focus-within:border-brand/40',
                    )}
                  >
                    <Link2 className="size-3.5 shrink-0 text-muted-foreground" />
                    <input
                      type="url"
                      value={value}
                      onChange={(event) =>
                        setUrl(company.id, event.target.value)
                      }
                      onBlur={() => markTouched(company.id)}
                      aria-invalid={showError}
                      placeholder="https://…"
                      className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                </Fragment>
              )
            })}
          </div>
        </div>

        <DialogFooter className="flex-row items-center border-t border-border-subtle px-6 py-4 sm:justify-between">
          <p className="max-w-[320px] text-[13px] text-muted-foreground">
            Companies with added URLs are automatically added to the companies
            to scan list.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={() => syncDraft(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isSaving || filledCount === 0 || hasInvalidFilled}
              onClick={() => void handleSave()}
            >
              {isSaving ? (
                <>
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                  Saving…
                </>
              ) : (
                <>
                  <Check data-icon="inline-start" />
                  Save
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
