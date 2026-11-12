import { Suspense } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import clsx from 'clsx'
import {
  Hammer,
  Home,
  LayoutGrid,
  Package,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  WifiOff,
  Wrench,
  FileText,
} from 'lucide-react'
import { useOnlineStatus } from '../lib/hooks'

const SECTIONS = [
  {
    label: 'Overview',
    items: [{ to: '/', label: 'Dashboard', icon: Home, end: true }],
  },
  {
    label: 'My home',
    items: [
      { to: '/inventory', label: 'Home inventory', icon: Package },
      { to: '/warranties', label: 'Warranties & receipts', icon: ShieldCheck },
      { to: '/maintenance', label: 'Maintenance', icon: Wrench },
      { to: '/projects', label: 'Projects', icon: Hammer },
      { to: '/documents', label: 'Documents', icon: FileText },
    ],
  },
  {
    label: 'Money & people',
    items: [
      { to: '/expenses', label: 'Household expenses', icon: Wallet },
      { to: '/providers', label: 'Service providers', icon: Users },
    ],
  },
  {
    label: 'Assistant',
    items: [{ to: '/assistant', label: 'AI home assistant', icon: Sparkles }],
  },
]

const MOBILE_ITEMS = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/inventory', label: 'Inventory', icon: Package },
  { to: '/maintenance', label: 'Tasks', icon: Wrench },
  { to: '/assistant', label: 'Assistant', icon: Sparkles },
  { to: '/more', label: 'More', icon: LayoutGrid },
]

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={clsx(
        'relative inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-ink text-white shadow-sm',
        className,
      )}
    >
      <Home className="size-5" />
      <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-amber-300" />
    </span>
  )
}

function NavItem({
  to,
  label,
  icon: Icon,
  end,
}: {
  to: string
  label: string
  icon: typeof Home
  end?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
          isActive ? 'bg-brand-soft text-brand-dark' : 'text-muted hover:bg-black/[0.04] hover:text-ink',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={clsx('size-5', isActive ? 'text-brand' : 'text-muted')} />
          <span className="flex-1">{label}</span>
        </>
      )}
    </NavLink>
  )
}

export function AppShell() {
  const online = useOnlineStatus()

  return (
    <div className="min-h-svh">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface/85 backdrop-blur lg:flex">
        <Link to="/" className="flex items-center gap-3 px-5 py-5">
          <BrandMark />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold tracking-tight text-ink">HouseSphere</p>
            <p className="truncate text-[11px] text-muted">Your home, in one place</p>
          </div>
        </Link>

        <nav className="no-scrollbar flex-1 space-y-6 overflow-y-auto px-3 pb-6">
          {SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted/70">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavItem key={item.to} {...item} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-line p-3">
          <NavItem to="/settings" label="Settings" icon={Settings} />
          <div className="mt-2 flex items-center gap-2 px-3 py-1 text-[11px] text-muted">
            {online ? (
              <>
                <span className="size-1.5 rounded-full bg-ok" />
                Local-first · stored on this device
              </>
            ) : (
              <>
                <WifiOff className="size-3.5" />
                Offline · your data still works
              </>
            )}
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line bg-cream/90 px-4 py-3 backdrop-blur lg:hidden">
          <Link to="/" className="flex items-center gap-2.5">
            <BrandMark className="size-9" />
            <div>
              <p className="text-sm font-semibold leading-tight text-ink">HouseSphere</p>
              <p className="text-[10px] leading-tight text-muted">Your home, in one place</p>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            {!online ? (
              <span className="mr-1 inline-flex items-center gap-1 rounded-full bg-amber-soft px-2 py-1 text-[10px] font-semibold text-amber">
                <WifiOff className="size-3" /> Offline
              </span>
            ) : null}
            <NavLink
              to="/settings"
              aria-label="Settings"
              className={({ isActive }) =>
                clsx(
                  'inline-flex size-9 items-center justify-center rounded-full text-muted',
                  isActive ? 'bg-brand-soft text-brand-dark' : 'hover:bg-black/5',
                )
              }
            >
              <Settings className="size-5" />
            </NavLink>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:px-10 lg:pb-14 lg:pt-9">
          <Suspense
            fallback={
              <div className="flex justify-center py-24">
                <span className="size-6 animate-spin rounded-full border-2 border-line border-t-brand" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pt-1 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {MOBILE_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium transition-colors',
                  isActive ? 'text-brand' : 'text-muted',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={clsx('size-5', isActive && 'text-brand')} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
