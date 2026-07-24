import { Activity, SkipForward } from 'lucide-react'
import type { ScanActivityRecord } from '@/api/scanner'
import {
  toScanRailEntries,
  type ScanRailEntry,
} from '@/components/scanner/scanLiveState'
import { cn } from '@/lib/utils'

type Props = {
  activity: ScanActivityRecord[]
  isScanning: boolean
}

const NODE_STYLES: Record<ScanRailEntry['status'], string> = {
  running:
    'animate-scanner-pulse bg-brand shadow-[0_0_0_3px_var(--brand-soft)]',
  finished: 'bg-success shadow-[0_0_0_3px_var(--success-soft-strong)]',
  skipped: 'border-[1.5px] border-warning/60 bg-transparent',
  error: 'bg-danger shadow-[0_0_0_3px_var(--danger-soft-fill)]',
}

function RailEntryDetail({ entry }: { entry: ScanRailEntry }) {
  if (entry.status === 'running') {
    return <p className="mt-[3px] text-[11.5px] text-brand">Checking board…</p>
  }

  if (entry.status === 'skipped') {
    return (
      <p className="mt-[3px] inline-flex items-center gap-1.5 text-[11px] text-warning">
        <SkipForward aria-hidden="true" className="size-3 shrink-0" />
        {entry.detail}
      </p>
    )
  }

  if (entry.counts === null) {
    return (
      <p className="mt-[3px] text-[11.5px] leading-normal text-danger">
        {entry.detail}
      </p>
    )
  }

  const { onBoard, filtered, matched, newJobs } = entry.counts

  return (
    <p className="mt-[3px] text-[11.5px] leading-normal text-muted-foreground/70">
      <span className="text-muted-foreground tabular-nums">
        {onBoard} on board
      </span>{' '}
      ·{' '}
      <span className="text-muted-foreground tabular-nums">
        {filtered} filtered
      </span>{' '}
      ·{' '}
      <span className="text-muted-foreground tabular-nums">
        {matched} matched
      </span>
      {newJobs > 0 && (
        <>
          {' '}
          · <span className="font-medium text-brand">{newJobs} new</span>
        </>
      )}
    </p>
  )
}

export function ScannerActivityRail({ activity, isScanning }: Props) {
  const entries = toScanRailEntries(activity)

  return (
    <aside className="sticky top-0 overflow-hidden rounded-[14px] border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-3.5">
        <Activity
          aria-hidden="true"
          className="size-[15px] shrink-0 text-muted-foreground"
        />
        <h3 className="text-[13.5px] font-semibold">
          {isScanning ? 'Live activity' : 'Activity log'}
        </h3>
        {isScanning && (
          <span className="ms-auto inline-flex items-center gap-1.5 text-[11px] font-medium text-brand">
            <span
              aria-hidden="true"
              className="size-1.5 animate-scanner-pulse rounded-full bg-brand"
            />
            Live
          </span>
        )}
      </div>

      <div className="max-h-[560px] overflow-y-auto">
        {entries.length === 0 ? (
          <p className="px-4 py-5 text-[12.5px] text-muted-foreground">
            {isScanning
              ? 'Waiting for the first board…'
              : 'No activity from your last scan.'}
          </p>
        ) : (
          entries.map((entry, index) => (
            <div
              key={entry.companyName}
              className="flex gap-[11px] border-b border-border-subtle px-4 py-[11px] last:border-b-0"
            >
              <div className="flex flex-col items-center pt-[5px]">
                <span
                  aria-hidden="true"
                  className={cn(
                    'size-[9px] shrink-0 rounded-full',
                    NODE_STYLES[entry.status],
                  )}
                />
                {index < entries.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="-mb-[11px] w-px flex-1 bg-border-subtle"
                  />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">
                  {entry.companyName}
                </p>
                <RailEntryDetail entry={entry} />
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  )
}
