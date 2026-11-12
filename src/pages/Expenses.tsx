import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarDays, Pencil, PieChart, Plus, ReceiptText, Trash2, TrendingUp, Wallet } from 'lucide-react'
import {
  categoryLabel,
  currentMonthKey,
  db,
  EXPENSE_CATEGORIES,
  formatDate,
  formatMoney,
  todayISO,
  type Expense,
  type ExpenseCategory,
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
  Input,
  PageHeader,
  SearchInput,
  Select,
  Stat,
} from '../components/ui'
import { ExpenseForm } from '../features/ExpenseForm'

export function Expenses() {
  const toast = useToast()
  const settings = useSettings()
  const [month, setMonth] = useState(currentMonthKey())
  const [category, setCategory] = useState<'all' | ExpenseCategory>('all')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [deleting, setDeleting] = useState<Expense | null>(null)
  const [busy, setBusy] = useState(false)

  const expenses = useLiveQuery(() => db.expenses.toArray(), []) ?? []
  const projects = useLiveQuery(() => db.projects.toArray(), []) ?? []

  const monthExpenses = expenses.filter((expense) => (month ? expense.date.startsWith(month) : true))
  const yearExpenses = expenses.filter((expense) => expense.date.startsWith(todayISO().slice(0, 4)))

  const query = search.trim().toLowerCase()
  const filtered = monthExpenses
    .filter((expense) => {
      if (category !== 'all' && expense.category !== category) return false
      if (!query) return true
      return [expense.vendor, expense.description, categoryLabel(EXPENSE_CATEGORIES, expense.category)]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(query))
    })
    .sort((a, b) => b.date.localeCompare(a.date))

  const total = filtered.reduce((sum, expense) => sum + expense.amount, 0)
  const yearTotal = yearExpenses.reduce((sum, expense) => sum + expense.amount, 0)

  const breakdown = EXPENSE_CATEGORIES.map((option) => ({
    ...option,
    total: monthExpenses.filter((expense) => expense.category === option.value).reduce((sum, expense) => sum + expense.amount, 0),
  }))
    .filter((entry) => entry.total > 0)
    .sort((a, b) => b.total - a.total)
  const maxCategory = Math.max(...breakdown.map((entry) => entry.total), 1)
  const periodLabel = month
    ? new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : 'All time'

  const projectName = (id?: string) => projects.find((project) => project.id === id)?.title

  const remove = async () => {
    if (!deleting) return
    setBusy(true)
    try {
      await db.expenses.delete(deleting.id)
      toast('Expense deleted')
      setDeleting(null)
    } catch {
      toast('Could not delete this expense', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Household expenses"
        subtitle="Bills, maintenance, appliances and project costs in one running record."
        action={
          <Button
            onClick={() => {
              setEditing(null)
              setShowForm(true)
            }}
            icon={<Plus className="size-4" />}
          >
            Add expense
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-3 gap-3">
        <Stat icon={<Wallet className="size-4" />} label={`Total · ${periodLabel}`} value={formatMoney(total, settings.currency, true)} />
        <Stat icon={<TrendingUp className="size-4" />} label="This year" value={formatMoney(yearTotal, settings.currency, true)} />
        <Stat icon={<ReceiptText className="size-4" />} label="Entries shown" value={filtered.length} />
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex items-center gap-2">
          <Input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="w-44"
            aria-label="Filter by month"
          />
          {month ? (
            <Button size="sm" variant="ghost" onClick={() => setMonth('')}>
              All time
            </Button>
          ) : (
            <Badge tone="brand">All time</Badge>
          )}
        </div>
        <Select
          value={category}
          onChange={(event) => setCategory(event.target.value as 'all' | ExpenseCategory)}
          className="lg:w-48"
          aria-label="Filter by category"
        >
          <option value="all">All categories</option>
          {EXPENSE_CATEGORIES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <SearchInput value={search} onChange={setSearch} placeholder="Search vendor or description..." className="flex-1" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr]">
        <div>
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Wallet className="size-6" />}
              title={expenses.length === 0 ? 'No expenses recorded yet' : 'No expenses match these filters'}
              description="Add bills, maintenance costs and project spending to understand what your home really costs."
              action={
                <Button
                  onClick={() => {
                    setEditing(null)
                    setShowForm(true)
                  }}
                  icon={<Plus className="size-4" />}
                >
                  Add your first expense
                </Button>
              }
            />
          ) : (
            <Card className="divide-y divide-line overflow-hidden">
              {filtered.map((expense) => (
                <div key={expense.id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="flex w-11 shrink-0 flex-col items-center rounded-lg border border-line bg-cream px-1 py-1.5">
                    <span className="text-sm font-semibold leading-none text-ink">{expense.date.slice(8, 10)}</span>
                    <span className="mt-0.5 text-[10px] uppercase leading-none text-muted">
                      {new Date(`${expense.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short' })}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-ink">{expense.vendor || expense.description || 'Expense'}</p>
                      <Badge>{categoryLabel(EXPENSE_CATEGORIES, expense.category)}</Badge>
                    </div>
                    <p className="truncate text-xs text-muted">
                      {expense.description || 'No description'}
                      {projectName(expense.projectId) ? ` · ${projectName(expense.projectId)}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="text-sm font-semibold text-ink">{formatMoney(expense.amount, settings.currency)}</span>
                    <IconButton
                      label="Edit expense"
                      onClick={() => {
                        setEditing(expense)
                        setShowForm(true)
                      }}
                    >
                      <Pencil className="size-4" />
                    </IconButton>
                    <IconButton label="Delete expense" onClick={() => setDeleting(expense)} className="hover:text-danger">
                      <Trash2 className="size-4" />
                    </IconButton>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <PieChart className="size-4 text-brand" />
              <h2 className="text-sm font-semibold text-ink">Spending by category</h2>
            </div>
            <p className="mb-4 text-xs text-muted">{periodLabel}</p>
            {breakdown.length > 0 ? (
              <div className="space-y-3">
                {breakdown.map((entry) => (
                  <div key={entry.value}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-ink">{entry.label}</span>
                      <span className="text-muted">{formatMoney(entry.total, settings.currency)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-black/6">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${(entry.total / maxCategory) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">No spending recorded for this period.</p>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 text-brand">
              <CalendarDays className="size-4" />
              <h2 className="text-sm font-semibold text-ink">Year at a glance</h2>
            </div>
            <div className="mt-3 flex items-end justify-between">
              <div>
                <p className="text-2xl font-semibold tracking-tight text-ink">{formatMoney(yearTotal, settings.currency)}</p>
                <p className="text-xs text-muted">Total household spend in {todayISO().slice(0, 4)}</p>
              </div>
              <span className="text-xs text-muted">{yearExpenses.length} entries</span>
            </div>
            <p className="mt-3 text-xs text-muted">
              Based on {formatDate(todayISO(), 'long')}. Add bills as they arrive to keep this accurate.
            </p>
          </Card>
        </div>
      </div>

      {showForm ? (
        <ExpenseForm
          initial={editing}
          onClose={() => {
            setShowForm(false)
            setEditing(null)
          }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this expense?"
        message="This expense will be removed from your household records. This cannot be undone."
        busy={busy}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
