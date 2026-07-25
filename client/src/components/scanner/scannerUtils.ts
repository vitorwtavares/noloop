import type { ScannerFilters, ScannerSetupCompany } from '@/api/scanner'

export function scannerReadinessCounts(companies: ScannerSetupCompany[]) {
  const scannable = companies.filter((company) =>
    Boolean(company.careers_url?.trim()),
  )

  return {
    readyCount: scannable.filter((company) => company.scanner_enabled).length,
    missingCount: companies.length - scannable.length,
  }
}

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

const HTTP_STATUS_LABELS: Record<number, string> = {
  400: 'Bad request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not found',
  408: 'Request timeout',
  429: 'Too many requests',
  500: 'Server error',
  502: 'Bad gateway',
  503: 'Service unavailable',
  504: 'Gateway timeout',
}

/** Turns raw scanner fetch errors (e.g. "HTTP 404") into user-facing copy. */
export function formatBoardFetchError(message: string): string {
  const httpMatch = message.match(/^HTTP (\d{3})$/i)
  if (httpMatch) {
    const code = Number(httpMatch[1])
    return HTTP_STATUS_LABELS[code] ?? `Request failed (${code})`
  }

  if (/^timeout after/i.test(message)) {
    return 'Request timed out'
  }

  return message
}

export const SCAN_BOARD_ERROR_URL_TIP =
  'Double-check the careers URL is correct in Applications.'

export function workStyleFromScanner(
  value: string | null,
): 'remote' | 'hybrid' | 'on-site' | null {
  if (!value) return null
  if (value === 'remote') return 'remote'
  if (value === 'hybrid') return 'hybrid'
  if (value === 'on-site' || value === 'onsite') return 'on-site'
  return null
}
