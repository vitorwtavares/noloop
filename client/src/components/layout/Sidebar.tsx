import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'
import {
  LayoutGrid,
  AlignLeft,
  CalendarDays,
  LogOut,
  FileText,
  Radar,
  Settings,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getInitials } from '@/utils/getInitials'
import { useAuth } from '@/context/auth'
import { useBillingStatus } from '@/api/hooks/useBilling'
import { useUpgrade } from '@/components/billing/UpgradeProvider'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import joolkitMark from '@/assets/logo/png/joolkit-mark-512-no-border.png'

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'joolkit-sidebar-collapsed'

const navItems = [
  { to: '/quick-copy', label: 'Quick copy', icon: LayoutGrid, disabled: false },
  {
    to: '/cover-letter',
    label: 'Cover letter',
    icon: FileText,
    disabled: false,
  },
  { to: '/answer-bank', label: 'Answers', icon: AlignLeft, disabled: false },
  {
    to: '/tracker',
    label: 'Applications',
    icon: CalendarDays,
    disabled: false,
  },
  {
    to: '/scanner',
    label: 'Scanner',
    icon: Radar,
    disabled: false,
  },
]

export default function Sidebar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { data: billing } = useBillingStatus()
  const { openUpgrade } = useUpgrade()
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return (
        window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true'
      )
    } catch {
      return false
    }
  })
  const [canRevealCollapsedToggle, setCanRevealCollapsedToggle] =
    useState(isCollapsed)

  const email = user?.email ?? ''
  const displayName = user?.user_metadata?.full_name || email
  const initial = displayName ? getInitials(displayName) : '?'
  const isPro = billing?.plan === 'pro'
  const planLabel = billing ? (isPro ? 'Pro plan' : 'Free plan') : ''
  const labelClassName = cn(
    'min-w-0 overflow-hidden whitespace-nowrap transition-[max-width,opacity,transform] duration-200 ease-out',
    isCollapsed
      ? 'max-w-0 translate-x-1 opacity-0'
      : 'max-w-[140px] translate-x-0 opacity-100',
  )

  const toggleSidebar = () => {
    setCanRevealCollapsedToggle(false)

    setIsCollapsed((current) => {
      const next = !current

      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(next))
      } catch {
        // The sidebar can still work if storage is unavailable.
      }

      return next
    })
  }

  useEffect(() => {
    if (!isCollapsed) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setCanRevealCollapsedToggle(true)
    }, 260)

    return () => window.clearTimeout(timeoutId)
  }, [isCollapsed])

  return (
    <aside
      className={cn(
        'group/sidebar flex shrink-0 flex-col gap-0.5 overflow-hidden border-r border-sidebar-border bg-sidebar px-3 py-5 text-sidebar-foreground transition-[width,min-width] duration-200 ease-out',
        isCollapsed ? 'w-[57px] min-w-[57px]' : 'w-[224px] min-w-[224px]',
      )}
      data-collapsed={isCollapsed}
    >
      <div className="sidebar-header group/sidebar-header relative mb-4 h-8">
        <button
          type="button"
          onClick={() => navigate('/')}
          disabled={isCollapsed}
          tabIndex={isCollapsed ? -1 : undefined}
          className="absolute top-0 left-0 flex h-8 w-full cursor-pointer items-center overflow-hidden rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default disabled:opacity-100"
          aria-label="Go to quick copy"
        >
          <span className="flex size-8 shrink-0 items-center justify-center">
            <img src={joolkitMark} alt="" className="h-6 w-auto" />
          </span>
          <span
            className={cn(
              'min-w-0 translate-x-0 overflow-hidden font-brand text-[23px] leading-none font-bold tracking-normal whitespace-nowrap transition-[max-width,opacity] duration-200 ease-out',
              isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[120px] opacity-100',
            )}
          >
            joolkit
          </span>
        </button>

        {(!isCollapsed || canRevealCollapsedToggle) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={toggleSidebar}
                aria-label={isCollapsed ? 'Open sidebar' : 'Close sidebar'}
                aria-expanded={!isCollapsed}
                data-can-reveal={isCollapsed || undefined}
                className={cn(
                  'sidebar-toggle-button absolute top-0 z-10 border-transparent text-muted-foreground duration-200 ease-out hover:bg-sidebar-hover hover:text-sidebar-foreground focus-visible:border-transparent focus-visible:ring-0 data-[state=delayed-open]:bg-sidebar-hover data-[state=delayed-open]:text-sidebar-foreground data-[state=instant-open]:bg-sidebar-hover data-[state=instant-open]:text-sidebar-foreground data-[state=open]:bg-sidebar-hover data-[state=open]:text-sidebar-foreground',
                  isCollapsed
                    ? 'left-0 transition-[opacity,background-color,color]'
                    : 'right-0 opacity-100 transition-[background-color,color] aria-expanded:bg-transparent aria-expanded:text-muted-foreground hover:aria-expanded:bg-sidebar-hover hover:aria-expanded:text-sidebar-foreground',
                )}
              >
                {isCollapsed ? (
                  <PanelLeftOpen data-icon="inline-start" />
                ) : (
                  <PanelLeftClose data-icon="inline-start" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {isCollapsed ? 'Open sidebar' : 'Close sidebar'}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {navItems.map(({ to, label, icon: Icon, disabled }) => {
        const isActive = location.pathname === to

        if (disabled) {
          return (
            <Tooltip key={to}>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    'flex h-8 w-full cursor-default items-center gap-2 overflow-hidden rounded-lg px-2 text-sm',
                    'text-muted-foreground/40',
                  )}
                >
                  <Icon size={16} className="shrink-0 opacity-50" />
                  <span className={labelClassName}>{label}</span>
                </span>
              </TooltipTrigger>
              <TooltipContent side="right">Coming soon</TooltipContent>
            </Tooltip>
          )
        }

        const link = (
          <Link
            key={to}
            to={to}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex h-8 w-full items-center gap-2 overflow-hidden rounded-lg px-2 text-sm transition-colors data-[state=delayed-open]:bg-sidebar-hover data-[state=delayed-open]:text-sidebar-foreground data-[state=instant-open]:bg-sidebar-hover data-[state=instant-open]:text-sidebar-foreground data-[state=open]:bg-sidebar-hover data-[state=open]:text-sidebar-foreground',
              isActive
                ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                : 'text-muted-foreground hover:bg-sidebar-hover hover:text-sidebar-foreground',
            )}
          >
            <Icon
              size={16}
              className={cn(
                'shrink-0',
                isActive ? 'text-brand opacity-100' : 'opacity-80',
              )}
            />
            <span className={labelClassName}>{label}</span>
          </Link>
        )

        if (!isCollapsed) {
          return link
        }

        return (
          <Tooltip key={to}>
            <TooltipTrigger asChild>{link}</TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {label}
            </TooltipContent>
          </Tooltip>
        )
      })}

      <div className="flex-1" />

      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        {(() => {
          const trigger = (
            <PopoverTrigger asChild>
              <button
                className={cn(
                  'relative flex h-10 w-full items-center overflow-hidden rounded-lg px-0 text-sm transition-colors',
                  'text-muted-foreground hover:bg-sidebar-hover hover:text-sidebar-foreground',
                  'focus-visible:bg-sidebar-hover focus-visible:text-sidebar-foreground focus-visible:outline-none',
                  'data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground',
                )}
                aria-label="Account"
              >
                <span className="flex size-8 shrink-0 items-center justify-center">
                  <Avatar
                    className="pointer-events-none size-6 shrink-0 after:hidden"
                    style={{
                      background:
                        'color-mix(in srgb, var(--brand) 48%, transparent)',
                    }}
                  >
                    <AvatarFallback
                      className="bg-transparent text-xs font-semibold"
                      style={{ color: 'var(--brand-foreground)' }}
                    >
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                </span>
                <span
                  className={cn(
                    'absolute top-1/2 left-10 min-w-0 -translate-y-1/2 overflow-hidden text-left whitespace-nowrap transition-[max-width,opacity] duration-200 ease-out',
                    isCollapsed
                      ? 'max-w-0 opacity-0'
                      : 'max-w-[140px] opacity-100',
                  )}
                >
                  <span className="block truncate leading-tight">
                    {displayName}
                  </span>
                  <span className="block truncate text-xs leading-tight opacity-60">
                    {planLabel}
                  </span>
                </span>
              </button>
            </PopoverTrigger>
          )

          if (!isCollapsed) return trigger

          return (
            <Tooltip>
              <TooltipTrigger asChild>{trigger}</TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {displayName}
              </TooltipContent>
            </Tooltip>
          )
        })()}

        <PopoverContent
          side="top"
          align="start"
          sideOffset={8}
          className={cn(
            'gap-0 overflow-hidden rounded-xl border-sidebar-border bg-sidebar-popover p-0',
            isCollapsed ? 'w-56' : 'w-(--radix-popover-trigger-width)',
          )}
        >
          <div className="px-3 py-3">
            <span className="block truncate text-[13px] leading-tight text-muted-foreground">
              {email}
            </span>
          </div>

          <Separator />

          {billing && !isPro && (
            <button
              onClick={() => {
                setPopoverOpen(false)
                openUpgrade()
              }}
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-sm font-medium text-brand transition-colors outline-none hover:bg-sidebar-hover focus-visible:bg-sidebar-hover focus-visible:outline-none"
            >
              <Sparkles size={14} />
              Upgrade to Pro
            </button>
          )}

          <button
            onClick={() => {
              setPopoverOpen(false)
              navigate('/settings/account')
            }}
            className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground transition-colors outline-none hover:bg-sidebar-hover hover:text-sidebar-foreground focus-visible:bg-sidebar-hover focus-visible:text-sidebar-foreground focus-visible:outline-none"
          >
            <Settings size={14} className="opacity-70" />
            Settings
          </button>

          <Separator />

          <button
            onClick={() =>
              signOut().catch(() =>
                toast.error('Failed to sign out. Please try again.'),
              )
            }
            className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground transition-colors outline-none hover:bg-sidebar-hover hover:text-sidebar-foreground focus-visible:bg-sidebar-hover focus-visible:text-sidebar-foreground focus-visible:outline-none"
          >
            <LogOut size={14} className="opacity-70" />
            Sign out
          </button>
        </PopoverContent>
      </Popover>
    </aside>
  )
}
