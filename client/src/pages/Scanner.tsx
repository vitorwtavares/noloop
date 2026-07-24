import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  fetchLastScan,
  fetchScannerSetup,
  type ScannerJob,
  type ScannerSetupResponse,
} from '@/api/scanner'
import {
  useApplications,
  useCreateApplication,
} from '@/api/hooks/useApplications'
import { ScannerFirstVisit } from '@/components/scanner/ScannerFirstVisit'
import { ScannerMainView } from '@/components/scanner/ScannerMainView'
import { useScannerScan } from '@/components/scanner/useScannerScan'
import {
  scannerFiltersAreValid,
  workStyleFromScanner,
} from '@/components/scanner/scannerUtils'
import { Button } from '@/components/ui/button'

export default function Scanner() {
  const queryClient = useQueryClient()
  const [importingUrl, setImportingUrl] = useState<string | null>(null)

  const { data: applications = [] } = useApplications()
  const setupQuery = useQuery({
    queryKey: ['scanner', 'setup'],
    queryFn: fetchScannerSetup,
  })
  const lastScanQuery = useQuery({
    queryKey: ['scanner', 'last-scan'],
    queryFn: fetchLastScan,
    enabled: Boolean(setupQuery.data?.preferences.setup_completed_at),
  })
  const createApplication = useCreateApplication()

  const scan = useScannerScan({
    snapshot: lastScanQuery.data,
    isLastScanPending: lastScanQuery.isPending,
  })

  const importedUrls = useMemo(() => {
    const urls = new Set<string>()
    for (const application of applications) {
      const jobUrl = application.job_url?.trim()
      if (jobUrl) urls.add(jobUrl)
    }
    return urls
  }, [applications])

  const handleImport = async (job: ScannerJob) => {
    setImportingUrl(job.job_url)
    try {
      await createApplication.mutateAsync({
        company_name: job.company_name,
        job_name: job.job_name,
        careers_url: job.careers_url,
        job_url: job.job_url,
        status: 'prospect',
        work_style: workStyleFromScanner(job.work_style),
      })
      toast.success(`Added ${job.job_name} at ${job.company_name} to tracker`)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to add to tracker'
      toast.error(message)
    } finally {
      setImportingUrl(null)
    }
  }

  const handleSetupComplete = () => {
    void queryClient.invalidateQueries({ queryKey: ['scanner', 'setup'] })
    void queryClient.invalidateQueries({ queryKey: ['applications'] })
  }

  if (setupQuery.isPending) {
    return (
      <div className="flex flex-1 items-center justify-center px-16 py-24">
        <Loader2
          aria-hidden="true"
          className="size-6 animate-spin text-muted-foreground"
        />
      </div>
    )
  }

  if (setupQuery.isError) {
    const message =
      setupQuery.error instanceof Error
        ? setupQuery.error.message
        : 'Failed to load scanner setup'
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-16 py-24 text-center">
        <p className="text-sm text-muted-foreground">{message}</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => setupQuery.refetch()}
        >
          Try again
        </Button>
      </div>
    )
  }

  if (!setupQuery.data.preferences.setup_completed_at) {
    return (
      <div className="flex-1 overflow-y-auto p-16 pb-6 max-[1599px]:py-12">
        <ScannerFirstVisit
          setup={setupQuery.data}
          onComplete={handleSetupComplete}
        />
      </div>
    )
  }

  const savedFilters = {
    title: setupQuery.data.preferences.title,
    location: setupQuery.data.preferences.location,
  }
  const filtersReady = scannerFiltersAreValid(savedFilters)

  return (
    <ScannerMainView
      savedFilters={savedFilters}
      onFiltersSaved={(preferences) => {
        queryClient.setQueryData<ScannerSetupResponse>(
          ['scanner', 'setup'],
          (current) => (current ? { ...current, preferences } : current),
        )
      }}
      jobs={scan.jobs}
      scanLiveSession={scan.scanLiveSession}
      scanStatus={scan.scanStatus}
      scanCompletedAt={scan.scanCompletedAt}
      isScanning={scan.isScanning}
      isLoadingLastScan={scan.isLoadingLastScan}
      scanDisabled={scan.scanDisabled || !filtersReady}
      scanButtonLabel={scan.scanButtonLabel}
      scanBlockedReason={
        filtersReady
          ? null
          : 'Add at least one positive keyword and one location in Match filters to scan.'
      }
      highlightedJobUrls={scan.highlightedJobUrls}
      importedUrls={importedUrls}
      importingUrl={importingUrl}
      onStartScan={scan.startScan}
      onImport={handleImport}
    />
  )
}
