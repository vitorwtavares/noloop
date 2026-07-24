import { Router } from 'express'
import { getSupabase } from '../../middleware/auth'

const router = Router()

type ScannerFilters = {
  title: {
    positive: string[]
    negative: string[]
  }
  location: string[]
}

const EMPTY_SCANNER_FILTERS: ScannerFilters = {
  title: { positive: [], negative: [] },
  location: [],
}

function scannerConfig() {
  const baseUrl = process.env.SCANNER_BASE_URL?.replace(/\/$/, '')
  const publicKey = process.env.SCANNER_PUBLIC_KEY
  const secretKey = process.env.SCANNER_SECRET_KEY

  if (!baseUrl || !publicKey || !secretKey) {
    return null
  }

  return { baseUrl, publicKey, secretKey }
}

interface ApplicationRow {
  company_name: string
  job_name: string | null
  job_url: string | null
  careers_url: string | null
}

function buildScanPayload(
  userId: string,
  rows: ApplicationRow[],
  filters: ScannerFilters,
) {
  const companiesByName = new Map<
    string,
    { company_name: string; careers_url: string }
  >()

  for (const row of rows) {
    if (!row.careers_url?.trim()) continue
    const key = row.company_name.trim().toLowerCase()
    if (!key) continue
    companiesByName.set(key, {
      company_name: row.company_name.trim(),
      careers_url: row.careers_url.trim(),
    })
  }

  const exclude_job_urls = rows
    .map((row) => row.job_url?.trim())
    .filter((url): url is string => Boolean(url))

  const exclude_company_roles = rows
    .filter((row) => row.company_name?.trim() && row.job_name?.trim())
    .map((row) => ({
      company_name: row.company_name.trim(),
      job_name: row.job_name!.trim(),
    }))

  return {
    external_user_id: userId,
    companies: [...companiesByName.values()],
    filters,
    exclude_job_urls,
    exclude_company_roles,
  }
}

async function proxyScannerJson(
  config: NonNullable<ReturnType<typeof scannerConfig>>,
  path: string,
  init?: RequestInit,
) {
  return fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Scanner-Public-Key': config.publicKey,
      'X-Scanner-Secret-Key': config.secretKey,
      ...init?.headers,
    },
  })
}

async function fetchUserPreferences(
  config: NonNullable<ReturnType<typeof scannerConfig>>,
  userId: string,
): Promise<
  { filters: ScannerFilters; setupCompleted: boolean } | { error: string }
> {
  let preferencesRes: Response
  try {
    preferencesRes = await proxyScannerJson(
      config,
      `/v1/users/${encodeURIComponent(userId)}/preferences`,
    )
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Scanner request failed',
    }
  }

  if (!preferencesRes.ok) {
    const body = await preferencesRes.text().catch(() => '')
    return {
      error: body || `Scanner returned HTTP ${preferencesRes.status}`,
    }
  }

  const preferences = (await preferencesRes.json()) as {
    title?: { positive?: string[]; negative?: string[] }
    location?: string[]
    setup_completed_at?: string | null
  }

  return {
    filters: {
      title: {
        positive: preferences.title?.positive ?? [],
        negative: preferences.title?.negative ?? [],
      },
      location: preferences.location ?? [],
    },
    setupCompleted: Boolean(preferences.setup_completed_at),
  }
}

// Proxies POST /v1/scans on joolkit-scanner and streams SSE back to the client.
router.post('/scan', async (req, res) => {
  const config = scannerConfig()
  if (!config) {
    return res.status(503).json({ error: 'Scanner is not configured' })
  }

  const userId = req.userId!
  const preferences = await fetchUserPreferences(config, userId)
  if ('error' in preferences) {
    return res.status(502).json({ error: preferences.error })
  }

  if (!preferences.setupCompleted) {
    return res
      .status(400)
      .json({ error: 'Complete scanner setup before scanning' })
  }

  const { data, error } = await getSupabase()
    .from('applications')
    .select('company_name, job_name, job_url, careers_url')
    .eq('user_id', userId)
    .is('archived_at', null)

  if (error) return res.status(500).json({ error: error.message })

  const payload = buildScanPayload(
    userId,
    (data ?? []) as ApplicationRow[],
    preferences.filters,
  )

  if (payload.companies.length === 0) {
    return res.status(400).json({
      error: 'No applications with a careers URL to scan',
    })
  }

  const abortController = new AbortController()

  req.on('close', () => {
    if (!res.writableEnded) {
      abortController.abort()
    }
  })

  let scannerRes: Response
  try {
    scannerRes = await fetch(`${config.baseUrl}/v1/scans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        'X-Scanner-Public-Key': config.publicKey,
        'X-Scanner-Secret-Key': config.secretKey,
      },
      body: JSON.stringify(payload),
      signal: abortController.signal,
    })
  } catch (err) {
    if (abortController.signal.aborted) return
    const message =
      err instanceof Error ? err.message : 'Scanner request failed'
    return res.status(502).json({ error: message })
  }

  if (scannerRes.status === 429) {
    const body = (await scannerRes.json().catch(() => ({}))) as {
      detail?: { code?: string; retry_after_seconds?: number }
      code?: string
      retry_after_seconds?: number
    }
    const detail = body.detail ?? body
    return res.status(429).json({
      code: detail.code ?? 'scan_limit',
      retry_after_seconds: detail.retry_after_seconds ?? 0,
    })
  }

  if (!scannerRes.ok) {
    const body = await scannerRes.text().catch(() => '')
    return res.status(502).json({
      error: body || `Scanner returned HTTP ${scannerRes.status}`,
    })
  }

  if (!scannerRes.body) {
    return res.status(502).json({ error: 'Scanner returned an empty response' })
  }

  res.status(200)
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders?.()
  res.socket?.setNoDelay(true)

  const reader = scannerRes.body.getReader()

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!res.write(value)) {
        await new Promise<void>((resolve) => res.once('drain', resolve))
      }
    }
    res.end()
  } catch (err) {
    if (!abortController.signal.aborted) {
      console.error('Scanner SSE proxy stream error', err)
    }
    if (!res.writableEnded) res.end()
  }
})

// Returns the persisted jobs + activity log from the user's most recent scan.
router.get('/last-scan', async (req, res) => {
  const config = scannerConfig()
  if (!config) {
    return res.status(503).json({ error: 'Scanner is not configured' })
  }

  let scannerRes: Response
  try {
    scannerRes = await fetch(
      `${config.baseUrl}/v1/users/${encodeURIComponent(req.userId!)}/last-scan`,
      {
        headers: {
          'X-Scanner-Public-Key': config.publicKey,
          'X-Scanner-Secret-Key': config.secretKey,
        },
      },
    )
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Scanner request failed'
    return res.status(502).json({ error: message })
  }

  if (!scannerRes.ok) {
    const body = await scannerRes.text().catch(() => '')
    return res.status(502).json({
      error: body || `Scanner returned HTTP ${scannerRes.status}`,
    })
  }

  const body = (await scannerRes.json()) as Record<string, unknown>
  return res.json(body)
})

router.get('/setup', async (req, res) => {
  const config = scannerConfig()
  if (!config) {
    return res.status(503).json({ error: 'Scanner is not configured' })
  }

  const userId = req.userId!

  let preferencesRes: Response
  try {
    preferencesRes = await proxyScannerJson(
      config,
      `/v1/users/${encodeURIComponent(userId)}/preferences`,
    )
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Scanner request failed'
    return res.status(502).json({ error: message })
  }

  if (!preferencesRes.ok) {
    const body = await preferencesRes.text().catch(() => '')
    return res.status(502).json({
      error: body || `Scanner returned HTTP ${preferencesRes.status}`,
    })
  }

  const preferences = (await preferencesRes.json()) as Record<string, unknown>

  const { data: companies, error } = await getSupabase()
    .from('applications')
    .select('id, company_name, careers_url, scanner_enabled')
    .eq('user_id', userId)
    .is('archived_at', null)
    .order('company_name')

  if (error) return res.status(500).json({ error: error.message })

  return res.json({
    preferences,
    default_filters: EMPTY_SCANNER_FILTERS,
    companies: companies ?? [],
  })
})

router.put('/preferences', async (req, res) => {
  const config = scannerConfig()
  if (!config) {
    return res.status(503).json({ error: 'Scanner is not configured' })
  }

  let scannerRes: Response
  try {
    scannerRes = await proxyScannerJson(
      config,
      `/v1/users/${encodeURIComponent(req.userId!)}/preferences`,
      {
        method: 'PUT',
        body: JSON.stringify(req.body),
      },
    )
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Scanner request failed'
    return res.status(502).json({ error: message })
  }

  if (!scannerRes.ok) {
    const body = await scannerRes.text().catch(() => '')
    return res.status(502).json({
      error: body || `Scanner returned HTTP ${scannerRes.status}`,
    })
  }

  const body = (await scannerRes.json()) as Record<string, unknown>
  return res.json(body)
})

router.post('/setup', async (req, res) => {
  const config = scannerConfig()
  if (!config) {
    return res.status(503).json({ error: 'Scanner is not configured' })
  }

  const userId = req.userId!
  const { filters, enabled_application_ids: enabledIds } = req.body as {
    filters?: unknown
    enabled_application_ids?: string[]
  }

  if (!filters || !Array.isArray(enabledIds)) {
    return res.status(400).json({
      error: 'filters and enabled_application_ids are required',
    })
  }

  let preferencesRes: Response
  try {
    preferencesRes = await proxyScannerJson(
      config,
      `/v1/users/${encodeURIComponent(userId)}/preferences`,
      {
        method: 'PUT',
        body: JSON.stringify(filters),
      },
    )
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Scanner request failed'
    return res.status(502).json({ error: message })
  }

  if (!preferencesRes.ok) {
    const body = await preferencesRes.text().catch(() => '')
    return res.status(502).json({
      error: body || `Scanner returned HTTP ${preferencesRes.status}`,
    })
  }

  const preferences = (await preferencesRes.json()) as Record<string, unknown>

  const { error: disableError } = await getSupabase()
    .from('applications')
    .update({ scanner_enabled: false })
    .eq('user_id', userId)

  if (disableError) {
    return res.status(500).json({ error: disableError.message })
  }

  if (enabledIds.length > 0) {
    const { error: enableError } = await getSupabase()
      .from('applications')
      .update({ scanner_enabled: true })
      .eq('user_id', userId)
      .in('id', enabledIds)

    if (enableError) {
      return res.status(500).json({ error: enableError.message })
    }
  }

  let completeRes: Response
  try {
    completeRes = await proxyScannerJson(
      config,
      `/v1/users/${encodeURIComponent(userId)}/setup/complete`,
      { method: 'POST' },
    )
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Scanner request failed'
    return res.status(502).json({ error: message })
  }

  if (!completeRes.ok) {
    const body = await completeRes.text().catch(() => '')
    return res.status(502).json({
      error: body || `Scanner returned HTTP ${completeRes.status}`,
    })
  }

  const completed = (await completeRes.json()) as Record<string, unknown>

  return res.json({
    preferences: {
      ...preferences,
      setup_completed_at: completed.setup_completed_at,
    },
  })
})

export default router
