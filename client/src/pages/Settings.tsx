import { NavLink, Outlet } from 'react-router'
import { CreditCard, Radar, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'

const sections = [
  { to: '/settings/account', label: 'Account', icon: UserRound },
  { to: '/settings/billing', label: 'Billing', icon: CreditCard },
  { to: '/settings/scanner', label: 'Scanner', icon: Radar },
] as const

export default function Settings() {
  return (
    <div className="flex-1 overflow-y-auto p-16 pb-6 max-[1599px]:py-12">
      <h1 className="text-[36px] font-medium tracking-tight">Settings</h1>

      <nav
        role="tablist"
        aria-label="Settings sections"
        className="mt-6 -mb-px flex border-b border-border"
      >
        {sections.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            role="tab"
            className={({ isActive }) =>
              cn(
                'mb-[-1px] flex items-center gap-2 border-b-2 px-3.5 py-2 text-[14px] font-medium transition-colors',
                isActive
                  ? 'border-brand text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={16}
                  className={cn(
                    'shrink-0',
                    isActive ? 'text-brand' : 'opacity-70',
                  )}
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-8 max-w-2xl">
        <Outlet />
      </div>
    </div>
  )
}
