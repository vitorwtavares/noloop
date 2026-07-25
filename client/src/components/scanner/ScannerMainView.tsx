import { useMemo, useState } from 'react'
import { Loader2, Radar, Search, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import type {
  ScannerFilters,
  ScannerJob,
  ScannerPreferences,
  ScannerSetupCompany,
} from '@/api/scanner'
import { updateScannerCompanies } from '@/api/scanner'
import { PageHeader } from '@/components/layout/PageHeader'
import { ScannerActivityRail } from '@/components/scanner/ScannerActivityRail'
import { ScannerCompaniesModal } from '@/components/scanner/ScannerCompaniesModal'
import { ScannerErrorBanner } from '@/components/scanner/ScannerErrorBanner'
import { ScannerFiltersPanel } from '@/components/scanner/ScannerFiltersPanel'
import { ScannerReadinessStrip } from '@/components/scanner/ScannerReadinessStrip'
import { ScanResultsTable } from '@/components/scanner/ScanResultsTable'
import { ScanStatusCard } from '@/components/scanner/ScanStatusCard'
import { ScannerToolbar } from '@/components/scanner/ScannerToolbar'
import { ScannerZeroState } from '@/components/scanner/ScannerZeroState'
import type { ScanLiveSession } from '@/components/scanner/scanLiveState'
import {
  deriveScanErrorBanner,
  deriveScannerPageState,
} from '@/components/scanner/scannerPageState'
import { scannerReadinessCounts } from '@/components/scanner/scannerUtils'
import { ScanTableSkeleton } from '@/components/scanner/ScanTableSkeleton'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type Props = {
  companies: ScannerSetupCompany[]
  onCompaniesUpdated: (companies: ScannerSetupCompany[]) => void
  jobs: ScannerJob[]
  savedFilters: ScannerFilters
  onFiltersSaved: (preferences: ScannerPreferences) => void
  scanLiveSession: ScanLiveSession
  scanStatus: string | null
  scanCompletedAt: string | null
  isScanning: boolean
  isLoadingLastScan: boolean
  scanDisabled: boolean
  scanButtonLabel: string
  scanBlockedReason: string | null
  highlightedJobUrls: Set<string>
  importedUrls: Set<string>
  importingUrl: string | null
  onStartScan: () => void
  onImport: (job: ScannerJob) => void
}

export function ScannerMainView({
  companies,
  onCompaniesUpdated,
  jobs,
  savedFilters,
  onFiltersSaved,
  scanLiveSession,
  scanStatus,
  scanCompletedAt,
  isScanning,
  isLoadingLastScan,
  scanDisabled,
  scanButtonLabel,
  scanBlockedReason,
  highlightedJobUrls,
  importedUrls,
  importingUrl,
  onStartScan,
  onImport,
}: Props) {
  const [railOpen, setRailOpen] = useState(true)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [companiesModalOpen, setCompaniesModalOpen] = useState(false)
  const [isSavingCompanies, setIsSavingCompanies] = useState(false)

  const { readyCount, missingCount } = scannerReadinessCounts(companies)
  const enabledIds = useMemo(
    () =>
      new Set(
        companies
          .filter((company) => company.scanner_enabled)
          .map((company) => company.id),
      ),
    [companies],
  )

  const pageState = deriveScannerPageState({
    isScanning,
    isLoadingLastScan,
    scanStatus,
    jobCount: jobs.length,
    activity: scanLiveSession.activity,
  })

  const errorBanner = deriveScanErrorBanner(
    scanLiveSession.activity,
    scanStatus,
  )

  const showRail =
    (railOpen || isScanning) &&
    (isScanning || scanLiveSession.activity.length > 0)

  const handleStartScan = () => {
    setRailOpen(true)
    onStartScan()
  }

  const handleCompaniesSave = async (nextEnabledIds: Set<string>) => {
    setIsSavingCompanies(true)
    try {
      const result = await updateScannerCompanies({
        enabled_application_ids: [...nextEnabledIds],
      })
      onCompaniesUpdated(result.companies)
      toast.success('Companies updated')
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to update companies'
      toast.error(message)
    } finally {
      setIsSavingCompanies(false)
    }
  }

  const scanButton = (
    <Button
      type="button"
      onClick={handleStartScan}
      disabled={scanDisabled || isSavingCompanies}
      aria-busy={isLoadingLastScan}
      aria-label={isLoadingLastScan ? 'Loading scanner' : scanButtonLabel}
      className="min-w-[12.5rem] justify-center"
    >
      {isLoadingLastScan ? (
        <Loader2 aria-hidden="true" className="size-4 animate-spin" />
      ) : isScanning ? (
        <>
          <Loader2 className="animate-spin" data-icon="inline-start" />
          Scanning…
        </>
      ) : (
        <>
          <Radar data-icon="inline-start" />
          {scanButtonLabel}
        </>
      )}
    </Button>
  )

  const resultsBody = (() => {
    if (isLoadingLastScan) {
      return <ScanTableSkeleton rows={4} columns={6} />
    }

    if (jobs.length > 0) {
      return (
        <ScanResultsTable
          jobs={jobs}
          importedUrls={importedUrls}
          importingUrl={importingUrl}
          highlightedJobUrls={highlightedJobUrls}
          onImport={onImport}
        />
      )
    }

    if (pageState === 'scanning') {
      return (
        <ScannerZeroState
          icon={Search}
          title="Checking boards…"
          description="Matches will appear here as they're found."
        />
      )
    }

    if (pageState === 'idle-no-scan') {
      return (
        <ScannerZeroState
          title="No matching jobs yet"
          description="Start a scan to find new openings."
        />
      )
    }

    if (pageState === 'error') {
      return (
        <ScannerZeroState
          icon={AlertCircle}
          tone="danger"
          title="No new matching roles"
          description={
            'Nothing cleared your filters this scan.\nCheck the activity log for board errors.'
          }
        />
      )
    }

    return <ScannerZeroState />
  })()

  return (
    <div className="flex-1 overflow-y-auto p-16 pb-6 max-[1599px]:py-12">
      <PageHeader
        title="Scanner"
        subtitle="Scan tracked company boards for new roles that match your profile."
        right={
          scanBlockedReason ? (
            <Tooltip>
              {/* Disabled buttons swallow pointer events, so the span carries the hover. */}
              <TooltipTrigger asChild>
                <span className="inline-flex">{scanButton}</span>
              </TooltipTrigger>
              <TooltipContent side="bottom">{scanBlockedReason}</TooltipContent>
            </Tooltip>
          ) : (
            scanButton
          )
        }
      />

      <ScannerReadinessStrip
        readyCount={readyCount}
        missingCount={missingCount}
        onManageCompanies={() => setCompaniesModalOpen(true)}
      />

      {errorBanner && pageState === 'error' && (
        <ScannerErrorBanner model={errorBanner} />
      )}

      <ScanStatusCard
        isScanning={isScanning}
        isLoading={isLoadingLastScan}
        scanStatus={scanStatus}
        scanCompletedAt={scanCompletedAt}
        jobCount={jobs.length}
        scanLiveSession={scanLiveSession}
      />

      <ScannerToolbar
        jobCount={jobs.length}
        isScanning={isScanning}
        railOpen={railOpen}
        activityLogDisabled={
          !isScanning && scanLiveSession.activity.length === 0
        }
        filtersOpen={filtersOpen}
        onToggleRail={() => setRailOpen((open) => !open)}
        onToggleFilters={() => setFiltersOpen((open) => !open)}
      />

      {filtersOpen && (
        <ScannerFiltersPanel
          savedFilters={savedFilters}
          onSaved={onFiltersSaved}
        />
      )}

      <div
        className={cn(
          'grid items-start gap-5',
          showRail
            ? 'grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px]'
            : 'grid-cols-1',
        )}
      >
        {resultsBody}

        {showRail && (
          <ScannerActivityRail
            activity={scanLiveSession.activity}
            isScanning={isScanning}
          />
        )}
      </div>

      <ScannerCompaniesModal
        open={companiesModalOpen}
        companies={companies}
        enabledIds={enabledIds}
        onOpenChange={setCompaniesModalOpen}
        onSave={(nextEnabledIds) => void handleCompaniesSave(nextEnabledIds)}
      />
    </div>
  )
}
