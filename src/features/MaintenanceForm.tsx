import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  addDaysISO,
  db,
  INTERVAL_OPTIONS,
  MAINTENANCE_CATEGORIES,
  now,
  todayISO,
  uid,
  type MaintenanceCategory,
  type MaintenanceTask,
} from '../lib/db'
import { toNumber, trimmed } from '../lib/form'
import { useToast } from '../components/toastContext'
import { Button, Field, Input, Modal, Select, Textarea } from '../components/ui'

export function MaintenanceForm({ initial, onClose }: { initial?: MaintenanceTask | null; onClose: () => void }) {
  const toast = useToast()
  const providers = useLiveQuery(() => db.providers.orderBy('name').toArray(), []) ?? []

  const [title, setTitle] = useState(initial?.title ?? '')
  const [category, setCategory] = useState<MaintenanceCategory>(initial?.category ?? 'General')
  const [intervalDays, setIntervalDays] = useState(initial?.intervalDays ?? 180)
  const [lastCompleted, setLastCompleted] = useState(initial?.lastCompleted ?? '')
  const [nextDue, setNextDue] = useState(initial?.nextDue ?? todayISO())
  const [estimatedCost, setEstimatedCost] = useState(
    initial?.estimatedCost !== undefined ? String(initial.estimatedCost) : '',
  )
  const [providerId, setProviderId] = useState(initial?.providerId ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const changeInterval = (days: number) => {
    setIntervalDays(days)
    if (lastCompleted) setNextDue(addDaysISO(days, lastCompleted))
  }

  const changeLastCompleted = (value: string) => {
    setLastCompleted(value)
    if (value) setNextDue(addDaysISO(intervalDays, value))
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!title.trim()) {
      setError('Give the task a name.')
      return
    }
    if (!nextDue) {
      setError('Add the next due date.')
      return
    }
    setSaving(true)
    try {
      const timestamp = now()
      await db.maintenance.put({
        id: initial?.id ?? uid(),
        title: title.trim(),
        category,
        intervalDays,
        lastCompleted: lastCompleted || undefined,
        nextDue,
        estimatedCost: toNumber(estimatedCost),
        providerId: providerId || undefined,
        notes: trimmed(notes),
        createdAt: initial?.createdAt ?? timestamp,
        updatedAt: timestamp,
      })
      toast(initial ? 'Task updated' : 'Maintenance task added')
      onClose()
    } catch {
      setError('Could not save this task. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      onClose={onClose}
      title={initial ? 'Edit maintenance task' : 'Add maintenance task'}
      description="Set it once, then mark it done when the job is complete."
      size="lg"
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Task" htmlFor="task-title">
          <Input
            id="task-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Clean gutters"
            autoFocus
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" htmlFor="task-category">
            <Select
              id="task-category"
              value={category}
              onChange={(event) => setCategory(event.target.value as MaintenanceCategory)}
            >
              {MAINTENANCE_CATEGORIES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Repeats" htmlFor="task-interval">
            <Select id="task-interval" value={intervalDays} onChange={(event) => changeInterval(Number(event.target.value))}>
              {INTERVAL_OPTIONS.map((option) => (
                <option key={option.days} value={option.days}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Last completed" htmlFor="task-last" hint="Updates the next due date automatically.">
            <Input
              id="task-last"
              type="date"
              value={lastCompleted}
              onChange={(event) => changeLastCompleted(event.target.value)}
            />
          </Field>
          <Field label="Next due" htmlFor="task-next">
            <Input id="task-next" type="date" value={nextDue} onChange={(event) => setNextDue(event.target.value)} />
          </Field>
          <Field label="Estimated cost" htmlFor="task-cost">
            <Input
              id="task-cost"
              type="number"
              min="0"
              step="0.01"
              value={estimatedCost}
              onChange={(event) => setEstimatedCost(event.target.value)}
              placeholder="0.00"
            />
          </Field>
          <Field label="Service provider" htmlFor="task-provider">
            <Select id="task-provider" value={providerId} onChange={(event) => setProviderId(event.target.value)}>
              <option value="">No provider</option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name} — {provider.trade}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Notes" htmlFor="task-notes">
          <Textarea
            id="task-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Access details, parts needed, what to check..."
          />
        </Field>

        {error ? <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p> : null}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {initial ? 'Save changes' : 'Add task'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
