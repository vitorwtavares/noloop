import { cn } from '@/lib/utils'

interface CompanyAvatarProps {
  name: string | null
  className?: string
}

// Color derived purely from the first letter, walking A-Z through the hue
// circle so alphabetically sorted companies form a gentle gradient.
function colorFor(name: string): string {
  const code = name.trim().charAt(0).toUpperCase().charCodeAt(0)
  if (code >= 65 && code <= 90) {
    const hue = ((code - 65) / 26) * 360
    return `oklch(68% 0.16 ${hue})`
  }
  return 'oklch(68% 0.16 220)'
}

export function CompanyAvatar({ name, className }: CompanyAvatarProps) {
  const trimmed = name?.trim() ?? ''
  const letter = trimmed.charAt(0).toUpperCase() || '?'
  const color = trimmed ? colorFor(trimmed) : null
  const filled = !!trimmed

  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex size-[24px] shrink-0 items-center justify-center rounded-[5px] text-[12px] leading-none font-semibold text-white',
        className,
      )}
      style={
        filled
          ? {
              background: color ?? undefined,
            }
          : {
              background: 'var(--secondary)',
              color: 'var(--text-faint)',
            }
      }
    >
      {letter}
    </span>
  )
}
