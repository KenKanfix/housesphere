import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  addDaysISO,
  BILL_FREQUENCIES,
  db,
  EXPENSE_CATEGORIES,
  frequencyToDays,
  now,
  todayISO,
  uid,
  type BillPhoto,
  type Expense,
  type ExpenseCategory,
} from '../lib/db'
import { toNumber, trimmed } from '../lib/form'
import type { ScanKind } from '../lib/ai'
import { useToast } from '../components/toastContext'
import { Button, Field, Input, Modal, Select, Textarea } from '../components/ui'
import { ScanCapture, type ScanPhotos } from '../components/ScanCapture'

export function ExpenseForm({
  initial,
  defaultProjectId,
  onClose,
}: {
  initial?: Expense | null
  defaultProjectId?: string
  onClose: () => void
}) {
  const toast = useToast()
  const projects = useLiveQuery(() => db.projects.orderBy('title').toArray(), []) ?? []

  const [date, setDate] = useState(initial?.date ?? todayISO())
  const [category, setCategory] = useState<ExpenseCategory>(initial?.category ?? (defaultProjectId ? 'project' : 'other'))
  const [amount, setAmount] = useState(initial?.amount !== undefined ? String(initial.amount) : '')
  const [vendor, setVendor] = useState(initial?.vendor ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [projectId, setProjectId] = useState(initial?.projectId ?? defaultProjectId ?? '')
  const [billScan, setBillScan] = useState<{ data: Record<string, unknown>; photos: ScanPhotos } | null>(null)
  const [addAsBill, setAddAsBill] = useState(false)
  const [billFrequency, setBillFrequency] = useState(30)
  const [billNextDue, setBillNextDue] = useState(addDaysISO(30))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const applyScan = (data: Record<string, unknown>, scanKind: ScanKind, photos: ScanPhotos) => {
    const str = (key: string) => (typeof data[key] === 'string' ? (data[key] as string) : '')

    if (scanKind === 'label') {
      const name = str('name')
      const model = str('model')
      const brand = str('brand')
      if (name || model) setDescription([name, model].filter(Boolean).join(' '))
      if (brand) setVendor(brand)
      setBillScan(null)
      setError('')
      toast('Details filled from photo')
      return
    }

    let filled = 0
    const amountValue = Number(data.amount)
    if (Number.isFinite(amountValue) && amountValue > 0) {
      setAmount(String(amountValue))
      filled += 1
    }
    const dateValue = str('date')
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      setDate(dateValue)
      filled += 1
    }
    const categoryValue = str('category')
    if (EXPENSE_CATEGORIES.some((entry) => entry.value === categoryValue)) {
      setCategory(categoryValue as ExpenseCategory)
      filled += 1
    }
    const vendorValue = str('vendor')
    if (vendorValue) {
      setVendor(vendorValue)
      filled += 1
    }
    const description = str('description')
    const account = str('accountNumber')
    if (description) {
      setDescription(description)
      filled += 1
    } else if (account) {
      setDescription(`Account ${account}`)
      filled += 1
    }

    setError('')
    setBillScan({ data, photos })
    if (scanKind === 'bill') {
      const frequencyDays = frequencyToDays(str('frequency'))
      const dueValue = str('dueDate')
      setBillFrequency(frequencyDays)
      setBillNextDue(/^\d{4}-\d{2}-\d{2}$/.test(dueValue) ? dueValue : addDaysISO(frequencyDays))
      setAddAsBill(true)
    }
    toast(filled > 0 ? 'Details filled from photo' : 'Could not read details — add them manually', filled > 0 ? 'success' : 'error')
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const parsedAmount = toNumber(amount)
    if (parsedAmount === undefined || parsedAmount <= 0) {
      setError('Enter an amount greater than zero.')
      return
    }
    if (!date) {
      setError('Choose a date.')
      return
    }
    const createBill = addAsBill
    if (createBill && !billNextDue) {
      setError('Add the next due date for the recurring bill.')
      return
    }
    setSaving(true)
    try {
      const timestamp = now()
      await db.transaction('rw', [db.expenses, db.bills, db.billPhotos], async () => {
        await db.expenses.put({
          id: initial?.id ?? uid(),
          date,
          category,
          amount: parsedAmount,
          vendor: trimmed(vendor),
          description: trimmed(description),
          projectId: projectId || undefined,
          itemId: initial?.itemId,
          createdAt: initial?.createdAt ?? timestamp,
          updatedAt: timestamp,
        })
        if (createBill) {
          const scan = billScan
          const account = scan && typeof scan.data.accountNumber === 'string' ? scan.data.accountNumber : ''
          const billId = uid()
          await db.bills.put({
            id: billId,
            name: trimmed(description) || (trimmed(vendor) ? `${trimmed(vendor)} bill` : 'Recurring bill'),
            category,
            amount: parsedAmount,
            frequencyDays: billFrequency,
            nextDue: billNextDue,
            provider: trimmed(vendor),
            notes: account ? `Account ${account}` : undefined,
            createdAt: timestamp,
            updatedAt: timestamp,
          })
          const photos: BillPhoto[] = []
          if (scan?.photos.front) {
            photos.push({
              id: uid(),
              billId,
              kind: 'front',
              data: scan.photos.frontArchive ?? scan.photos.front,
              createdAt: timestamp,
            })
          }
          if (scan?.photos.back) {
            photos.push({
              id: uid(),
              billId,
              kind: 'back',
              data: scan.photos.backArchive ?? scan.photos.back,
              createdAt: timestamp,
            })
          }
          if (photos.length > 0) await db.billPhotos.bulkPut(photos)
        }
      })
      toast(initial ? 'Expense updated' : createBill ? 'Expense recorded and recurring bill saved' : 'Expense recorded')
      onClose()
    } catch {
      setError('Could not save this expense. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      onClose={onClose}
      title={initial ? 'Edit expense' : 'Add expense'}
      description="Bills, maintenance, appliances and project costs."
      size="lg"
    >
      <form onSubmit={submit} className="space-y-4">
        <ScanCapture
          onExtracted={applyScan}
          description="Snap a receipt, utility bill or appliance label and the fields are filled in."
          options={[
            { value: 'receipt', label: 'Receipt' },
            { value: 'bill', label: 'Utility bill' },
            { value: 'label', label: 'Appliance label' },
          ]}
        />

        {!initial ? (
          <div className="rounded-xl border border-line bg-cream/60 p-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={addAsBill}
                onChange={(event) => setAddAsBill(event.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-brand"
              />
              <span>
                <span className="block text-sm font-medium text-ink">Also save as a recurring bill</span>
                <span className="mt-0.5 block text-xs text-muted">
                  Tick this any time — even after scanning — to add it to Recurring bills and get reminded before it is due. Any
                  scanned photo is kept until you mark it paid.
                </span>
              </span>
            </label>
            {addAsBill ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Next due" htmlFor="bill-next-due">
                  <Input
                    id="bill-next-due"
                    type="date"
                    value={billNextDue}
                    onChange={(event) => setBillNextDue(event.target.value)}
                  />
                </Field>
                <Field label="Repeats" htmlFor="bill-frequency">
                  <Select
                    id="bill-frequency"
                    value={billFrequency}
                    onChange={(event) => setBillFrequency(Number(event.target.value))}
                  >
                    {BILL_FREQUENCIES.map((option) => (
                      <option key={option.days} value={option.days}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Amount" htmlFor="expense-amount">
            <Input
              id="expense-amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
              autoFocus
            />
          </Field>
          <Field label="Date" htmlFor="expense-date">
            <Input id="expense-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </Field>
          <Field label="Category" htmlFor="expense-category">
            <Select
              id="expense-category"
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
          <Field label="Vendor or payee" htmlFor="expense-vendor">
            <Input
              id="expense-vendor"
              value={vendor}
              onChange={(event) => setVendor(event.target.value)}
              placeholder="AGL, Bunnings, plumber..."
            />
          </Field>
        </div>

        <Field label="Description" htmlFor="expense-description">
          <Textarea
            id="expense-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What was this for?"
            className="min-h-20"
          />
        </Field>

        <Field label="Link to project" htmlFor="expense-project" hint="Project expenses count towards that project's budget.">
          <Select id="expense-project" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            <option value="">Not linked to a project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </Select>
        </Field>

        {error ? <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p> : null}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {initial ? 'Save changes' : 'Add expense'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
