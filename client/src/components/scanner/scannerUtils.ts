import type { ScannerFilters } from '@/api/scanner'

export const JOB_HIGHLIGHT_MS = 700

export const EMPTY_SCANNER_FILTERS: ScannerFilters = {
  title: { positive: [], negative: [] },
  location: [],
}

// A scan needs something to match on and somewhere to match it, so both are
// required before the scan button unlocks (also enforced server-side).
export function scannerFiltersAreValid(filters: ScannerFilters): boolean {
  return filters.title.positive.length > 0 && filters.location.length > 0
}

export function cooldownRetryUntil(
  completedAt: string | null | undefined,
  cooldownHours: number,
): number | null {
  if (!completedAt || cooldownHours <= 0) return null

  const completedMs = Date.parse(completedAt)
  if (Number.isNaN(completedMs)) return null

  return completedMs + cooldownHours * 3_600_000
}

export function activeRetryUntil(
  now: number,
  ...candidates: Array<number | null | undefined>
): number | null {
  const active = candidates.filter(
    (value): value is number =>
      value !== null && value !== undefined && value > now,
  )
  if (active.length === 0) return null
  return Math.max(...active)
}

export function formatRetryAfter(seconds: number): string {
  if (seconds <= 0) return 'soon'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export function formatScanCompleteSummary(
  jobsEmitted: number,
  errorsCount: number,
): string {
  const jobLabel = jobsEmitted === 1 ? 'job' : 'jobs'
  const errorLabel = errorsCount === 1 ? 'error' : 'errors'
  return `Scan complete: ${jobsEmitted} new ${jobLabel} found (${errorsCount} ${errorLabel})`
}

export function workStyleFromScanner(
  value: string | null,
): 'remote' | 'hybrid' | 'on-site' | null {
  if (!value) return null
  if (value === 'remote') return 'remote'
  if (value === 'hybrid') return 'hybrid'
  if (value === 'on-site' || value === 'onsite') return 'on-site'
  return null
}
