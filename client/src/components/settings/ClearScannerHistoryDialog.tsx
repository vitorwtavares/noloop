import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { TypeToConfirmLabel } from '@/components/settings/TypeToConfirmLabel'

const CONFIRM_TEXT = 'CLEAR'

interface ClearScannerHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isClearing: boolean
  onConfirm: () => void
}

export function ClearScannerHistoryDialog({
  open,
  onOpenChange,
  isClearing,
  onConfirm,
}: ClearScannerHistoryDialogProps) {
  const [confirmText, setConfirmText] = useState('')

  const canClear =
    confirmText.trim().toUpperCase() === CONFIRM_TEXT && !isClearing

  return (
    <AlertDialog
      open={open}
      onOpenChange={(value) => {
        if (isClearing) return
        if (!value) setConfirmText('')
        onOpenChange(value)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Clear shown job history?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the scanner&apos;s memory of jobs it has already shown
            you. Your next scan can surface those roles again. Jobs already in
            your tracker are still excluded. Your match filters and enabled
            companies are not affected.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-1.5">
          <TypeToConfirmLabel
            htmlFor="clear-scanner-history-confirm"
            confirmText={CONFIRM_TEXT}
          />
          <Input
            id="clear-scanner-history-confirm"
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            autoComplete="off"
            disabled={isClearing}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={!canClear}
            onClick={(event) => {
              event.preventDefault()
              onConfirm()
            }}
          >
            {isClearing ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Clearing…
              </>
            ) : (
              'Clear history'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
