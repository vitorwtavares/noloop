import { AlertCircle, CheckCircle2, Loader2, Radar } from 'lucide-react'
import { ScannerStatusIcon } from '@/components/scanner/ScannerStatusIcon'
import {
  deriveScanStatusCardViewModel,
  formatScanElapsed,
  type ScanLiveSession,
} from '@/components/scanner/scanLiveState'
import { cn } from '@/lib/utils'

type Props = {
  isScanning: boolean
  isLoading?: boolean
  scanStatus: string | null
  scanCompletedAt: string | null
  jobCount: number
  scanLiveSession: ScanLiveSession
}

function StatBlock({
  value,
  label,
  valueClassName,
}: {
  value: number
  label: string
  valueClassName?: string
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className={cn(
          'font-mono text-xl leading-none font-semibold tracking-tight',
          valueClassName,
        )}
      >
        {value}
      </span>
      <span className="text-xs tracking-[0.06em] text-muted-foreground uppercase">
        {label}
      </span>
    </div>
  )
}

export function ScanStatusCard({
  isScanning,
  isLoading = false,
  scanStatus,
  scanCompletedAt,
  jobCount,
  scanLiveSession,
}: Props) {
  const viewModel = deriveScanStatusCardViewModel({
    isScanning,
    isLoading,
    scanStatus,
    scanCompletedAt,
    jobCount,
    session: scanLiveSession,
  })

  if (!viewModel) return null

  const progressPercent =
    viewModel.total > 0
      ? Math.min(100, Math.round((viewModel.progress / viewModel.total) * 100))
      : 0

  if (viewModel.phase === 'loading') {
    return (
      <div className="mb-6 rounded-[14px] border border-border bg-card px-5 py-5">
        <div className="flex items-center gap-3">
          <Loader2
            aria-hidden="true"
            className="size-4 shrink-0 animate-spin text-muted-foreground"
          />
          <p className="text-[15px] text-muted-foreground">{viewModel.title}</p>
        </div>
      </div>
    )
  }

  if (viewModel.phase === 'scanning') {
    return (
      <div className="scanner-status-card scanner-status-card--scanning mb-6 rounded-[14px] border px-5 py-5">
        <div className="flex items-center gap-3">
          <ScannerStatusIcon variant="brand">
            <Radar className="size-[19px] animate-[spin_2s_linear_infinite]" />
          </ScannerStatusIcon>
          <div className="min-w-0 flex-1">
            <p className="text-[17px] font-semibold tracking-tight">
              {viewModel.title}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Streaming matches as each board is checked. Safe to leave —
              results are saved.
            </p>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-mono text-2xl leading-none font-medium tracking-tight">
              {formatScanElapsed(viewModel.elapsedSeconds)}
            </div>
            <div className="mt-0.5 text-xs tracking-[0.08em] text-muted-foreground uppercase">
              elapsed
            </div>
          </div>
        </div>

        <div className="mt-[18px]">
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <span className="inline-flex items-center gap-1.5 font-medium text-brand">
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-brand"
              />
              {viewModel.currentCompany
                ? `Scanning ${viewModel.currentCompany}…`
                : 'Starting…'}
            </span>
            <span className="font-mono text-muted-foreground">
              <span className="text-foreground">{viewModel.progress}</span>
              {viewModel.total > 0 ? ` / ${viewModel.total} companies` : ''}
            </span>
          </div>
          <div className="h-[7px] overflow-hidden rounded-full bg-muted/40">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand to-brand/80 transition-[width] duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="mt-[18px] flex flex-wrap gap-[22px] border-t border-border-subtle pt-4">
          <StatBlock value={viewModel.boardsChecked} label="boards checked" />
          <StatBlock
            value={viewModel.matched}
            label="roles matched"
            valueClassName="text-brand"
          />
          <StatBlock value={viewModel.skipped} label="skipped" />
        </div>
      </div>
    )
  }

  const isError = viewModel.phase === 'error'
  const isZero = viewModel.phase === 'zero'

  return (
    <div
      className={cn(
        'mb-6 rounded-[14px] border bg-card px-5 py-5',
        isError ? 'border-danger/30' : 'border-border',
      )}
    >
      <div className="flex items-center gap-3">
        <ScannerStatusIcon variant={isError ? 'err' : 'ok'}>
          {isError ? (
            <AlertCircle className="size-[19px]" />
          ) : (
            <CheckCircle2 className="size-[19px]" />
          )}
        </ScannerStatusIcon>
        <div className="min-w-0 flex-1">
          <p className="text-[17px] font-semibold tracking-tight">
            {viewModel.title}
          </p>
          {viewModel.finishedLabel && viewModel.durationLabel && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              <span className="font-medium text-foreground/80">
                {viewModel.companiesScanned} companies
              </span>{' '}
              scanned ·{' '}
              <span className="font-medium text-foreground/80">
                {viewModel.rolesReviewed} roles
              </span>{' '}
              reviewed · finished{' '}
              <span className="font-medium text-foreground/80">
                {viewModel.finishedLabel}
              </span>{' '}
              in {viewModel.durationLabel}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-5">
          <StatBlock
            value={viewModel.matched}
            label="matched"
            valueClassName={isZero || isError ? undefined : 'text-success'}
          />
          <StatBlock value={viewModel.skipped} label="skipped" />
          {isError && (
            <StatBlock
              value={viewModel.errors}
              label="errors"
              valueClassName="text-danger"
            />
          )}
        </div>
      </div>
    </div>
  )
}
