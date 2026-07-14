import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Radar } from 'lucide-react'
import { toast } from 'sonner'
import {
  ScanLimitError,
  fetchLastScan,
  startScannerScan,
  type LastScanSnapshot,
  type ScannerJob,
  type ScannerSseEvent,
} from '@/api/scanner'
import {
  useApplications,
  useCreateApplication,
} from '@/api/hooks/useApplications'
import { PageHeader } from '@/components/layout/PageHeader'
import { ScanResultsTable } from '@/components/scanner/ScanResultsTable'
import { ScanStatusPanel } from '@/components/scanner/ScanStatusPanel'
import { Button } from '@/components/ui/button'

const JOB_HIGHLIGHT_MS = 700

function formatRetryAfter(seconds: number): string {
  if (seconds <= 0) return 'soon'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function formatScanCompleteSummary(
  jobsEmitted: number,
  errorsCount: number,
): string {
  const jobLabel = jobsEmitted === 1 ? 'job' : 'jobs'
  const errorLabel = errorsCount === 1 ? 'error' : 'errors'
  return `Scan complete — ${jobsEmitted} new ${jobLabel} found (${errorsCount} ${errorLabel})`
}

function workStyleFromScanner(
  value: string | null,
): 'remote' | 'hybrid' | 'on-site' | null {
  if (!value) return null
  if (value === 'remote') return 'remote'
  if (value === 'hybrid') return 'hybrid'
  if (value === 'on-site' || value === 'onsite') return 'on-site'
  return null
}

export default function Scanner() {
  const queryClient = useQueryClient()
  const [isScanning, setIsScanning] = useState(false)
  const [liveJobs, setLiveJobs] = useState<ScannerJob[]>([])
  const [highlightedJobUrls, setHighlightedJobUrls] = useState<Set<string>>(
    new Set(),
  )
  const [importingUrl, setImportingUrl] = useState<string | null>(null)
  const [liveScanStatus, setLiveScanStatus] = useState<string | null>(null)
  const [retryUntil, setRetryUntil] = useState<number | null>(null)
  const [retryTick, setRetryTick] = useState(() => Date.now())
  const abortRef = useRef<AbortController | null>(null)
  const highlightTimeoutsRef = useRef<Map<string, number>>(new Map())

  const { data: applications = [] } = useApplications()
  const lastScanQuery = useQuery({
    queryKey: ['scanner', 'last-scan'],
    queryFn: fetchLastScan,
  })
  const createApplication = useCreateApplication()

  const snapshot = lastScanQuery.data
  const usePersistedSnapshot =
    !isScanning &&
    liveJobs.length === 0 &&
    liveScanStatus === null &&
    Boolean(snapshot?.summary || snapshot?.jobs.length)
  const jobs = usePersistedSnapshot ? (snapshot?.jobs ?? []) : liveJobs
  const scanStatus = usePersistedSnapshot
    ? (snapshot?.summary ?? null)
    : liveScanStatus
  const retryCountdown =
    retryUntil === null
      ? null
      : Math.max(0, Math.ceil((retryUntil - retryTick) / 1000))

  const importedUrls = useMemo(() => {
    const urls = new Set<string>()
    for (const application of applications) {
      const jobUrl = application.job_url?.trim()
      if (jobUrl) urls.add(jobUrl)
    }
    return urls
  }, [applications])

  const applyLastScan = (snapshot: LastScanSnapshot) => {
    const hasSnapshot = Boolean(snapshot.summary) || snapshot.jobs.length > 0
    if (!hasSnapshot) return

    setLiveJobs(snapshot.jobs)
    setLiveScanStatus(snapshot.summary)
  }

  const highlightJob = (jobUrl: string) => {
    setHighlightedJobUrls((current) => new Set(current).add(jobUrl))

    const existingTimeout = highlightTimeoutsRef.current.get(jobUrl)
    if (existingTimeout !== undefined) {
      window.clearTimeout(existingTimeout)
    }

    const timeoutId = window.setTimeout(() => {
      setHighlightedJobUrls((current) => {
        const next = new Set(current)
        next.delete(jobUrl)
        return next
      })
      highlightTimeoutsRef.current.delete(jobUrl)
    }, JOB_HIGHLIGHT_MS)

    highlightTimeoutsRef.current.set(jobUrl, timeoutId)
  }

  useEffect(() => {
    const timeouts = highlightTimeoutsRef.current
    return () => {
      for (const timeoutId of timeouts.values()) {
        window.clearTimeout(timeoutId)
      }
      timeouts.clear()
    }
  }, [])

  useEffect(() => {
    if (retryUntil === null) return

    const intervalId = window.setInterval(() => {
      const now = Date.now()
      setRetryTick(now)
      if (now >= retryUntil) {
        setRetryUntil(null)
      }
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [retryUntil])

  const handleEvent = (event: ScannerSseEvent) => {
    switch (event.event) {
      case 'companies_synced': {
        const data = event.data as { total?: number }
        setLiveScanStatus(`Preparing ${data.total ?? 0} companies…`)
        break
      }
      case 'scan_started': {
        const data = event.data as { companies_total: number }
        setLiveScanStatus(`Scanning ${data.companies_total} company boards…`)
        break
      }
      case 'company_started': {
        const data = event.data as { company_name: string }
        setLiveScanStatus(`Scanning ${data.company_name}…`)
        break
      }
      case 'company_skipped': {
        const data = event.data as { company_name: string; reason: string }
        setLiveScanStatus(`Skipped ${data.company_name} (${data.reason})`)
        break
      }
      case 'job_found': {
        const job = event.data as ScannerJob
        setLiveJobs((current) => {
          if (current.some((row) => row.job_url === job.job_url)) return current
          queueMicrotask(() => highlightJob(job.job_url))
          return [...current, job]
        })
        break
      }
      case 'scan_complete': {
        const data = event.data as {
          jobs_emitted: number
          errors_count: number
        }
        setLiveScanStatus(
          formatScanCompleteSummary(data.jobs_emitted, data.errors_count),
        )
        void queryClient.invalidateQueries({
          queryKey: ['scanner', 'last-scan'],
        })
        break
      }
      default:
        break
    }
  }

  const startScan = async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setIsScanning(true)
    setLiveJobs([])
    setHighlightedJobUrls(new Set())
    setLiveScanStatus(null)

    try {
      await startScannerScan(handleEvent, controller.signal)
    } catch (err) {
      if (controller.signal.aborted) return

      if (err instanceof ScanLimitError) {
        const now = Date.now()
        setRetryTick(now)
        setRetryUntil(now + err.retryAfterSeconds * 1000)
        toast.error(
          `Scan limit reached. Try again in ${formatRetryAfter(err.retryAfterSeconds)}.`,
        )
        try {
          const snapshot = await queryClient.fetchQuery({
            queryKey: ['scanner', 'last-scan'],
            queryFn: fetchLastScan,
          })
          applyLastScan(snapshot)
        } catch {
          // Keep the page empty if the snapshot cannot be restored.
        }
        return
      }

      const message = err instanceof Error ? err.message : 'Scan failed'
      toast.error(message)
      setLiveScanStatus(message)
    } finally {
      if (!controller.signal.aborted) {
        setIsScanning(false)
      }
    }
  }

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

  const scanDisabled =
    isScanning || (retryCountdown !== null && retryCountdown > 0)
  const isLoadingLastScan = lastScanQuery.isPending && !isScanning

  return (
    <div className="flex-1 overflow-y-auto px-16 pt-16 pb-12 max-[1599px]:py-12">
      <PageHeader
        title="Scanner"
        subtitle="Scan tracked company boards for new roles that match your profile."
        right={
          <Button type="button" onClick={startScan} disabled={scanDisabled}>
            {isScanning ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : (
              <Radar data-icon="inline-start" />
            )}
            {isScanning
              ? 'Scanning…'
              : retryCountdown
                ? `Try again in ${formatRetryAfter(retryCountdown)}`
                : 'Scan for new jobs'}
          </Button>
        }
      />

      <ScanStatusPanel
        status={scanStatus}
        isLoading={isLoadingLastScan}
        isScanning={isScanning}
      />

      <section>
        <h2 className="mb-3 text-lg font-medium">Jobs found</h2>
        <ScanResultsTable
          jobs={jobs}
          importedUrls={importedUrls}
          importingUrl={importingUrl}
          highlightedJobUrls={highlightedJobUrls}
          isLoading={isLoadingLastScan}
          isScanning={isScanning}
          onImport={handleImport}
        />
      </section>
    </div>
  )
}
