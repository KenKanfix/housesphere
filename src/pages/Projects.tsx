import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarDays, Hammer, Pencil, Plus, ReceiptText, Trash2, TrendingUp } from 'lucide-react'
import {
  db,
  formatDate,
  formatMoney,
  now,
  PROJECT_STATUSES,
  type Project,
  type ProjectStatus,
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
  Stat,
  Tabs,
} from '../components/ui'
import { ProjectForm } from '../features/ProjectForm'
import { ExpenseForm } from '../features/ExpenseForm'

type Filter = 'all' | ProjectStatus

const statusTone = (status: ProjectStatus): 'neutral' | 'brand' | 'amber' | 'ok' => {
  if (status === 'in_progress') return 'brand'
  if (status === 'on_hold') return 'amber'
  if (status === 'completed') return 'ok'
  return 'neutral'
}

export function Projects() {
  const toast = useToast()
  const settings = useSettings()
  const [filter, setFilter] = useState<Filter>('all')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)
  const [deleting, setDeleting] = useState<Project | null>(null)
  const [expenseProject, setExpenseProject] = useState<Project | null>(null)
  const [busy, setBusy] = useState(false)

  const projects = useLiveQuery(() => db.projects.toArray(), []) ?? []
  const expenses = useLiveQuery(() => db.expenses.toArray(), []) ?? []
  const providers = useLiveQuery(() => db.providers.toArray(), []) ?? []

  const spentFor = (id: string) => expenses.filter((expense) => expense.projectId === id).reduce((sum, expense) => sum + expense.amount, 0)
  const active = projects.filter((project) => project.status !== 'completed')
  const activeBudget = active.reduce((sum, project) => sum + (project.budget ?? 0), 0)
  const activeSpent = active.reduce((sum, project) => sum + spentFor(project.id), 0)

  const filtered = projects
    .filter((project) => filter === 'all' || project.status === filter)
    .sort((a, b) => b.updatedAt - a.updatedAt)

  const remove = async () => {
    if (!deleting) return
    setBusy(true)
    try {
      await db.transaction('rw', db.projects, db.expenses, async () => {
        await db.expenses.where('projectId').equals(deleting.id).modify((expense) => {
          expense.projectId = undefined
          expense.updatedAt = now()
        })
        await db.projects.delete(deleting.id)
      })
      toast('Project deleted')
      setDeleting(null)
    } catch {
      toast('Could not delete this project', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Projects & renovations"
        subtitle="Budgets, contractors, progress and before-and-after photos."
        action={
          <Button
            onClick={() => {
              setEditing(null)
              setShowForm(true)
            }}
            icon={<Plus className="size-4" />}
          >
            New project
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat icon={<Hammer className="size-4" />} label="Active projects" value={active.length} />
        <Stat icon={<TrendingUp className="size-4" />} label="Active budget" value={formatMoney(activeBudget, settings.currency, true)} />
        <Stat
          className="col-span-2 sm:col-span-1"
          icon={<ReceiptText className="size-4" />}
          label="Spent so far"
          value={formatMoney(activeSpent, settings.currency, true)}
          tone={activeBudget > 0 && activeSpent > activeBudget ? 'danger' : 'brand'}
        />
      </div>

      <div className="mb-4">
        <Tabs
          value={filter}
          onChange={setFilter}
          tabs={[
            { value: 'all', label: 'All', count: projects.length },
            { value: 'planning', label: 'Planning', count: projects.filter((project) => project.status === 'planning').length },
            { value: 'in_progress', label: 'In progress', count: projects.filter((project) => project.status === 'in_progress').length },
            { value: 'on_hold', label: 'On hold', count: projects.filter((project) => project.status === 'on_hold').length },
            { value: 'completed', label: 'Completed', count: projects.filter((project) => project.status === 'completed').length },
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Hammer className="size-6" />}
          title={projects.length === 0 ? 'No projects yet' : 'Nothing in this status'}
          description="Plan a renovation, track quotes and expenses, and keep the before-and-after photos in one place."
          action={
            <Button
              onClick={() => {
                setEditing(null)
                setShowForm(true)
              }}
              icon={<Plus className="size-4" />}
            >
              Start a project
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((project) => {
            const spent = spentFor(project.id)
            const percent = project.budget && project.budget > 0 ? (spent / project.budget) * 100 : 0
            const contractor = providers.find((provider) => provider.id === project.providerId)
            return (
              <Card key={project.id} className="overflow-hidden">
                <div className="grid h-40 grid-cols-2 gap-0.5 bg-brand-soft/40">
                  {project.beforePhoto || project.afterPhoto ? (
                    <>
                      <div className="relative overflow-hidden">
                        {project.beforePhoto ? (
                          <img src={project.beforePhoto} alt="Before" className="size-full object-cover" />
                        ) : (
                          <div className="flex size-full items-center justify-center text-brand/40">
                            <Hammer className="size-7" />
                          </div>
                        )}
                        <span className="absolute bottom-2 left-2 rounded-full bg-ink/70 px-2 py-0.5 text-[10px] font-semibold text-white">
                          Before
                        </span>
                      </div>
                      <div className="relative overflow-hidden">
                        {project.afterPhoto ? (
                          <img src={project.afterPhoto} alt="After" className="size-full object-cover" />
                        ) : (
                          <div className="flex size-full items-center justify-center text-brand/40">
                            <Hammer className="size-7" />
                          </div>
                        )}
                        <span className="absolute bottom-2 left-2 rounded-full bg-ink/70 px-2 py-0.5 text-[10px] font-semibold text-white">
                          After
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="col-span-2 flex items-center justify-center text-brand/50">
                      <Hammer className="size-10" />
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <Badge tone={statusTone(project.status)}>
                          {PROJECT_STATUSES.find((status) => status.value === project.status)?.label}
                        </Badge>
                      </div>
                      <h3 className="truncate text-base font-semibold text-ink">{project.title}</h3>
                      <p className="truncate text-xs text-muted">
                        {contractor ? `${contractor.name} · ${contractor.trade}` : 'No contractor assigned'}
                      </p>
                    </div>
                  </div>

                  {project.description ? (
                    <p className="mt-2 line-clamp-2 text-sm text-muted">{project.description}</p>
                  ) : null}

                  <div className="mt-4">
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="font-medium text-ink">
                        {formatMoney(spent, settings.currency)}
                        {project.budget ? ` of ${formatMoney(project.budget, settings.currency)}` : ' spent'}
                      </span>
                      <span className={percent > 100 ? 'font-semibold text-danger' : 'text-muted'}>
                        {project.budget ? `${Math.round(percent)}%` : 'No budget'}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/8">
                      <div
                        className={percent > 100 ? 'h-full rounded-full bg-danger' : 'h-full rounded-full bg-brand'}
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="size-3.5" />
                      {project.startDate ? formatDate(project.startDate) : 'No start date'}
                      {project.targetDate ? ` → ${formatDate(project.targetDate)}` : ''}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2">
                    <Button size="sm" variant="soft" onClick={() => setExpenseProject(project)} icon={<ReceiptText className="size-4" />}>
                      Add expense
                    </Button>
                    <div className="flex items-center gap-0.5">
                      <IconButton
                        label={`Edit ${project.title}`}
                        onClick={() => {
                          setEditing(project)
                          setShowForm(true)
                        }}
                      >
                        <Pencil className="size-4" />
                      </IconButton>
                      <IconButton label={`Delete ${project.title}`} onClick={() => setDeleting(project)} className="hover:text-danger">
                        <Trash2 className="size-4" />
                      </IconButton>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {showForm ? (
        <ProjectForm
          initial={editing}
          onClose={() => {
            setShowForm(false)
            setEditing(null)
          }}
        />
      ) : null}

      {expenseProject ? (
        <ExpenseForm
          defaultProjectId={expenseProject.id}
          onClose={() => setExpenseProject(null)}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this project?"
        message={`"${deleting?.title ?? ''}" will be deleted. Its expenses will stay in your records but will no longer be linked to a project.`}
        busy={busy}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
