import { useMemo, useState, type ReactNode } from 'react'
import { Loader2, Radar, SlidersHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import {
  completeScannerSetup,
  updateScannerCareersUrls,
  updateScannerPreferences,
  type ScannerFilters,
  type ScannerSetupCompany,
  type ScannerSetupResponse,
} from '@/api/scanner'
import { FilterChipEditor } from '@/components/scanner/FilterChipEditor'
import { ScannerAddUrlsModal } from '@/components/scanner/ScannerAddUrlsModal'
import { ScannerCompaniesModal } from '@/components/scanner/ScannerCompaniesModal'
import { ScannerReadinessStrip } from '@/components/scanner/ScannerReadinessStrip'
import { ScannerStatusIcon } from '@/components/scanner/ScannerStatusIcon'
import { scannerFiltersAreValid } from '@/components/scanner/scannerUtils'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'

type Props = {
  setup: ScannerSetupResponse
  onComplete: () => void
  onCompaniesUpdated: (companies: ScannerSetupCompany[]) => void
}

function resolveInitialFilters(setup: ScannerSetupResponse): ScannerFilters {
  const { preferences, default_filters: defaults } = setup
  const hasSavedFilters =
    preferences.title.positive.length > 0 ||
    preferences.title.negative.length > 0 ||
    preferences.location.length > 0

  if (hasSavedFilters) {
    return {
      title: preferences.title,
      location: preferences.location,
    }
  }

  return defaults
}

function initialEnabledIds(companies: ScannerSetupCompany[]): Set<string> {
  const enabled = companies.filter((company) => company.scanner_enabled)
  if (enabled.length > 0) {
    return new Set(enabled.map((company) => company.id))
  }

  return new Set(
    companies
      .filter((company) => company.careers_url?.trim())
      .map((company) => company.id),
  )
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
    <h3 className="text-[11px] font-medium tracking-[0.07em] text-text-faint uppercase">
      {children}
      {required ? (
        <>
          {' '}
          <RequiredMark />
        </>
      ) : null}
    </h3>
  )
}

export function ScannerFirstVisit({
  setup,
  onComplete,
  onCompaniesUpdated,
}: Props) {
  const initialFilters = useMemo(() => resolveInitialFilters(setup), [setup])
  const [companies, setCompanies] = useState(setup.companies)
  const [positiveKeywords, setPositiveKeywords] = useState(
    initialFilters.title.positive,
  )
  const [negativeKeywords, setNegativeKeywords] = useState(
    initialFilters.title.negative,
  )
  const [locationKeywords, setLocationKeywords] = useState(
    initialFilters.location,
  )
  const [enabledIds, setEnabledIds] = useState(() =>
    initialEnabledIds(setup.companies),
  )
  const [companiesModalOpen, setCompaniesModalOpen] = useState(false)
  const [addUrlsModalOpen, setAddUrlsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const scannableCompanies = companies.filter((company) =>
    Boolean(company.careers_url?.trim()),
  )
  const missingCareersUrlCount = companies.length - scannableCompanies.length
  const enabledScannableCount = scannableCompanies.filter((company) =>
    enabledIds.has(company.id),
  ).length

  const buildFilters = (): ScannerFilters => ({
    title: {
      positive: positiveKeywords,
      negative: negativeKeywords,
    },
    location: locationKeywords,
  })

  const currentFilters = buildFilters()
  const filtersValid = scannerFiltersAreValid(currentFilters)

  const handleSaveFilters = async () => {
    if (!filtersValid) {
      toast.error('Add at least one positive keyword and one location.')
      return
    }

    if (enabledScannableCount === 0) {
      toast.error('Select at least one company with a careers URL.')
      return
    }

    setIsSaving(true)
    try {
      await updateScannerPreferences(currentFilters)
      await completeScannerSetup({
        filters: currentFilters,
        enabled_application_ids: [...enabledIds],
      })
      toast.success('Filters saved')
      onComplete()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to save filters'
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCareersUrlsSave = async (
    updates: Array<{ application_id: string; careers_url: string }>,
  ) => {
    try {
      const result = await updateScannerCareersUrls({ updates })
      setCompanies(result.companies)
      onCompaniesUpdated(result.companies)
      setEnabledIds((current) => {
        const next = new Set(current)
        for (const update of updates) {
          next.add(update.application_id)
        }
        return next
      })
      toast.success('Careers URLs saved')
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to save careers URLs'
      toast.error(message)
      throw err
    }
  }

  return (
    <>
      <PageHeader
        title="Scanner"
        subtitle="Monitors career pages for companies you track and surfaces roles that match your profile. One scan per day."
        right={
          <Button
            type="button"
            disabled
            title="Set up your filters below first"
            className="min-w-[12.5rem] justify-center"
          >
            <Radar data-icon="inline-start" />
            Scan for new jobs
          </Button>
        }
      />

      <ScannerReadinessStrip
        readyCount={enabledScannableCount}
        missingCount={missingCareersUrlCount}
        onManageCompanies={() => setCompaniesModalOpen(true)}
        onAddUrls={() => setAddUrlsModalOpen(true)}
      />

      <section className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-start gap-3.5 border-b border-border-subtle pb-5">
          <ScannerStatusIcon variant="brand">
            <SlidersHorizontal className="size-[19px]" />
          </ScannerStatusIcon>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight">
              Set up your scan filters
            </h2>
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
              Before your first scan, tell joolkit what to look for across your{' '}
              <span className="font-medium text-foreground">
                {scannableCompanies.length} tracked companies
              </span>
              .
              <br />
              You can fine-tune these any time from Filters.
            </p>
          </div>
        </div>

        <div className="space-y-6 pt-6">
          <div className="space-y-2">
            <FilterSectionTitle required>
              Positive keywords — match any
            </FilterSectionTitle>
            <p className="text-[13px] text-muted-foreground">
              Matched against the role title. Add at least one.
            </p>
            <FilterChipEditor
              items={positiveKeywords}
              blockedKeywords={negativeKeywords}
              onChange={setPositiveKeywords}
              addLabel="Add keyword"
            />
          </div>

          <div className="space-y-2">
            <FilterSectionTitle>Negative keywords</FilterSectionTitle>
            <p className="text-[13px] text-muted-foreground">
              Roles containing any of these are excluded.
            </p>
            <FilterChipEditor
              items={negativeKeywords}
              blockedKeywords={positiveKeywords}
              onChange={setNegativeKeywords}
              exclude
              addLabel="Add exclude"
            />
          </div>

          <div className="space-y-2">
            <FilterSectionTitle required>
              Locations — match any
            </FilterSectionTitle>
            <p className="text-[13px] text-muted-foreground">
              Only roles based in one of these are surfaced. Add at least one.
            </p>
            <FilterChipEditor
              items={locationKeywords}
              onChange={setLocationKeywords}
              addLabel="Add location"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center gap-4 border-t border-border-subtle pt-5">
          <span className="text-[13px] text-muted-foreground">
            {filtersValid ? (
              'Looks good. Save to enable your first scan.'
            ) : (
              <>
                <RequiredMark /> Add at least one positive keyword and one
                location.
              </>
            )}
          </span>
          <span className="flex-1" />
          <Button
            type="button"
            disabled={!filtersValid || isSaving || enabledScannableCount === 0}
            onClick={handleSaveFilters}
            className="min-w-[10rem] justify-center"
          >
            {isSaving ? (
              <>
                <Loader2 className="animate-spin" data-icon="inline-start" />
                Saving…
              </>
            ) : (
              'Save filters'
            )}
          </Button>
        </div>
      </section>

      <ScannerCompaniesModal
        open={companiesModalOpen}
        companies={companies}
        enabledIds={enabledIds}
        onOpenChange={setCompaniesModalOpen}
        onSave={setEnabledIds}
      />

      <ScannerAddUrlsModal
        open={addUrlsModalOpen}
        companies={companies}
        onOpenChange={setAddUrlsModalOpen}
        onSave={handleCareersUrlsSave}
      />
    </>
  )
}
