import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarClock, CheckCircle2, Pencil, Plus, Repeat, Trash2, Wallet } from 'lucide-react'
import {
  addDaysISO,
  billFrequencyLabel,
  categoryLabel,
  db,
  daysUntil,
  EXPENSE_CATEGORIES,
  formatDue,
  formatMoney,
  monthlyBillCost,
  now,
  todayISO,
  uid,
  type RecurringBill,
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
} from '../components/ui'
import { BillForm } from '../features/BillForm'

export function Bills() {
  const toast = useToast()
  const settings = useSettings()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<RecurringBill | null>(null)
  const [deleting, setDeleting] = useState<RecurringBill | null>(null)
  const [paying, setPaying] = useState<RecurringBill | null>(null)
  const [busy, setBusy] = useState(false)

  const bills = useLiveQuery(() => db.bills.toArray(), []) ?? []
  const sorted = [...bills].sort((a, b) => a.nextDue.localeCompare(b.nextDue))

  const dueSoon = bills.filter((bill) => daysUntil(bill.nextDue) <= 14)
  const overdue = bills.filter((bill) => daysUntil(bill.nextDue) < 0)
  const monthlyEstimate = bills.reduce((sum, bill) => sum + monthlyBillCost(bill), 0)
  const yearlyEstimate = monthlyEstimate * 12

  const billTone = (bill: RecurringBill) => {
    const days = daysUntil(bill.nextDue)
    if (days < 0) return 'danger' as const
    if (days <= 7) return 'amber' as const
    return 'neutral' as const
  }

  const markPaid = async () => {
    if (!paying) return
    const bill = paying
    setBusy(true)
    try {
      const timestamp = now()
      await db.transaction('rw', [db.bills, db.expenses], async () => {
        if (bill.amount !== undefined && bill.amount > 0) {
          await db.expenses.put({
            id: uid(),
            date: todayISO(),
            category: bill.category,
            amount: bill.amount,
            vendor: bill.provider || bill.name,
            description: `${bill.name} bill`,
            createdAt: timestamp,
            updatedAt: timestamp,
          })
        }
        await db.bills.put({
          ...bill,
          lastPaid: todayISO(),
          nextDue: addDaysISO(bill.frequencyDays),
          updatedAt: timestamp,
        })
      })
      toast(bill.amount ? 'Payment logged and bill advanced' : 'Bill marked as paid')
      setPaying(null)
    } catch {
      toast('Could not update this bill', 'error')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!deleting) return
    setBusy(true)
    try {
      await db.bills.delete(deleting.id)
      toast('Bill deleted')
      setDeleting(null)
    } catch {
      toast('Could not delete this bill', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Recurring bills"
        subtitle="Rates, utilities and insurance — see what is due and log payments as they happen."
        action={
          <Button
            onClick={() => {
              setEditing(null)
              setShowForm(true)
            }}
            icon={<Plus className="size-4" />}
          >
            Add bill
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-3 gap-3">
        <Stat
          icon={<CalendarClock className="size-4" />}
          label="Due in 14 days"
          value={dueSoon.length}
          hint={overdue.length > 0 ? `${overdue.length} overdue` : 'Nothing overdue'}
          tone={overdue.length > 0 ? 'danger' : 'brand'}
        />
        <Stat icon={<Wallet className="size-4" />} label="Estimated monthly" value={formatMoney(monthlyEstimate, settings.currency, true)} />
        <Stat icon={<Repeat className="size-4" />} label="Estimated yearly" value={formatMoney(yearlyEstimate, settings.currency, true)} />
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={<Repeat className="size-6" />}
          title="No recurring bills yet"
          description="Add council rates, electricity, gas, water or insurance and HouseSphere will remind you before each one is due."
          action={
            <Button
              onClick={() => {
                setEditing(null)
                setShowForm(true)
              }}
              icon={<Plus className="size-4" />}
            >
              Add your first bill
            </Button>
          }
        />
      ) : (
        <Card className="divide-y divide-line overflow-hidden">
          {sorted.map((bill) => (
            <div key={bill.id} className="flex items-center gap-3 px-4 py-3.5">
              <div className="flex w-11 shrink-0 flex-col items-center rounded-lg border border-line bg-cream px-1 py-1.5">
                <span className="text-sm font-semibold leading-none text-ink">{bill.nextDue.slice(8, 10)}</span>
                <span className="mt-0.5 text-[10px] uppercase leading-none text-muted">
                  {new Date(`${bill.nextDue}T00:00:00`).toLocaleDateString(undefined, { month: 'short' })}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium text-ink">{bill.name}</p>
                  <Badge>{categoryLabel(EXPENSE_CATEGORIES, bill.category)}</Badge>
                  <Badge tone={billTone(bill)}>{formatDue(bill.nextDue)}</Badge>
                </div>
                <p className="truncate text-xs text-muted">
                  {billFrequencyLabel(bill.frequencyDays)}
                  {bill.provider ? ` · ${bill.provider}` : ''}
                  {bill.lastPaid ? ` · last paid ${bill.lastPaid}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <span className="mr-1 text-sm font-semibold text-ink">
                  {bill.amount !== undefined ? formatMoney(bill.amount, settings.currency) : '—'}
                </span>
                <Button size="sm" variant="soft" onClick={() => setPaying(bill)} icon={<CheckCircle2 className="size-4" />}>
                  Paid
                </Button>
                <IconButton
                  label="Edit bill"
                  onClick={() => {
                    setEditing(bill)
                    setShowForm(true)
                  }}
                >
                  <Pencil className="size-4" />
                </IconButton>
                <IconButton label="Delete bill" onClick={() => setDeleting(bill)} className="hover:text-danger">
                  <Trash2 className="size-4" />
                </IconButton>
              </div>
            </div>
          ))}
        </Card>
      )}

      {showForm ? (
        <BillForm
          initial={editing}
          onClose={() => {
            setShowForm(false)
            setEditing(null)
          }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(paying)}
        title="Mark this bill as paid?"
        message={
          paying?.amount !== undefined
            ? `${paying?.name} will be logged as an expense and the next due date will move forward.`
            : `${paying?.name} will be marked as paid and the next due date will move forward.`
        }
        confirmLabel="Mark paid"
        busy={busy}
        onConfirm={markPaid}
        onCancel={() => setPaying(null)}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this bill?"
        message="This recurring bill will be removed. This cannot be undone."
        busy={busy}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
