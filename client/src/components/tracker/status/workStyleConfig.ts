export type WorkStyleValue = 'remote' | 'hybrid' | 'on-site'

export const WORK_STYLE_CONFIG: Record<
  WorkStyleValue,
  { label: string; bg: string; fg: string }
> = {
  remote: {
    label: 'Remote',
    bg: 'color-mix(in srgb, var(--palette-green) 17%, transparent)',
    fg: 'var(--palette-green)',
  },
  hybrid: {
    label: 'Hybrid',
    bg: 'color-mix(in srgb, var(--palette-blue) 17%, transparent)',
    fg: 'var(--palette-blue)',
  },
  'on-site': {
    label: 'On-site',
    bg: 'color-mix(in srgb, var(--palette-red) 17%, transparent)',
    fg: 'var(--palette-red)',
  },
}

export function normalizeWorkStyle(
  workStyle: string | null | undefined,
): WorkStyleValue | null {
  if (!workStyle) return null

  switch (workStyle.toLowerCase()) {
    case 'remote':
      return 'remote'
    case 'hybrid':
      return 'hybrid'
    case 'on-site':
    case 'onsite':
      return 'on-site'
    default:
      return null
  }
}
