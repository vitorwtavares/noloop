import { Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ScannerJob } from '@/api/scanner'
import {
  SCAN_TABLE_BODY_CELL,
  SCAN_TABLE_HEAD_CELL,
} from '@/components/scanner/scanTableStyles'
import { cn } from '@/lib/utils'
import { ScanTableSkeleton } from '@/components/scanner/ScanTableSkeleton'

interface ScanResultsTableProps {
  jobs: ScannerJob[]
  importedUrls: Set<string>
  importingUrl: string | null
  highlightedJobUrls?: Set<string>
  isLoading?: boolean
  isScanning?: boolean
  onImport: (job: ScannerJob) => void
}

export function ScanResultsTable({
  jobs,
  importedUrls,
  importingUrl,
  highlightedJobUrls,
  isLoading = false,
  isScanning = false,
  onImport,
}: ScanResultsTableProps) {
  if (isLoading) {
    return <ScanTableSkeleton rows={4} columns={6} />
  }

  if (jobs.length === 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        {isScanning ? (
          <>
            <Loader2 className="size-4 shrink-0 animate-spin" />
            Matching roles will appear here as they are found.
          </>
        ) : (
          'No matching jobs yet. Start a scan to find new openings.'
        )}
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border-subtle">
            <th className={SCAN_TABLE_HEAD_CELL}>Company</th>
            <th className={SCAN_TABLE_HEAD_CELL}>Role</th>
            <th className={SCAN_TABLE_HEAD_CELL}>Location</th>
            <th className={SCAN_TABLE_HEAD_CELL}>Tier</th>
            <th className={SCAN_TABLE_HEAD_CELL}>Source</th>
            <th className={SCAN_TABLE_HEAD_CELL}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => {
            const imported = importedUrls.has(job.job_url)
            const isImporting = importingUrl === job.job_url
            const isHighlighted = highlightedJobUrls?.has(job.job_url)

            return (
              <tr
                key={job.job_url}
                className={cn(
                  'border-b border-border/70',
                  isHighlighted && 'animate-scan-job-enter',
                )}
              >
                <td className={SCAN_TABLE_BODY_CELL}>{job.company_name}</td>
                <td className={SCAN_TABLE_BODY_CELL}>
                  <a
                    href={job.job_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand hover:underline"
                  >
                    {job.job_name}
                  </a>
                </td>
                <td className={`${SCAN_TABLE_BODY_CELL} text-muted-foreground`}>
                  {job.location ?? '—'}
                </td>
                <td className={SCAN_TABLE_BODY_CELL}>{job.tier ?? '—'}</td>
                <td className={`${SCAN_TABLE_BODY_CELL} text-muted-foreground`}>
                  {job.source}
                </td>
                <td className={SCAN_TABLE_BODY_CELL}>
                  {imported ? (
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Check
                        size={14}
                        className="shrink-0 text-brand"
                        aria-hidden="true"
                      />
                      In tracker
                    </span>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isImporting}
                      onClick={() => onImport(job)}
                    >
                      {isImporting ? 'Adding…' : 'Add to tracker'}
                    </Button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
