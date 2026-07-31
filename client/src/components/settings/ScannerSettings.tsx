import { useState } from 'react'
import { toast } from 'sonner'
import { clearScannerShownHistory } from '@/api/scanner'
import { Button } from '@/components/ui/button'
import { ClearScannerHistoryDialog } from '@/components/settings/ClearScannerHistoryDialog'
import { DangerZone } from '@/components/settings/DangerZone'
import { SettingRow } from './SettingRow'

export function ScannerSettings() {
  const [clearOpen, setClearOpen] = useState(false)
  const [isClearing, setIsClearing] = useState(false)

  async function handleClearHistory() {
    setIsClearing(true)
    try {
      const { deleted_count: deletedCount } = await clearScannerShownHistory()
      setClearOpen(false)
      toast.success(
        deletedCount === 1
          ? 'Cleared 1 shown job record.'
          : `Cleared ${deletedCount} shown job records.`,
      )
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to clear shown job history.',
      )
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <div className="flex flex-col">
      <h2 className="text-lg font-semibold tracking-tight">Scanner</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Manage scanner data stored outside your application tracker.
      </p>

      <DangerZone>
        <SettingRow
          title="Clear shown job history"
          description="Let previously shown scanner matches appear again on your next scan."
        >
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setClearOpen(true)}
          >
            Clear history
          </Button>
        </SettingRow>
      </DangerZone>

      <ClearScannerHistoryDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        isClearing={isClearing}
        onConfirm={handleClearHistory}
      />
    </div>
  )
}
