import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarClock, Check, Pencil, Plus, Trash2, TriangleAlert, Wrench } from 'lucide-react'
import {
  addDaysISO,
  categoryLabel,
  db,
  daysUntil,
  formatDate,
  formatDue,
  formatMoney,
  intervalLabel,
  MAINTENANCE_CATEGORIES,
  now,
  todayISO,
  type MaintenanceTask,
} from '../lib/db'
import { useSettings } from '../lib/hooks'
import { useToast } from '../components/toastContext'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  IconButton,
  PageHeader,
  SearchInput,
  Stat,
  Tabs,
} from '../components/ui'
import { MaintenanceForm } from '../features/MaintenanceForm'

type Filter = 'all' | 'overdue' | 'soon' | 'upcoming'

export function Maintenance() {
  const toast = useToast()
  const settings = useSettings()
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<MaintenanceTask | null>(null)
  const [deleting, setDeleting] = useState<MaintenanceTask | null>(null)
  const [busy, setBusy] = useState(false)

  const tasks = useLiveQuery(() => db.maintenance.toArray(), []) ?? []
  const providers = useLiveQuery(() => db.providers.toArray(), []) ?? []

  const providerName = (id?: string) => providers.find((provider) => provider.id === id)?.name

  const overdue = tasks.filter((task) => daysUntil(task.nextDue) < 0)
  const dueSoon = tasks.filter((task) => {
    const days = daysUntil(task.nextDue)
    return days >= 0 && days <= 30
  })

  const query = search.trim().toLowerCase()
  const filtered = tasks
    .filter((task) => {
      const days = daysUntil(task.nextDue)
      if (filter === 'overdue' && days >= 0) return false
      if (filter === 'soon' && (days < 0 || days > 30)) return false
      if (filter === 'upcoming' && days <= 30) return false
      if (!query) return true
      return [task.title, task.category, task.notes, providerName(task.providerId)]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(query))
    })
    .sort((a, b) => a.nextDue.localeCompare(b.nextDue))

  const markDone = async (task: MaintenanceTask) => {
    const today = todayISO()
    try {
      await db.maintenance.update(task.id, {
        lastCompleted: today,
        nextDue: addDaysISO(task.intervalDays, today),
        updatedAt: now(),
      })
      toast(`"${task.title}" marked complete`)
    } catch {
      toast('Could not update this task', 'error')
    }
  }

  const remove = async () => {
    if (!deleting) return
    setBusy(true)
    try {
      await db.maintenance.delete(deleting.id)
      toast('Task deleted')
      setDeleting(null)
    } catch {
      toast('Could not delete this task', 'error')
    } finally {
      setBusy(false)
    }
  }

  const dueTone = (task: MaintenanceTask): 'danger' | 'amber' | 'ok' | 'neutral' => {
    const days = daysUntil(task.nextDue)
    if (days < 0) return 'danger'
    if (days <= 7) return 'amber'
    if (days <= 30) return 'neutral'
    return 'ok'
  }

  return (
    <div>
      <PageHeader
        title="Home maintenance"
        subtitle="Recurring jobs, service history and the next thing that needs doing."
        action={
          <Button
            onClick={() => {
              setEditing(null)
              setShowForm(true)
            }}
            icon={<Plus className="size-4" />}
          >
            Add task
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-3 gap-3">
        <Stat icon={<TriangleAlert className="size-4" />} label="Overdue" value={overdue.length} tone={overdue.length > 0 ? 'danger' : 'brand'} />
        <Stat icon={<CalendarClock className="size-4" />} label="Due in 30 days" value={dueSoon.length} tone="amber" />
        <Stat icon={<Wrench className="size-4" />} label="Total tasks" value={tasks.length} />
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Tabs
          value={filter}
          onChange={setFilter}
          tabs={[
            { value: 'all', label: 'All', count: tasks.length },
            { value: 'overdue', label: 'Overdue', count: overdue.length },
            { value: 'soon', label: 'Due soon', count: dueSoon.length },
            { value: 'upcoming', label: 'Upcoming' },
          ]}
        />
        <SearchInput value={search} onChange={setSearch} placeholder="Search maintenance..." className="flex-1" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Wrench className="size-6" />}
          title={tasks.length === 0 ? 'No maintenance tasks yet' : 'Nothing matches this view'}
          description="Add the jobs you do around the house — air conditioner servicing, gutters, smoke alarms — and set how often they repeat."
          action={
            <Button
              onClick={() => {
                setEditing(null)
                setShowForm(true)
              }}
              icon={<Plus className="size-4" />}
            >
              Add a maintenance task
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((task) => {
            const tone = dueTone(task)
            const days = daysUntil(task.nextDue)
            return (
              <Card key={task.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div
                  className={
                    tone === 'danger'
                      ? 'flex size-10 shrink-0 items-center justify-center rounded-xl bg-danger-soft text-danger'
                      : tone === 'amber'
                        ? 'flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-soft text-amber'
                        : 'flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand'
                  }
                >
                  <Wrench className="size-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-ink">{task.title}</h3>
                    <Badge tone={tone === 'danger' ? 'danger' : tone === 'amber' ? 'amber' : tone === 'ok' ? 'ok' : 'neutral'}>
                      {formatDue(task.nextDue)}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {categoryLabel(MAINTENANCE_CATEGORIES, task.category)} · {intervalLabel(task.intervalDays)}
                    {providerName(task.providerId) ? ` · ${providerName(task.providerId)}` : ''}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted/85">
                    Next {formatDate(task.nextDue)}
                    {task.lastCompleted ? ` · Last done ${formatDate(task.lastCompleted)}` : ''}
                    {task.estimatedCost !== undefined && task.estimatedCost > 0
                      ? ` · Est. ${formatMoney(task.estimatedCost, settings.currency)}`
                      : ''}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <Button
                    size="sm"
                    variant={days < 0 ? 'primary' : 'soft'}
                    onClick={() => markDone(task)}
                    icon={<Check className="size-4" />}
                  >
                    Done
                  </Button>
                  <IconButton
                    label={`Edit ${task.title}`}
                    onClick={() => {
                      setEditing(task)
                      setShowForm(true)
                    }}
                  >
                    <Pencil className="size-4" />
                  </IconButton>
                  <IconButton label={`Delete ${task.title}`} onClick={() => setDeleting(task)} className="hover:text-danger">
                    <Trash2 className="size-4" />
                  </IconButton>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {showForm ? (
        <MaintenanceForm
          initial={editing}
          onClose={() => {
            setShowForm(false)
            setEditing(null)
          }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this maintenance task?"
        message={`"${deleting?.title ?? ''}" will stop appearing in your reminders. This cannot be undone.`}
        busy={busy}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
