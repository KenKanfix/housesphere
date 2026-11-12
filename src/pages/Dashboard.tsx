import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  FileText,
  Hammer,
  Package,
  Plus,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Wallet,
  Wrench,
} from 'lucide-react'
import {
  categoryLabel,
  db,
  formatDate,
  formatDue,
  formatMoney,
  intervalLabel,
  MAINTENANCE_CATEGORIES,
  monthKey,
  todayISO,
  DOCUMENT_TYPES,
  daysUntil,
} from '../lib/db'
import { useSettings } from '../lib/hooks'
import { maybeSendReminder } from '../lib/reminders'
import { Badge, Button, Card, SectionHeading, Stat } from '../components/ui'
import { ItemForm } from '../features/ItemForm'
import { ExpenseForm } from '../features/ExpenseForm'

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function Dashboard() {
  const settings = useSettings()
  const [showItem, setShowItem] = useState(false)
  const [showExpense, setShowExpense] = useState(false)

  const items = useLiveQuery(() => db.items.toArray(), []) ?? []
  const rooms = useLiveQuery(() => db.rooms.toArray(), []) ?? []
  const warranties = useLiveQuery(() => db.warranties.toArray(), []) ?? []
  const tasks = useLiveQuery(() => db.maintenance.toArray(), []) ?? []
  const documents = useLiveQuery(() => db.documents.toArray(), []) ?? []
  const expenses = useLiveQuery(() => db.expenses.toArray(), []) ?? []
  const projects = useLiveQuery(() => db.projects.toArray(), []) ?? []

  useEffect(() => {
    void maybeSendReminder()
  }, [])

  const month = monthKey(todayISO())
  const monthSpend = expenses.filter((expense) => expense.date.startsWith(month)).reduce((sum, expense) => sum + expense.amount, 0)

  const tasksDue = tasks.filter((task) => daysUntil(task.nextDue) <= 30)
  const overdueTasks = tasks.filter((task) => daysUntil(task.nextDue) < 0)
  const warrantyReview = warranties.filter((warranty) => daysUntil(warranty.expiryDate) <= 90)
  const documentReview = documents.filter((document) => document.expiryDate && daysUntil(document.expiryDate) <= 90)
  const roomName = (id: string) => rooms.find((room) => room.id === id)?.name ?? 'Unassigned'
  const itemName = (id?: string) => items.find((item) => item.id === id)?.name ?? 'Unlinked item'

  type Attention = {
    key: string
    title: string
    subtitle: string
    date: string
    to: string
    tone: 'danger' | 'amber' | 'neutral'
    kind: 'task' | 'warranty' | 'document'
  }

  const attention: Attention[] = [
    ...tasks
      .filter((task) => daysUntil(task.nextDue) <= 30)
      .map((task) => ({
        key: `task-${task.id}`,
        title: task.title,
        subtitle: `${categoryLabel(MAINTENANCE_CATEGORIES, task.category)} · ${intervalLabel(task.intervalDays)}`,
        date: task.nextDue,
        to: '/maintenance',
        tone: (daysUntil(task.nextDue) < 0 ? 'danger' : daysUntil(task.nextDue) <= 7 ? 'amber' : 'neutral') as Attention['tone'],
        kind: 'task' as const,
      })),
    ...warranties
      .filter((warranty) => daysUntil(warranty.expiryDate) <= 90)
      .map((warranty) => ({
        key: `warranty-${warranty.id}`,
        title: warranty.title,
        subtitle: `Warranty · ${warranty.itemId ? itemName(warranty.itemId) : 'No linked item'}`,
        date: warranty.expiryDate,
        to: '/warranties',
        tone: (daysUntil(warranty.expiryDate) < 0 ? 'danger' : daysUntil(warranty.expiryDate) <= 30 ? 'amber' : 'neutral') as Attention['tone'],
        kind: 'warranty' as const,
      })),
    ...documents
      .filter((document) => document.expiryDate && daysUntil(document.expiryDate) <= 90)
      .map((document) => ({
        key: `doc-${document.id}`,
        title: document.title,
        subtitle: `${categoryLabel(DOCUMENT_TYPES, document.type)} renewal`,
        date: document.expiryDate as string,
        to: '/documents',
        tone: (daysUntil(document.expiryDate) < 0 ? 'danger' : daysUntil(document.expiryDate) <= 30 ? 'amber' : 'neutral') as Attention['tone'],
        kind: 'document' as const,
      })),
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5)

  const activeProjects = projects.filter((project) => project.status !== 'completed').slice(0, 2)
  const recentItems = [...items].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6)

  const attentionIcon = (kind: Attention['kind']) => {
    if (kind === 'warranty') return <ShieldCheck className="size-4" />
    if (kind === 'document') return <FileText className="size-4" />
    return <Wrench className="size-4" />
  }

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand via-brand-dark to-ink p-6 text-white shadow-xl shadow-brand/10 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 right-16 size-48 rounded-full bg-amber-300/20 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/70">
            {greeting()} · {formatDate(todayISO(), 'long')}
          </p>
          <h1 className="mt-2 max-w-lg text-3xl font-semibold tracking-tight sm:text-4xl">
            Everything about {settings.householdName}, in one place.
          </h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Inventory, warranties, maintenance, projects, documents and bills — organised and ready when you need them.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              onClick={() => setShowItem(true)}
              className="bg-white text-brand-dark shadow-none hover:bg-white/90"
              icon={<Plus className="size-4" />}
            >
              Add item
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowExpense(true)}
              className="border border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              icon={<ReceiptText className="size-4" />}
            >
              Log expense
            </Button>
            <Link
              to="/assistant"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
            >
              <Sparkles className="size-4" />
              Ask assistant
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={<Package className="size-4" />} label="Items tracked" value={items.length} hint={`${rooms.length} rooms`} />
        <Stat
          icon={<Wrench className="size-4" />}
          label="Due in 30 days"
          value={tasksDue.length}
          hint={overdueTasks.length > 0 ? `${overdueTasks.length} overdue` : 'Nothing overdue'}
          tone={overdueTasks.length > 0 ? 'danger' : 'brand'}
        />
        <Stat
          icon={<ShieldCheck className="size-4" />}
          label="Warranties to review"
          value={warrantyReview.length}
          hint="Next 90 days"
          tone={warrantyReview.length > 0 ? 'amber' : 'brand'}
        />
        <Stat
          icon={<Wallet className="size-4" />}
          label="Spent this month"
          value={formatMoney(monthSpend, settings.currency, true)}
          hint={`${documentReview.length} renewals due`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <SectionHeading
            title="Needs attention"
            action={
              <Link to="/maintenance" className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-dark">
                View all <ChevronRight className="size-3.5" />
              </Link>
            }
          />
          {attention.length > 0 ? (
            <Card className="divide-y divide-line overflow-hidden">
              {attention.map((item) => (
                <Link key={item.key} to={item.to} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-brand-soft/25">
                  <span
                    className={
                      item.tone === 'danger'
                        ? 'flex size-9 shrink-0 items-center justify-center rounded-xl bg-danger-soft text-danger'
                        : item.tone === 'amber'
                          ? 'flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-soft text-amber'
                          : 'flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand'
                    }
                  >
                    {attentionIcon(item.kind)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{item.title}</span>
                    <span className="block truncate text-xs text-muted">{item.subtitle}</span>
                  </span>
                  <Badge tone={item.tone === 'danger' ? 'danger' : item.tone === 'amber' ? 'amber' : 'neutral'}>
                    {formatDue(item.date)}
                  </Badge>
                </Link>
              ))}
            </Card>
          ) : (
            <Card className="flex items-center gap-4 p-5">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-ok-soft text-ok">
                <CheckCircle2 className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">You are all caught up</p>
                <p className="text-xs text-muted">No maintenance, warranties or renewals due in the next 30 days.</p>
              </div>
            </Card>
          )}
        </section>

        <div className="space-y-6">
          <Link
            to="/assistant"
            className="group relative block overflow-hidden rounded-2xl bg-ink p-5 text-white transition-transform hover:-translate-y-0.5"
          >
            <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-brand/50 blur-2xl" />
            <div className="relative">
              <div className="flex size-9 items-center justify-center rounded-xl bg-white/10 text-amber-300">
                <Sparkles className="size-4" />
              </div>
              <h2 className="mt-3 text-base font-semibold">Ask HouseSphere</h2>
              <p className="mt-1 text-xs leading-relaxed text-white/65">
                Scan appliance labels, read receipts, or ask what needs doing around the house.
              </p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                Open assistant <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>

          <section>
            <SectionHeading
              title="Active projects"
              action={
                <Link to="/projects" className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-dark">
                  All projects <ChevronRight className="size-3.5" />
                </Link>
              }
            />
            <Card className="p-4">
              {activeProjects.length > 0 ? (
                <div className="space-y-4">
                  {activeProjects.map((project) => {
                    const spent = expenses.filter((expense) => expense.projectId === project.id).reduce((sum, expense) => sum + expense.amount, 0)
                    const percent = project.budget && project.budget > 0 ? (spent / project.budget) * 100 : 0
                    return (
                      <div key={project.id}>
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 truncate text-sm font-medium text-ink">
                            <Hammer className="size-3.5 text-muted" />
                            {project.title}
                          </span>
                          <span className="shrink-0 text-xs text-muted">
                            {formatMoney(spent, settings.currency, true)}
                            {project.budget ? ` / ${formatMoney(project.budget, settings.currency, true)}` : ''}
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/8">
                          <div className={percent > 100 ? 'h-full rounded-full bg-danger' : 'h-full rounded-full bg-brand'} style={{ width: `${Math.min(100, percent)}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted">
                  No active projects.{' '}
                  <Link to="/projects" className="font-semibold text-brand hover:text-brand-dark">
                    Start one
                  </Link>
                </p>
              )}
            </Card>
          </section>
        </div>
      </div>

      <section>
        <SectionHeading
          title="Recently added"
          action={
            <Link to="/inventory" className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-dark">
              Inventory <ChevronRight className="size-3.5" />
            </Link>
          }
        />
        {recentItems.length > 0 ? (
          <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
            {recentItems.map((item) => (
              <Link
                key={item.id}
                to="/inventory"
                className="w-36 shrink-0 overflow-hidden rounded-2xl border border-line bg-surface transition-colors hover:border-brand/30"
              >
                {item.photo ? (
                  <img src={item.photo} alt={item.name} className="h-24 w-36 object-cover" />
                ) : (
                  <div className="flex h-24 w-36 items-center justify-center bg-brand-soft/60 text-brand">
                    <Package className="size-7" />
                  </div>
                )}
                <div className="p-3">
                  <p className="truncate text-sm font-medium text-ink">{item.name}</p>
                  <p className="truncate text-[11px] text-muted">{roomName(item.roomId)}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="p-6 text-center">
            <CalendarClock className="mx-auto size-8 text-brand" />
            <p className="mt-2 text-sm font-semibold text-ink">Start with something in your home</p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-muted">
              Add your fridge, TV or ride-on mower and HouseSphere will keep the details, receipts and reminders together.
            </p>
            <div className="mt-3 flex justify-center gap-2">
              <Button size="sm" onClick={() => setShowItem(true)} icon={<Plus className="size-4" />}>
                Add your first item
              </Button>
              <Link
                to="/settings"
                className="inline-flex h-9 items-center rounded-lg border border-line bg-surface px-3.5 text-sm font-medium text-ink hover:border-brand/40"
              >
                Load sample data
              </Link>
            </div>
          </Card>
        )}
      </section>

      {showItem ? <ItemForm onClose={() => setShowItem(false)} /> : null}
      {showExpense ? <ExpenseForm onClose={() => setShowExpense(false)} /> : null}
    </div>
  )
}
