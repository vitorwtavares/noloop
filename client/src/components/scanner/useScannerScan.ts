import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ScanLimitError,
  fetchLastScan,
  startScannerScan,
  type LastScanSnapshot,
  type ScanActivityRecord,
  type ScannerJob,
  type ScannerSseEvent,
} from '@/api/scanner'
import {
  appendScanActivity,
  createInitialLiveScanStats,
  formatCompanyFinishedDetail,
  type LiveScanStats,
  type ScanLiveSession,
} from '@/components/scanner/scanLiveState'
import {
  activeRetryUntil,
  cooldownRetryUntil,
  formatRetryAfter,
  formatScanCompleteSummary,
  formatScannerReason,
  JOB_HIGHLIGHT_MS,
} from '@/components/scanner/scannerUtils'

type Options = {
  snapshot: LastScanSnapshot | undefined
  isLastScanPending: boolean
}

export function useScannerScan({ snapshot, isLastScanPending }: Options) {
  const queryClient = useQueryClient()
  const [isScanning, setIsScanning] = useState(false)
  const [liveJobs, setLiveJobs] = useState<ScannerJob[]>([])
  const [highlightedJobUrls, setHighlightedJobUrls] = useState<Set<string>>(
    new Set(),
  )
  const [liveScanStatus, setLiveScanStatus] = useState<string | null>(null)
  const [liveCompletedAt, setLiveCompletedAt] = useState<string | null>(null)
  const [liveActivity, setLiveActivity] = useState<ScanActivityRecord[]>([])
  const [liveScanStats, setLiveScanStats] = useState<LiveScanStats>(
    createInitialLiveScanStats,
  )
  const [scanStartedAt, setScanStartedAt] = useState<number | null>(null)
  const [scanTick, setScanTick] = useState(0)
  const [retryUntil, setRetryUntil] = useState<number | null>(null)
  const [retryTick, setRetryTick] = useState(() => Date.now())
  const abortRef = useRef<AbortController | null>(null)
  const highlightTimeoutsRef = useRef<Map<string, number>>(new Map())

  const usePersistedSnapshot =
    !isScanning &&
    liveJobs.length === 0 &&
    liveScanStatus === null &&
    liveActivity.length === 0 &&
    Boolean(snapshot?.summary || snapshot?.jobs.length)

  const jobs = usePersistedSnapshot ? (snapshot?.jobs ?? []) : liveJobs
  const activity = usePersistedSnapshot
    ? (snapshot?.activity ?? [])
    : liveActivity
  const scanStatus = usePersistedSnapshot
    ? (snapshot?.summary ?? null)
    : liveScanStatus
  const scanCompletedAt = usePersistedSnapshot
    ? (snapshot?.completed_at ?? null)
    : (liveCompletedAt ?? snapshot?.completed_at ?? null)

  const snapshotCooldownUntil = useMemo(
    () =>
      cooldownRetryUntil(
        snapshot?.completed_at,
        snapshot?.scan_cooldown_hours ?? 0,
      ),
    [snapshot?.completed_at, snapshot?.scan_cooldown_hours],
  )

  const effectiveRetryUntil = useMemo(
    () => activeRetryUntil(retryTick, retryUntil, snapshotCooldownUntil),
    [retryTick, retryUntil, snapshotCooldownUntil],
  )

  const retryCountdown =
    effectiveRetryUntil === null
      ? null
      : Math.max(0, Math.ceil((effectiveRetryUntil - retryTick) / 1000))

  const elapsedSeconds = isScanning ? scanTick : 0

  const scanLiveSession: ScanLiveSession = {
    activity,
    stats: liveScanStats,
    elapsedSeconds,
  }

  const isLoadingLastScan = isLastScanPending && !isScanning
  const scanDisabled =
    isScanning ||
    isLoadingLastScan ||
    (retryCountdown !== null && retryCountdown > 0)
  const scanButtonLabel =
    retryCountdown !== null && retryCountdown > 0
      ? `Try again in ${formatRetryAfter(retryCountdown)}`
      : 'Scan for new jobs'

  const applyLastScan = (nextSnapshot: LastScanSnapshot) => {
    const hasSnapshot =
      Boolean(nextSnapshot.summary) ||
      nextSnapshot.jobs.length > 0 ||
      nextSnapshot.activity.length > 0
    if (!hasSnapshot) return

    setLiveJobs(nextSnapshot.jobs)
    setLiveScanStatus(nextSnapshot.summary)
    setLiveCompletedAt(nextSnapshot.completed_at)
    setLiveActivity(nextSnapshot.activity)
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
    if (effectiveRetryUntil === null) return

    const intervalId = window.setInterval(() => {
      const now = Date.now()
      setRetryTick(now)
      if (now >= effectiveRetryUntil) {
        setRetryUntil(null)
      }
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [effectiveRetryUntil])

  useEffect(() => {
    if (!isScanning || scanStartedAt === null) return

    const intervalId = window.setInterval(() => {
      setScanTick((tick) => tick + 1)
    }, 1000)
    return () => window.clearInterval(intervalId)
  }, [isScanning, scanStartedAt])

  const handleEvent = (event: ScannerSseEvent) => {
    switch (event.event) {
      case 'companies_synced': {
        const data = event.data as { total?: number }
        setLiveScanStatus(`Preparing ${data.total ?? 0} companies…`)
        setLiveActivity((current) =>
          appendScanActivity(current, {
            company_name: '—',
            status: 'synced',
            detail: `${data.total ?? 0} companies ready to scan`,
          }),
        )
        break
      }
      case 'scan_started': {
        const data = event.data as { companies_total: number }
        setLiveScanStats((current) => ({
          ...current,
          companiesTotal: data.companies_total,
        }))
        setLiveScanStatus(`Scanning ${data.companies_total} company boards…`)
        setLiveActivity((current) =>
          appendScanActivity(current, {
            company_name: '—',
            status: 'started',
            detail: `Scan started for ${data.companies_total} companies`,
          }),
        )
        break
      }
      case 'company_started': {
        const data = event.data as { company_name: string }
        setLiveScanStats((current) => ({
          ...current,
          currentCompany: data.company_name,
        }))
        setLiveScanStatus(`Scanning ${data.company_name}…`)
        setLiveActivity((current) =>
          appendScanActivity(current, {
            company_name: data.company_name,
            status: 'started',
            detail: 'Fetching board…',
          }),
        )
        break
      }
      case 'company_skipped': {
        const data = event.data as { company_name: string; reason: string }
        setLiveScanStats((current) => ({
          ...current,
          companiesProcessed: current.companiesProcessed + 1,
          currentCompany: null,
          skippedCount: current.skippedCount + 1,
        }))
        setLiveScanStatus(
          `Skipped ${data.company_name} (${formatScannerReason(data.reason)})`,
        )
        setLiveActivity((current) =>
          appendScanActivity(current, {
            company_name: data.company_name,
            status: 'skipped',
            detail: data.reason,
          }),
        )
        break
      }
      case 'company_finished': {
        const data = event.data as {
          company_name: string
          jobs_found?: number
          jobs_filtered?: number
          jobs_matching?: number
          jobs_new?: number
          error?: string | null
        }
        setLiveScanStats((current) => ({
          ...current,
          companiesProcessed: current.companiesProcessed + 1,
          currentCompany: null,
          errorsCount: data.error
            ? current.errorsCount + 1
            : current.errorsCount,
        }))
        setLiveActivity((current) =>
          appendScanActivity(current, {
            company_name: data.company_name,
            status: 'finished',
            detail: formatCompanyFinishedDetail(data),
          }),
        )
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
        setLiveScanStats((current) => ({
          ...current,
          currentCompany: null,
          errorsCount: data.errors_count,
        }))
        setLiveScanStatus(
          formatScanCompleteSummary(data.jobs_emitted, data.errors_count),
        )
        setLiveCompletedAt(new Date().toISOString())
        setLiveActivity((current) =>
          appendScanActivity(current, {
            company_name: '—',
            status: 'complete',
            detail: `${data.jobs_emitted} new jobs, ${data.errors_count} errors`,
          }),
        )
        if ((snapshot?.scan_cooldown_hours ?? 0) > 0) {
          const now = Date.now()
          setRetryTick(now)
          setRetryUntil(now + (snapshot?.scan_cooldown_hours ?? 0) * 3_600_000)
        }
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
    setLiveCompletedAt(null)
    setLiveActivity([])
    setLiveScanStats(createInitialLiveScanStats())
    setScanStartedAt(Date.now())
    setScanTick(0)

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
          const nextSnapshot = await queryClient.fetchQuery({
            queryKey: ['scanner', 'last-scan'],
            queryFn: fetchLastScan,
          })
          applyLastScan(nextSnapshot)
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

  return {
    jobs,
    scanLiveSession,
    scanStatus,
    scanCompletedAt,
    isScanning,
    isLoadingLastScan,
    scanDisabled,
    scanButtonLabel,
    highlightedJobUrls,
    startScan,
  }
}
