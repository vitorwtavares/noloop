import express from 'express'
import cors from 'cors'
import { authMiddleware } from './middleware/auth'
import { entitlementMiddleware } from './middleware/entitlement'
import { createRateLimitMiddleware } from './middleware/rateLimit'
import healthRouter from './routes/health'
import geoRouter from './routes/geo'
import accountRouter from './routes/account'
import profileRouter from './routes/profile'
import resumesRouter from './routes/resumes'
import coverLettersRouter from './routes/coverLetters'
import exportRouter from './routes/export'
import answersRouter from './routes/answers'
import applicationsRouter from './routes/applications'
import skillsRouter from './routes/skills'
import locationsRouter from './routes/locations'
import trackerViewsRouter from './routes/trackerViews'
import billingRouter from './routes/billing'
import scannerRouter from './routes/scanner'
import { handleStripeWebhook } from './routes/billing/webhook'

const app = express()
app.set('etag', false)
app.set('trust proxy', 1)

app.use(cors())

// The Stripe webhook needs the raw body for signature verification, so it must
// be registered before express.json() (and before auth — the signature is auth).
app.post(
  '/api/billing/webhook',
  express.raw({ type: 'application/json' }),
  handleStripeWebhook,
)

app.use(express.json())

const generalLimiter = createRateLimitMiddleware({
  keyPrefix: 'general',
  windowMs: 15 * 60 * 1000,
  limit: 200,
  message: 'Too many requests. Try again later.',
  keyGenerator: (req) => req.ip ?? 'unknown',
})

app.use('/api/health', healthRouter)
app.use('/api/geo', geoRouter)
app.use(generalLimiter)
app.use(authMiddleware)
app.use('/api/account', accountRouter)
app.use('/api/profile', profileRouter)
app.use('/api/resumes', entitlementMiddleware, resumesRouter)
app.use('/api/cover-letters', entitlementMiddleware, coverLettersRouter)
app.use('/api/export', entitlementMiddleware, exportRouter)
app.use('/api/answers', entitlementMiddleware, answersRouter)
app.use('/api/applications', entitlementMiddleware, applicationsRouter)
app.use('/api/skills', skillsRouter)
app.use('/api/locations', locationsRouter)
app.use('/api/tracker/views', trackerViewsRouter)
app.use('/api/billing', billingRouter)
app.use('/api/scanner', scannerRouter)

export default app
