import type { ScanActivityRecord } from '@/api/scanner'

export type LiveScanStats = {
  companiesTotal: number
  companiesProcessed: number
  currentCompany: string | null
  skippedCount: number
  errorsCount: number
}

export function createInitialLiveScanStats(): LiveScanStats {
  return {
    companiesTotal: 0,
    companiesProcessed: 0,
    currentCompany: null,
    skippedCount: 0,
    errorsCount: 0,
  }
}

export type ScanLiveSession = {
  activity: ScanActivityRecord[]
  stats: LiveScanStats
  elapsedSeconds: number
}

export function appendScanActivity(
  activity: ScanActivityRecord[],
  entry: Pick<ScanActivityRecord, 'company_name' | 'status' | 'detail'>,
): ScanActivityRecord[] {
  return [
    ...activity,
    {
      ...entry,
      recorded_at: new Date().toISOString(),
    },
  ]
}

export function formatCompanyFinishedDetail(data: {
  jobs_found?: number
  jobs_filtered?: number
  jobs_matching?: number
  jobs_new?: number
  error?: string | null
}): string {
  if (data.error) return data.error

  const matching =
    data.jobs_matching ??
    Math.max(0, (data.jobs_found ?? 0) - (data.jobs_filtered ?? 0))
  const newJobs = data.jobs_new ?? 0
  const alreadySeen = Math.max(0, matching - newJobs)

  const parts = [
    `${data.jobs_found ?? 0} on board`,
    `${data.jobs_filtered ?? 0} filtered`,
    `${matching} matched`,
    `${newJobs} new`,
  ]
  if (alreadySeen > 0) {
    parts.push(`${alreadySeen} already seen`)
  }
  return parts.join(' · ')
}

export type ScanStatusCardPhase =
  | 'loading'
  | 'scanning'
  | 'complete'
  | 'zero'
  | 'error'

export type ScanStatusCardViewModel = {
  phase: ScanStatusCardPhase
  title: string
  elapsedSeconds: number
  progress: number
  total: number
  currentCompany: string | null
  boardsChecked: number
  matched: number
  skipped: number
  errors: number
  companiesScanned: number
  rolesReviewed: number
  durationLabel: string | null
  finishedLabel: string | null
}

export function parseCompleteActivityDetail(detail: string): {
  jobsEmitted: number
  errorsCount: number
} {
  const match = detail.match(/^(\d+) new jobs,\s*(\d+) errors$/)
  if (!match) return { jobsEmitted: 0, errorsCount: 0 }
  return {
    jobsEmitted: Number(match[1]),
    errorsCount: Number(match[2]),
  }
}

export function parseBoardCountFromFinishedDetail(detail: string): number {
  const match = detail.match(/^(\d+) on board/)
  return match ? Number(match[1]) : 0
}

export function formatScanElapsed(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

export function formatScanDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return remainder > 0 ? `${minutes}m ${remainder}s` : `${minutes}m`
}

export function formatScanFinishedLabel(completedAt: string): string {
  const date = new Date(completedAt)
  if (Number.isNaN(date.getTime())) return ''

  const now = new Date()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  if (date.toDateString() === now.toDateString()) {
    return `Today ${hours}:${minutes}`
  }

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}/${date.getFullYear()} ${hours}:${minutes}`
}

function isScanCompleteStatus(scanStatus: string | null): boolean {
  return scanStatus?.startsWith('Scan complete') ?? false
}

function deriveScanDurationSeconds(
  activity: ScanActivityRecord[],
  elapsedSeconds: number,
  isScanning: boolean,
): number | null {
  if (isScanning && elapsedSeconds > 0) return elapsedSeconds
  if (activity.length === 0) return null

  const startMs = Date.parse(activity[0].recorded_at)
  const completeEntry = activity.find((entry) => entry.status === 'complete')
  const endMs = completeEntry
    ? Date.parse(completeEntry.recorded_at)
    : Date.parse(activity[activity.length - 1].recorded_at)

  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
    return elapsedSeconds > 0 ? elapsedSeconds : null
  }

  return Math.max(1, Math.round((endMs - startMs) / 1000))
}

function parseErrorsFromScanStatus(scanStatus: string | null): number {
  const match = scanStatus?.match(/\((\d+) errors?\)/)
  return match ? Number(match[1]) : 0
}

export function deriveScanStatusCardViewModel(input: {
  isScanning: boolean
  isLoading: boolean
  scanStatus: string | null
  scanCompletedAt: string | null
  jobCount: number
  session: ScanLiveSession
}): ScanStatusCardViewModel | null {
  const {
    isScanning,
    isLoading,
    scanStatus,
    scanCompletedAt,
    jobCount,
    session,
  } = input
  const { activity, stats, elapsedSeconds } = session

  const hasDisplayState =
    isLoading || isScanning || Boolean(scanStatus) || activity.length > 0
  if (!hasDisplayState) return null

  if (isLoading && !scanStatus && activity.length === 0) {
    return {
      phase: 'loading',
      title: 'Loading your last scan…',
      elapsedSeconds: 0,
      progress: 0,
      total: 0,
      currentCompany: null,
      boardsChecked: 0,
      matched: 0,
      skipped: 0,
      errors: 0,
      companiesScanned: 0,
      rolesReviewed: 0,
      durationLabel: null,
      finishedLabel: null,
    }
  }

  const completeEntry = activity.find((entry) => entry.status === 'complete')
  const completeParsed = completeEntry
    ? parseCompleteActivityDetail(completeEntry.detail)
    : null

  const finishedCount = activity.filter(
    (entry) => entry.status === 'finished',
  ).length
  const skippedFromActivity = activity.filter(
    (entry) => entry.status === 'skipped',
  ).length
  const rolesReviewed = activity
    .filter((entry) => entry.status === 'finished')
    .reduce(
      (sum, entry) => sum + parseBoardCountFromFinishedDetail(entry.detail),
      0,
    )

  const durationSeconds = deriveScanDurationSeconds(
    activity,
    elapsedSeconds,
    isScanning,
  )
  const durationLabel =
    durationSeconds !== null ? formatScanDuration(durationSeconds) : null
  const finishedLabel = scanCompletedAt
    ? formatScanFinishedLabel(scanCompletedAt)
    : completeEntry
      ? formatScanFinishedLabel(completeEntry.recorded_at)
      : null

  if (isScanning) {
    return {
      phase: 'scanning',
      title: 'Scanning career boards…',
      elapsedSeconds,
      progress: stats.companiesProcessed,
      total: stats.companiesTotal,
      currentCompany: stats.currentCompany,
      boardsChecked: stats.companiesProcessed,
      matched: jobCount,
      skipped: stats.skippedCount,
      errors: stats.errorsCount,
      companiesScanned: stats.companiesProcessed,
      rolesReviewed,
      durationLabel,
      finishedLabel,
    }
  }

  const isComplete =
    isScanCompleteStatus(scanStatus) || completeEntry !== undefined

  if (!isComplete && scanStatus) {
    return {
      phase: 'error',
      title: scanStatus,
      elapsedSeconds: 0,
      progress: 0,
      total: 0,
      currentCompany: null,
      boardsChecked: finishedCount + skippedFromActivity,
      matched: jobCount,
      skipped: skippedFromActivity,
      errors: 1,
      companiesScanned: finishedCount + skippedFromActivity,
      rolesReviewed,
      durationLabel,
      finishedLabel,
    }
  }

  if (!isComplete) return null

  const errorsCount =
    completeParsed?.errorsCount ?? parseErrorsFromScanStatus(scanStatus)
  const matched = jobCount || completeParsed?.jobsEmitted || 0
  const companiesScanned = finishedCount + skippedFromActivity

  let phase: ScanStatusCardPhase
  let title: string
  if (errorsCount > 0) {
    phase = 'error'
    title = 'Scan finished with errors'
  } else if (matched === 0) {
    phase = 'zero'
    title = 'Scan complete — no new matches'
  } else {
    phase = 'complete'
    title = `Scan complete — ${matched} new ${matched === 1 ? 'match' : 'matches'}`
  }

  return {
    phase,
    title,
    elapsedSeconds: 0,
    progress: companiesScanned,
    total: companiesScanned,
    currentCompany: null,
    boardsChecked: companiesScanned,
    matched,
    skipped: skippedFromActivity,
    errors: errorsCount,
    companiesScanned,
    rolesReviewed,
    durationLabel,
    finishedLabel,
  }
}
