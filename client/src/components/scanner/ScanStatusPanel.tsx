import { Loader2 } from 'lucide-react'

interface ScanStatusPanelProps {
  status: string | null
  isLoading?: boolean
  isScanning?: boolean
}

export function ScanStatusPanel({
  status,
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

  return (
    <div className="mb-6 rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-3">
        {showSpinner && (
          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
        )}
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}
