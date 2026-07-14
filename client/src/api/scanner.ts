import { flushSync } from 'react-dom'
import { getApiUrl } from './api'
import { supabase } from './supabase'

export type ScannerJob = {
  company_name: string
  job_name: string
  job_url: string
  careers_url: string
  location: string | null
  work_style: string | null
  source: string
  tier: number | null
}

export type ScannerSseEvent = {
  event: string
  data: unknown
}

export type ScanActivityStatus =
  | 'started'
  | 'finished'
  | 'skipped'
  | 'synced'
  | 'complete'

export type ScanActivityRecord = {
  recorded_at: string
  company_name: string
  status: ScanActivityStatus
  detail: string
}

export type LastScanSnapshot = {
  scan_id: string | null
  summary: string | null
  completed_at: string | null
  scan_cooldown_hours: number
  jobs: ScannerJob[]
  activity: ScanActivityRecord[]
}

export class ScanLimitError extends Error {
  retryAfterSeconds: number

  constructor(retryAfterSeconds: number) {
    super('Scan limit reached')
    this.name = 'ScanLimitError'
    this.retryAfterSeconds = retryAfterSeconds
  }
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function parseSseBlock(block: string): ScannerSseEvent | null {
  const lines = block.split('\n')
  let event = 'message'
  const dataLines: string[] = []

  for (const line of lines) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim()
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim())
    }
  }

  if (dataLines.length === 0) return null

  const raw = dataLines.join('\n')
  try {
    return { event, data: JSON.parse(raw) }
  } catch {
    return { event, data: raw }
  }
}

export async function startScannerScan(
  onEvent: (event: ScannerSseEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(getApiUrl('/api/scanner/scan'), {
    method: 'POST',
    headers: {
      ...(await getAuthHeaders()),
      Accept: 'text/event-stream',
    },
    signal,
  })

  if (res.status === 429) {
    const body = (await res.json().catch(() => ({}))) as {
      retry_after_seconds?: number
    }
    throw new ScanLimitError(body.retry_after_seconds ?? 0)
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? `Scan failed: ${res.status}`)
  }

  if (!res.body) {
    throw new Error('Scan returned an empty response')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')

    let boundary = buffer.indexOf('\n\n')
    while (boundary !== -1) {
      const block = buffer.slice(0, boundary).trim()
      buffer = buffer.slice(boundary + 2)

      if (block) {
        const parsed = parseSseBlock(block)
        if (parsed) flushSync(() => onEvent(parsed))
      }

      boundary = buffer.indexOf('\n\n')
    }
  }

  const trailing = buffer.trim()
  if (trailing) {
    const parsed = parseSseBlock(trailing)
    if (parsed) flushSync(() => onEvent(parsed))
  }
}

export async function fetchLastScan(): Promise<LastScanSnapshot> {
  const res = await fetch(getApiUrl('/api/scanner/last-scan'), {
    headers: await getAuthHeaders(),
  })

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? `Failed to load last scan: ${res.status}`)
  }

  return res.json() as Promise<LastScanSnapshot>
}
