import { describe, expect, it, vi } from 'vitest'

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
})
