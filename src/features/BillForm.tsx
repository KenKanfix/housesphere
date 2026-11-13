import { useState } from 'react'
import {
  addDaysISO,
  BILL_FREQUENCIES,
  db,
  EXPENSE_CATEGORIES,
  now,
  uid,
  type ExpenseCategory,
  type RecurringBill,
} from '../lib/db'
import { toNumber, trimmed } from '../lib/form'
import { useToast } from '../components/toastContext'
import { Button, Field, Input, Modal, Select, Textarea } from '../components/ui'

export function BillForm({ initial, onClose }: { initial?: RecurringBill | null; onClose: () => void }) {
  const toast = useToast()

  const [name, setName] = useState(initial?.name ?? '')
  const [category, setCategory] = useState<ExpenseCategory>(initial?.category ?? 'electricity')
  const [amount, setAmount] = useState(initial?.amount !== undefined ? String(initial.amount) : '')
  const [frequencyDays, setFrequencyDays] = useState(initial?.frequencyDays ?? 30)
  const [nextDue, setNextDue] = useState(initial?.nextDue ?? addDaysISO(30))
  const [provider, setProvider] = useState(initial?.provider ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim()) {
      setError('Give the bill a name.')
      return
    }
    if (!nextDue) {
      setError('Add the next due date.')
      return
    }
    setSaving(true)
    try {
      const timestamp = now()
      await db.bills.put({
        id: initial?.id ?? uid(),
        name: name.trim(),
        category,
        amount: toNumber(amount),
        frequencyDays,
        nextDue,
        lastPaid: initial?.lastPaid,
        provider: trimmed(provider),
        notes: trimmed(notes),
        createdAt: initial?.createdAt ?? timestamp,
        updatedAt: timestamp,
      })
      toast(initial ? 'Bill updated' : 'Recurring bill added')
      onClose()
    } catch {
      setError('Could not save this bill. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      onClose={onClose}
      title={initial ? 'Edit recurring bill' : 'Add recurring bill'}
      description="Track rates, utilities and insurance so nothing slips through."
      size="lg"
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Bill" htmlFor="bill-name">
          <Input
            id="bill-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Council rates"
            autoFocus
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" htmlFor="bill-category">
            <Select
              id="bill-category"
              value={category}
              onChange={(event) => setCategory(event.target.value as ExpenseCategory)}
            >
              {EXPENSE_CATEGORIES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Repeats" htmlFor="bill-frequency">
            <Select
              id="bill-frequency"
              value={frequencyDays}
              onChange={(event) => setFrequencyDays(Number(event.target.value))}
            >
              {BILL_FREQUENCIES.map((option) => (
                <option key={option.days} value={option.days}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Typical amount" htmlFor="bill-amount" hint="Used to estimate your monthly spend.">
            <Input
              id="bill-amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
            />
          </Field>
          <Field label="Next due" htmlFor="bill-next">
            <Input id="bill-next" type="date" value={nextDue} onChange={(event) => setNextDue(event.target.value)} />
          </Field>
        </div>

        <Field label="Provider" htmlFor="bill-provider">
          <Input
            id="bill-provider"
            value={provider}
            onChange={(event) => setProvider(event.target.value)}
            placeholder="AGL, Origin, council, insurer..."
          />
        </Field>

        <Field label="Notes" htmlFor="bill-notes">
          <Textarea
            id="bill-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Account number, instalment plan, payment details..."
          />
        </Field>

        {error ? <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p> : null}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {initial ? 'Save changes' : 'Add bill'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
