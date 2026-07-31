import { useMemo, useState } from 'react'
import { Check, Plus } from 'lucide-react'
import type { ScannerJob } from '@/api/scanner'
import { CompanyAvatar } from '@/components/tracker/CompanyAvatar'
import { ScannerSourceTag } from '@/components/scanner/ScannerSourceTag'
import { WorkStyleBadge } from '@/components/tracker/status/WorkStyleBadge'
import {
  SCAN_TABLE_ACTION_CELL,
  SCAN_TABLE_BODY_CELL,
  SCAN_TABLE_CHECK_CELL,
  SCAN_TABLE_HEAD_CELL,
} from '@/components/scanner/scanTableStyles'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

interface ScanResultsTableProps {
  jobs: ScannerJob[]
  importedUrls: Set<string>
  importingUrls: Set<string>
  highlightedJobUrls?: Set<string>
  onImport: (job: ScannerJob) => void
  onImportMany: (jobs: ScannerJob[]) => void
}

export function ScanResultsTable({
  jobs,
  importedUrls,
  importingUrls,
  highlightedJobUrls,
  onImport,
  onImportMany,
}: ScanResultsTableProps) {
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set())

  const selectableJobs = useMemo(
    () => jobs.filter((job) => !importedUrls.has(job.job_url)),
    [jobs, importedUrls],
  )

  const selectableUrls = useMemo(
    () => new Set(selectableJobs.map((job) => job.job_url)),
    [selectableJobs],
  )

  const selectedJobs = useMemo(
    () => selectableJobs.filter((job) => selectedUrls.has(job.job_url)),
    [selectableJobs, selectedUrls],
  )

  const allSelected =
    selectableJobs.length > 0 && selectedJobs.length === selectableJobs.length
  const someSelected =
    selectedJobs.length > 0 && selectedJobs.length < selectableJobs.length
  const isBulkImporting = selectedJobs.some((job) =>
    importingUrls.has(job.job_url),
  )

  if (jobs.length === 0) return null

  const toggleJob = (jobUrl: string) => {
    setSelectedUrls((current) => {
      const next = new Set(current)
      if (next.has(jobUrl)) next.delete(jobUrl)
      else next.add(jobUrl)
      return next
    })
  }

  const toggleAll = () => {
    setSelectedUrls(allSelected ? new Set() : new Set(selectableUrls))
  }

  const clearSelection = () => setSelectedUrls(new Set())

  const handleBulkImport = () => {
    if (selectedJobs.length === 0 || isBulkImporting) return
    onImportMany(selectedJobs)
    setSelectedUrls(new Set())
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {selectedJobs.length > 0 && (
        <div className="flex items-center gap-3 border-b border-brand-border bg-brand-soft px-4 py-2.5 text-[13px]">
          <span>
            <span className="font-semibold text-foreground">
              {selectedJobs.length}
            </span>{' '}
            selected
          </span>
          <div className="flex-1" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isBulkImporting}
            onClick={clearSelection}
          >
            Clear
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isBulkImporting}
            onClick={handleBulkImport}
          >
            <Plus data-icon="inline-start" />
            Add {selectedJobs.length} to tracker
          </Button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border-subtle">
              <th className={SCAN_TABLE_CHECK_CELL}>
                <Checkbox
                  aria-label="Select all jobs"
                  checked={
                    allSelected ? true : someSelected ? 'indeterminate' : false
                  }
                  disabled={selectableJobs.length === 0 || isBulkImporting}
                  onCheckedChange={toggleAll}
                />
              </th>
              <th className={SCAN_TABLE_HEAD_CELL}>Company</th>
              <th className={SCAN_TABLE_HEAD_CELL}>Role</th>
              <th className={SCAN_TABLE_HEAD_CELL}>Location</th>
              <th className={SCAN_TABLE_HEAD_CELL}>Work style</th>
              <th className={SCAN_TABLE_HEAD_CELL}>Source</th>
              <th className={SCAN_TABLE_ACTION_CELL} />
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => {
              const imported = importedUrls.has(job.job_url)
              const isImporting = importingUrls.has(job.job_url)
              const isHighlighted = highlightedJobUrls?.has(job.job_url)
              const isSelected = !imported && selectedUrls.has(job.job_url)

              return (
                <tr
                  key={job.job_url}
                  className={cn(
                    'border-b border-border/70',
                    isHighlighted && 'animate-scan-job-enter',
                  )}
                >
                  <td className={SCAN_TABLE_CHECK_CELL}>
                    <Checkbox
                      aria-label={`Select ${job.job_name} at ${job.company_name}`}
                      checked={isSelected}
                      disabled={imported || isImporting}
                      onCheckedChange={() => toggleJob(job.job_url)}
                    />
                  </td>
                  <td className={SCAN_TABLE_BODY_CELL}>
                    <div className="flex min-w-0 items-center gap-2.5">
                      <CompanyAvatar name={job.company_name} />
                      <span className="truncate font-medium text-foreground">
                        {job.company_name}
                      </span>
                    </div>
                  </td>
                  <td className={SCAN_TABLE_BODY_CELL}>
                    <a
                      href={job.job_url}
                      target="_blank"
                      rel="noreferrer"
                      className="line-clamp-2 text-brand hover:underline"
                    >
                      {job.job_name}
                    </a>
                  </td>
                  <td
                    className={`${SCAN_TABLE_BODY_CELL} text-muted-foreground`}
                  >
                    {job.location ?? '—'}
                  </td>
                  <td className={SCAN_TABLE_BODY_CELL}>
                    <WorkStyleBadge workStyle={job.work_style} />
                  </td>
                  <td className={SCAN_TABLE_BODY_CELL}>
                    <ScannerSourceTag source={job.source} />
                  </td>
                  <td className={SCAN_TABLE_ACTION_CELL}>
                    {imported ? (
                      <span className="inline-flex items-center justify-end gap-1.5 text-sm text-muted-foreground">
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
                        disabled={isImporting || isBulkImporting}
                        onClick={() => onImport(job)}
                      >
                        {!isImporting && <Plus data-icon="inline-start" />}
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
    </div>
  )
}
