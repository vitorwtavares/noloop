import type { ScanActivityRecord } from '@/api/scanner'
import {
  parseCompleteActivityDetail,
  toScanRailEntries,
} from '@/components/scanner/scanLiveState'
import {
  formatBoardFetchError,
  SCAN_BOARD_ERROR_URL_TIP,
} from '@/components/scanner/scannerUtils'

export type ScannerPageState =
  | 'idle-no-scan'
  | 'scanning'
  | 'complete-with-jobs'
  | 'complete-zero'
  | 'error'

function parseErrorsFromScanStatus(scanStatus: string | null): number {
  const match = scanStatus?.match(/\((\d+) errors?\)/)
  return match ? Number(match[1]) : 0
}

function hasCompletedScan(
  scanStatus: string | null,
  activity: ScanActivityRecord[],
): boolean {
  return (
    (scanStatus?.startsWith('Scan complete') ?? false) ||
    activity.some((entry) => entry.status === 'complete')
  )
}

function scanErrorCount(
  scanStatus: string | null,
  activity: ScanActivityRecord[],
): number {
  const completeEntry = activity.find((entry) => entry.status === 'complete')
  if (completeEntry) {
    return parseCompleteActivityDetail(completeEntry.detail).errorsCount
  }
  return parseErrorsFromScanStatus(scanStatus)
}

export function deriveScannerPageState(input: {
  isScanning: boolean
  isLoadingLastScan: boolean
  scanStatus: string | null
  jobCount: number
  activity: ScanActivityRecord[]
}): ScannerPageState {
  const { isScanning, isLoadingLastScan, scanStatus, jobCount, activity } =
    input

  if (isScanning) return 'scanning'

  const completed = hasCompletedScan(scanStatus, activity)
  if (
    !completed &&
    !isLoadingLastScan &&
    !scanStatus &&
    activity.length === 0
  ) {
    return 'idle-no-scan'
  }

  if (!completed && !isScanning && scanStatus) {
    return jobCount > 0 ? 'complete-with-jobs' : 'error'
  }

  if (!completed) {
    return jobCount > 0 ? 'complete-with-jobs' : 'idle-no-scan'
  }

  const errors = scanErrorCount(scanStatus, activity)
  if (errors > 0) return 'error'
  if (jobCount === 0) return 'complete-zero'
  return 'complete-with-jobs'
}

export type ScanErrorBannerModel = {
  errorCount: number
  headline: string
  detail: string
  tip: string
}

export function deriveScanErrorBanner(
  activity: ScanActivityRecord[],
  scanStatus: string | null,
): ScanErrorBannerModel | null {
  const errorCount = scanErrorCount(scanStatus, activity)
  if (errorCount === 0) return null

  const failedEntries = toScanRailEntries(activity).filter(
    (entry) => entry.status === 'error',
  )
  const first = failedEntries[0]

  if (errorCount === 1 && first) {
    const reason = first.detail
      ? formatBoardFetchError(first.detail)
      : 'Unknown error'
    return {
      errorCount,
      headline: '1 board failed',
      detail: `${first.companyName}'s board failed — ${reason}. It'll be retried on your next scan.`,
      tip: SCAN_BOARD_ERROR_URL_TIP,
    }
  }

  return {
    errorCount,
    headline: `${errorCount} boards failed`,
    detail: "They'll be retried on your next scan. Everything else completed.",
    tip: SCAN_BOARD_ERROR_URL_TIP,
  }
}
