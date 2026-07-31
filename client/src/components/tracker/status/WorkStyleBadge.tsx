import type { ReactNode } from 'react'
import { Badge } from './Badge'
import {
  normalizeWorkStyle,
  WORK_STYLE_CONFIG,
  type WorkStyleValue,
} from './workStyleConfig'

interface WorkStyleBadgeProps {
  workStyle: string | null | undefined
  emptyFallback?: ReactNode
}

export function WorkStyleBadge({
  workStyle,
  emptyFallback = <span className="text-muted-foreground">—</span>,
}: WorkStyleBadgeProps) {
  const normalized = normalizeWorkStyle(workStyle)
  if (!normalized) {
    if (workStyle?.trim()) {
      return (
        <Badge bg="var(--border-overlay)" color="var(--foreground)">
          {workStyle}
        </Badge>
      )
    }
    return emptyFallback
  }

  const config = WORK_STYLE_CONFIG[normalized as WorkStyleValue]

  return (
    <Badge bg={config.bg} color={config.fg} className="gap-1.5 ps-2">
      <span
        aria-hidden="true"
        className="size-1.5 rounded-full"
        style={{ background: config.fg }}
      />
      {config.label}
    </Badge>
  )
}
