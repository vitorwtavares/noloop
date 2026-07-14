import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ScannerJob } from '@/api/scanner'
import { TH } from '@/components/tracker/styles'
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
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border-subtle bg-background">
            <th className={`${TH} px-4`}>Company</th>
            <th className={`${TH} px-4`}>Role</th>
            <th className={`${TH} px-4`}>Location</th>
            <th className={`${TH} px-4`}>Tier</th>
            <th className={`${TH} px-4`}>Source</th>
            <th className={`${TH} px-4`}>Actions</th>
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
                <td className="px-4 py-3">{job.company_name}</td>
                <td className="px-4 py-3">
                  <a
                    href={job.job_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand hover:underline"
                  >
                    {job.job_name}
                  </a>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {job.location ?? '—'}
                </td>
                <td className="px-4 py-3">{job.tier ?? '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {job.source}
                </td>
                <td className="px-4 py-3">
                  {imported ? (
                    <span className="text-xs text-muted-foreground">
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
