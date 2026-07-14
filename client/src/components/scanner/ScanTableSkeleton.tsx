import { Skeleton } from '@/components/ui/skeleton'
import {
  SCAN_TABLE_BODY_CELL,
  SCAN_TABLE_HEAD_CELL,
} from '@/components/scanner/scanTableStyles'

interface ScanTableSkeletonProps {
  rows?: number
  columns?: number
}

export function ScanTableSkeleton({
  rows = 4,
  columns = 6,
}: ScanTableSkeletonProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border-subtle">
            {Array.from({ length: columns }).map((_, index) => (
              <th key={index} className={SCAN_TABLE_HEAD_CELL}>
                <Skeleton className="h-3.5 w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className="border-b border-border/70">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className={SCAN_TABLE_BODY_CELL}>
                  <Skeleton className="h-4 w-full max-w-[180px]" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
