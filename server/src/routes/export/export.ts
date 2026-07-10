import { Router } from 'express'
import { getBrowser } from '../../utils/browser'
import { getSupabase } from '../../middleware/auth'
import { createRateLimitMiddleware } from '../../middleware/rateLimit'
import { sendPlanLimit } from '../../billing/limits'
import { refundPdfExport } from '../../billing/pdfQuota'
import {
  normalizeTokenKey,
  tiptapToHtml,
  TiptapDoc,
  Tokens,
} from '../../utils/tiptapToHtml'

const router = Router()
const PDF_EXPORT_WINDOW_MS = 24 * 60 * 60 * 1000

const pdfLimiter = createRateLimitMiddleware({
  keyPrefix: 'pdf-export',
  windowMs: PDF_EXPORT_WINDOW_MS,
  // Per-plan daily quota, resolved from the entitlement attached upstream.
  limit: (req) => req.entitlement!.limits.pdfExportsPerDay,
  message:
    'Daily PDF export limit reached for your plan. Try again tomorrow or upgrade for a higher limit.',
  code: 'plan_limit',
  planLimitResource: 'pdfExports',
  keyGenerator: (req) => {
    const userId = req.userId
    if (!userId) throw new Error('pdfLimiter reached before authMiddleware')
    return userId
  },
})

// POST /api/export/cover-letter/:variation
router.post('/cover-letter/:variation', pdfLimiter, async (req, res) => {
  const { variation } = req.params

  const supabase = getSupabase()

  const [
    { data: template, error: templateError },
    { data: tokens, error: tokensError },
  ] = await Promise.all([
    supabase
      .from('cover_letter_templates')
      .select('content, archived_at')
      .eq('user_id', req.userId!)
      .eq('variation', variation)
      .maybeSingle(),
    supabase
      .from('cover_letter_tokens')
      .select('token_key, token_value')
      .eq('user_id', req.userId!)
      .order('position', { ascending: true }),
  ])

  if (templateError) {
    await refundPdfExport(req.userId!)
    res.status(500).json({ error: templateError.message })
    return
  }

  if (!template?.content) {
    await refundPdfExport(req.userId!)
    res.status(404).json({ error: 'cover letter content not found' })
    return
  }

  const { plan, limits } = req.entitlement!
  if (template.archived_at) {
    // The limiter already counted this request; give the slot back since the
    // archived variation blocks the export.
    await refundPdfExport(req.userId!)
    sendPlanLimit(
      res,
      'coverLetterVariations',
      limits.coverLetterVariations,
      plan,
    )
    return
  }

  if (tokensError) {
    await refundPdfExport(req.userId!)
    res.status(500).json({ error: tokensError.message })
    return
  }

  const resolvedTokens: Tokens = Object.fromEntries(
    (tokens ?? []).map((token) => [
      normalizeTokenKey(token.token_key),
      token.token_value ?? null,
    ]),
  )

  const bodyHtml = tiptapToHtml(template.content as TiptapDoc, resolvedTokens)

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,300;0,400;0,700;1,400;1,700&family=Merriweather:ital,wght@0,400;0,700;1,400;1,700&family=Montserrat:ital,wght@0,400;0,600;0,700;1,400;1,700&family=Open+Sans:ital,wght@0,400;0,600;0,700;1,400;1,700&family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&family=Raleway:ital,wght@0,400;0,600;0,700;1,400;1,700&family=Roboto:ital,wght@0,400;0,500;0,700;1,400;1,700&family=Source+Sans+3:ital,wght@0,400;0,600;0,700;1,400;1,700&display=swap" rel="stylesheet">
  <style>
    @page { margin: 2.5cm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Helvetica, Arial, sans-serif;
      font-size: 12pt;
      line-height: 1.15;
      color: #000;
    }
    p { margin: 0; }
    h1, h2, h3, h4, h5, h6 { margin: 0; }
    ul, ol { margin: 0; padding-left: 1.5em; }
    li { margin: 0; }
    a { color: #0563C1; text-decoration: underline; }
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`

  let page
  try {
    const browser = await getBrowser()
    page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load' })
    await page.evaluate(() => document.fonts.ready)
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="cover-letter.pdf"',
    )
    res.send(Buffer.from(pdf))
  } catch (err) {
    console.error('PDF generation failed', err)
    await refundPdfExport(req.userId!)
    res.status(500).json({ error: 'PDF generation failed' })
  } finally {
    await page?.close()
  }
})

export default router
