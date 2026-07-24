import { useState } from 'react'
import { Loader2, Radar } from 'lucide-react'
import type { ScannerJob } from '@/api/scanner'
import { PageHeader } from '@/components/layout/PageHeader'
import { ScannerActivityRail } from '@/components/scanner/ScannerActivityRail'
import { ScanResultsTable } from '@/components/scanner/ScanResultsTable'
import { ScanStatusCard } from '@/components/scanner/ScanStatusCard'
import { ScannerToolbar } from '@/components/scanner/ScannerToolbar'
import type { ScanLiveSession } from '@/components/scanner/scanLiveState'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Props = {
  jobs: ScannerJob[]
  scanLiveSession: ScanLiveSession
  scanStatus: string | null
  scanCompletedAt: string | null
  isScanning: boolean
  isLoadingLastScan: boolean
  scanDisabled: boolean
  scanButtonLabel: string
  highlightedJobUrls: Set<string>
  importedUrls: Set<string>
  importingUrl: string | null
  onStartScan: () => void
  onImport: (job: ScannerJob) => void
}

export function ScannerMainView({
  jobs,
  scanLiveSession,
  scanStatus,
  scanCompletedAt,
  isScanning,
  isLoadingLastScan,
  scanDisabled,
  scanButtonLabel,
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

  return (
    <div className="flex-1 overflow-y-auto p-16 pb-6 max-[1599px]:py-12">
      <PageHeader
        title="Scanner"
        subtitle="Scan tracked company boards for new roles that match your profile."
        right={
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
