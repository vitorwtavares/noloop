import { Loader2, Radar } from 'lucide-react'
import type { ScannerJob } from '@/api/scanner'
import { PageHeader } from '@/components/layout/PageHeader'
import { ScanResultsTable } from '@/components/scanner/ScanResultsTable'
import { ScanStatusCard } from '@/components/scanner/ScanStatusCard'
import type { ScanLiveSession } from '@/components/scanner/scanLiveState'
import { Button } from '@/components/ui/button'

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
  return (
    <div className="flex-1 overflow-y-auto p-16 pb-6 max-[1599px]:py-12">
      <PageHeader
        title="Scanner"
        subtitle="Scan tracked company boards for new roles that match your profile."
        right={
          <Button
            type="button"
            onClick={onStartScan}
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

      <section>
        <div className="mb-3 flex items-center gap-1.5">
          <h2 className="text-lg font-medium">Jobs found</h2>
          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-[6px] bg-brand px-1.5 py-px font-mono text-[12px] leading-[1] font-medium text-brand-foreground">
            {jobs.length}
          </span>
        </div>
        <ScanResultsTable
          jobs={jobs}
          importedUrls={importedUrls}
          importingUrl={importingUrl}
          highlightedJobUrls={highlightedJobUrls}
          isLoading={isLoadingLastScan}
          isScanning={isScanning}
          onImport={onImport}
        />
      </section>
    </div>
  )
}
