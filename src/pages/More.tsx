import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ChevronRight,
  FileText,
  Hammer,
  Info,
  Package,
  Repeat,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react'
import { currentMonthKey, db, daysUntil, formatMoney } from '../lib/db'
import { useInstallPrompt, useSettings } from '../lib/hooks'
import { Badge, Button, Card, PageHeader } from '../components/ui'

export function More() {
  const settings = useSettings()
  const { canInstall, installed, promptInstall } = useInstallPrompt()

  const items = useLiveQuery(() => db.items.count(), []) ?? 0
  const warranties = useLiveQuery(() => db.warranties.count(), []) ?? 0
  const tasks = useLiveQuery(() => db.maintenance.count(), []) ?? 0
  const projects = useLiveQuery(() => db.projects.count(), []) ?? 0
  const documents = useLiveQuery(() => db.documents.count(), []) ?? 0
  const providers = useLiveQuery(() => db.providers.count(), []) ?? 0
  const bills = useLiveQuery(() => db.bills.toArray(), []) ?? []
  const billsDueSoon = bills.filter((bill) => daysUntil(bill.nextDue) <= 14).length
  const monthSpend = useLiveQuery(
    async () =>
      (await db.expenses.toArray())
        .filter((expense) => expense.date.startsWith(currentMonthKey()))
        .reduce((sum, expense) => sum + expense.amount, 0),
    [],
  ) ?? 0

  const tiles = [
    {
      to: '/inventory',
      label: 'Home inventory',
      description: 'Items, photos and serial numbers',
      icon: Package,
      meta: `${items} items`,
    },
    {
      to: '/warranties',
      label: 'Warranties & receipts',
      description: 'Cover and expiry dates',
      icon: ShieldCheck,
      meta: `${warranties} warranties`,
    },
    {
      to: '/maintenance',
      label: 'Maintenance',
      description: 'Recurring jobs and service reminders',
      icon: Wrench,
      meta: `${tasks} tasks`,
    },
    {
      to: '/projects',
      label: 'Projects',
      description: 'Renovation budgets and progress',
      icon: Hammer,
      meta: `${projects} projects`,
    },
    {
      to: '/documents',
      label: 'Insurance & documents',
      description: 'Policies, reports and manuals',
      icon: FileText,
      meta: `${documents} documents`,
    },
    {
      to: '/expenses',
      label: 'Household expenses',
      description: 'Bills, maintenance and project costs',
      icon: Wallet,
      meta: formatMoney(monthSpend, settings.currency, true) + ' this month',
    },
    {
      to: '/bills',
      label: 'Recurring bills',
      description: 'Rates, utilities and insurance',
      icon: Repeat,
      meta: billsDueSoon > 0 ? `${billsDueSoon} due soon` : `${bills.length} bills`,
    },
    {
      to: '/providers',
      label: 'Service providers',
      description: 'Trusted trades and service history',
      icon: Users,
      meta: `${providers} providers`,
    },
  ]

  return (
    <div>
      <PageHeader title="More" subtitle="Every part of HouseSphere, plus settings and installation." />

      <Link
        to="/assistant"
        className="group mb-5 flex items-center gap-4 overflow-hidden rounded-2xl bg-gradient-to-br from-brand via-brand-dark to-ink p-5 text-white"
      >
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-amber-300">
          <Sparkles className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">AI home assistant</p>
          <p className="text-xs text-white/70">Scan labels and receipts, or ask about your home.</p>
        </div>
        <ChevronRight className="size-5 shrink-0 text-white/60 transition-transform group-hover:translate-x-0.5" />
      </Link>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {tiles.map(({ to, label, description, icon: Icon, meta }) => (
          <Link key={to} to={to}>
            <Card className="flex items-center gap-3.5 p-4 transition-colors hover:border-brand/30 hover:bg-brand-soft/20">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{label}</p>
                <p className="truncate text-xs text-muted">{description}</p>
              </div>
              <div className="shrink-0 text-right">
                <Badge>{meta}</Badge>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Card className="flex flex-col justify-between p-5">
          <div>
            <p className="text-sm font-semibold text-ink">Install the app</p>
            <p className="mt-1 text-xs text-muted">
              {installed
                ? 'HouseSphere is installed on this device.'
                : canInstall
                  ? 'Add HouseSphere to your home screen for offline access.'
                  : 'Use your browser menu to add HouseSphere to your home screen.'}
            </p>
          </div>
          {installed ? (
            <Badge tone="ok" className="mt-3 w-fit">
              Installed
            </Badge>
          ) : canInstall ? (
            <Button size="sm" className="mt-3 w-fit" onClick={() => void promptInstall()}>
              Install
            </Button>
          ) : null}
        </Card>

        <Link to="/settings">
          <Card className="flex h-full items-center gap-3.5 p-5 transition-colors hover:border-brand/30 hover:bg-brand-soft/20">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-black/5 text-muted">
              <Settings className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">Settings</p>
              <p className="text-xs text-muted">Household, reminders, backups and install</p>
            </div>
            <ChevronRight className="size-5 shrink-0 text-muted" />
          </Card>
        </Link>

        <Link to="/about">
          <Card className="flex h-full items-center gap-3.5 p-5 transition-colors hover:border-brand/30 hover:bg-brand-soft/20">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-black/5 text-muted">
              <Info className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">About &amp; privacy</p>
              <p className="text-xs text-muted">How HouseSphere handles your data</p>
            </div>
            <ChevronRight className="size-5 shrink-0 text-muted" />
          </Card>
        </Link>
      </div>
    </div>
  )
}
