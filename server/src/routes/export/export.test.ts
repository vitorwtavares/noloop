import { describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import express from 'express'

const mocks = vi.hoisted(() => ({
  createRateLimitMiddleware: vi.fn(
    (_options: unknown) => (_req: unknown, _res: unknown, next: () => void) =>
      next(),
  ),
}))

vi.mock('../../middleware/rateLimit', () => ({
  createRateLimitMiddleware: mocks.createRateLimitMiddleware,
}))

vi.mock('../../middleware/auth', () => ({
  getSupabase: vi.fn(),
}))

vi.mock('../../utils/browser', () => ({
  getBrowser: vi.fn(),
}))

vi.mock('../../billing/pdfQuota', () => ({
  refundPdfExport: vi.fn(),
}))

import * as authModule from '../../middleware/auth'
import { getBrowser } from '../../utils/browser'
import { refundPdfExport } from '../../billing/pdfQuota'
import { PLAN_LIMITS } from '../../billing/plans'
import exportRouter from '.'

describe('export route limits', () => {
  it('configures a per-day PDF export limiter tagged as a plan limit', () => {
    expect(exportRouter).toBeDefined()
    expect(mocks.createRateLimitMiddleware).toHaveBeenCalledWith(
      expect.objectContaining({
        keyPrefix: 'pdf-export',
        windowMs: 24 * 60 * 60 * 1000,
        code: 'plan_limit',
        planLimitResource: 'pdfExports',
        limit: expect.any(Function),
      }),
    )
  })

  it('resolves the daily limit from the caller’s plan entitlement', () => {
    const options = mocks.createRateLimitMiddleware.mock.calls[0][0] as {
      limit: (req: unknown) => number
    }
    const limitFor = (pdfExportsPerDay: number) =>
      options.limit({ entitlement: { limits: { pdfExportsPerDay } } })

    expect(limitFor(2)).toBe(2)
    expect(limitFor(15)).toBe(15)
  })

  it('refunds the consumed export slot when pdf generation fails', async () => {
    const createQueryBuilder = () => {
      const builder: Record<string, ReturnType<typeof vi.fn>> = {}
      builder.select = vi.fn().mockReturnValue(builder)
      builder.eq = vi.fn().mockReturnValue(builder)
      builder.maybeSingle = vi.fn().mockResolvedValue({
        data: { content: { type: 'doc', content: [] }, archived_at: null },
        error: null,
      })
      builder.order = vi.fn().mockResolvedValue({ data: [], error: null })
      return builder
    }
    vi.mocked(authModule.getSupabase).mockReturnValue({
      from: vi.fn(() => createQueryBuilder()),
    } as never)
    vi.mocked(getBrowser).mockRejectedValue(new Error('browser launch failed'))

    const app = express()
    app.use((req, _res, next) => {
      req.userId = 'test-user-id'
      req.entitlement = {
        plan: 'free',
        limits: PLAN_LIMITS.free,
        subscription: null,
      }
      next()
    })
    app.use('/api/export', exportRouter)

    const res = await request(app).post('/api/export/cover-letter/base')

    expect(res.status).toBe(500)
    expect(refundPdfExport).toHaveBeenCalledWith('test-user-id')
  })
})
