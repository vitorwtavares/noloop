import { Loader2 } from 'lucide-react'

interface ScanStatusPanelProps {
  status: string | null
  completedAt?: string | null
  isLoading?: boolean
  isScanning?: boolean
}

function formatLastScanTimestamp(completedAt: string): string {
  const date = new Date(completedAt)
  if (Number.isNaN(date.getTime())) return ''

  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()

  return `${hours}:${minutes} - ${day}/${month}/${year}`
}

export function ScanStatusPanel({
  status,
  completedAt = null,
  isLoading = false,
  isScanning = false,
}: ScanStatusPanelProps) {
  const showPanel = isLoading || isScanning || Boolean(status)
  if (!showPanel) return null

  const message =
    isLoading && !status
      ? 'Loading your last scan…'
      : (status ?? 'Starting scan…')
  const showSpinner = isLoading || isScanning
  const timestamp =
    status?.startsWith('Scan complete') && completedAt
      ? formatLastScanTimestamp(completedAt)
      : null

  return (
    <div className="mb-6 rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-3">
        {showSpinner && (
          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
        )}
        <p className="text-sm text-muted-foreground">
          {message}
          {timestamp && (
            <>
              <span
                aria-hidden="true"
                className="px-1.5 text-muted-foreground/35"
              >
                ·
              </span>
              <span className="text-muted-foreground/55">{timestamp}</span>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
