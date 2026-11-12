import { useState } from 'react'
import { db, now, todayISO, uid } from '../lib/db'
import { toNumber } from '../lib/form'
import { useToast } from '../components/toastContext'
import { Button, Field, Input, Modal, Textarea } from '../components/ui'

export function ServiceRecordForm({
  providerId,
  providerName,
  onClose,
}: {
  providerId: string
  providerName: string
  onClose: () => void
}) {
  const toast = useToast()
  const [date, setDate] = useState(todayISO())
  const [description, setDescription] = useState('')
  const [cost, setCost] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!description.trim()) {
      setError('Describe the work that was done.')
      return
    }
    setSaving(true)
    try {
      await db.serviceRecords.put({
        id: uid(),
        providerId,
        date,
        description: description.trim(),
        cost: toNumber(cost),
        createdAt: now(),
      })
      toast('Service history updated')
      onClose()
    } catch {
      setError('Could not save this record. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} title="Log service" description={`Record work completed by ${providerName}.`}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date" htmlFor="service-date">
            <Input id="service-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </Field>
          <Field label="Cost" htmlFor="service-cost">
            <Input
              id="service-cost"
              type="number"
              min="0"
              step="0.01"
              value={cost}
              onChange={(event) => setCost(event.target.value)}
              placeholder="0.00"
            />
          </Field>
        </div>

        <Field label="Work completed" htmlFor="service-description">
          <Textarea
            id="service-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What did they do? Any parts replaced or follow-up needed?"
            autoFocus
          />
        </Field>

        {error ? <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p> : null}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Save record
          </Button>
        </div>
      </form>
    </Modal>
  )
}
