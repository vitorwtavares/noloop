function hasPlausibleHostname(hostname: string): boolean {
  const host = hostname.toLowerCase()
  if (host === 'localhost') return true
  if (!host.includes('.')) return false

  const labels = host.split('.')
  if (labels.some((label) => label.length === 0)) return false

  const tld = labels[labels.length - 1]!
  if (tld.length < 2) return false

  const labelPattern = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i
  return labels.every((label) => labelPattern.test(label))
}

export function normalizeCareersUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed || /\s/.test(trimmed)) return null

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`

  try {
    const parsed = new URL(withProtocol)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null
    if (!hasPlausibleHostname(parsed.hostname)) return null
    return parsed.href
  } catch {
    return null
  }
}
