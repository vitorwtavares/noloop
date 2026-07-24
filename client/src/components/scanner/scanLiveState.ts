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
