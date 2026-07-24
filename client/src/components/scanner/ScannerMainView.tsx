import { useState } from 'react'
import { Loader2, Radar } from 'lucide-react'
import type {
  ScannerFilters,
  ScannerJob,
  ScannerPreferences,
} from '@/api/scanner'
import { PageHeader } from '@/components/layout/PageHeader'
import { ScannerActivityRail } from '@/components/scanner/ScannerActivityRail'
import { ScannerFiltersPanel } from '@/components/scanner/ScannerFiltersPanel'
import { ScanResultsTable } from '@/components/scanner/ScanResultsTable'
import { ScanStatusCard } from '@/components/scanner/ScanStatusCard'
import { ScannerToolbar } from '@/components/scanner/ScannerToolbar'
import type { ScanLiveSession } from '@/components/scanner/scanLiveState'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type Props = {
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

  const showRail = railOpen || isScanning

  const handleStartScan = () => {
    setRailOpen(true)
    onStartScan()
  }

  const scanButton = (
    <Button
      type="button"
      onClick={handleStartScan}
      disabled={scanDisabled}
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
        <ScanResultsTable
          jobs={jobs}
          importedUrls={importedUrls}
          importingUrl={importingUrl}
          highlightedJobUrls={highlightedJobUrls}
          isLoading={isLoadingLastScan}
          isScanning={isScanning}
          onImport={onImport}
        />

        {showRail && (
          <ScannerActivityRail
            activity={scanLiveSession.activity}
            isScanning={isScanning}
          />
        )}
      </div>
    </div>
  )
}
