import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, now, todayISO, uid, type Warranty } from '../lib/db'
import { trimmed } from '../lib/form'
import { useToast } from '../components/toastContext'
import { Button, Field, Input, Modal, Select, Textarea } from '../components/ui'
import { PhotoInput } from '../components/PhotoInput'

export function WarrantyForm({ initial, onClose }: { initial?: Warranty | null; onClose: () => void }) {
  const toast = useToast()
  const items = useLiveQuery(() => db.items.orderBy('name').toArray(), []) ?? []

  const [title, setTitle] = useState(initial?.title ?? '')
  const [itemId, setItemId] = useState(initial?.itemId ?? '')
  const [provider, setProvider] = useState(initial?.provider ?? '')
  const [purchaseDate, setPurchaseDate] = useState(initial?.purchaseDate ?? '')
  const [expiryDate, setExpiryDate] = useState(initial?.expiryDate ?? '')
  const [receipt, setReceipt] = useState<string | undefined>(initial?.receipt)
  const [fileName, setFileName] = useState<string | undefined>(initial?.fileName)
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!title.trim()) {
      setError('Give the warranty a name.')
      return
    }
    if (!expiryDate) {
      setError('Add the warranty expiry date.')
      return
    }
    setSaving(true)
    try {
      const timestamp = now()
      await db.warranties.put({
        id: initial?.id ?? uid(),
        title: title.trim(),
        itemId: itemId || undefined,
        provider: trimmed(provider),
        purchaseDate: purchaseDate || undefined,
        expiryDate,
        receipt,
        fileName,
        notes: trimmed(notes),
        createdAt: initial?.createdAt ?? timestamp,
        updatedAt: timestamp,
      })
      toast(initial ? 'Warranty updated' : 'Warranty saved')
      onClose()
    } catch {
      setError('Could not save this warranty. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      onClose={onClose}
      title={initial ? 'Edit warranty' : 'Add warranty'}
      description="Keep the expiry date and receipt together."
      size="lg"
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Warranty name" htmlFor="warranty-title">
          <Input
            id="warranty-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Fridge — 5 year cover"
            autoFocus
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Linked item" htmlFor="warranty-item">
            <Select id="warranty-item" value={itemId} onChange={(event) => setItemId(event.target.value)}>
              <option value="">No linked item</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Provider or retailer" htmlFor="warranty-provider">
            <Input
              id="warranty-provider"
              value={provider}
              onChange={(event) => setProvider(event.target.value)}
              placeholder="Samsung, Harvey Norman..."
            />
          </Field>
          <Field label="Purchase date" htmlFor="warranty-purchase">
            <Input
              id="warranty-purchase"
              type="date"
              value={purchaseDate}
              onChange={(event) => setPurchaseDate(event.target.value)}
            />
          </Field>
          <Field label="Expiry date" htmlFor="warranty-expiry">
            <Input
              id="warranty-expiry"
              type="date"
              value={expiryDate}
              onChange={(event) => setExpiryDate(event.target.value)}
              min={todayISO()}
            />
          </Field>
        </div>

        <PhotoInput
          value={receipt}
          onChange={(value) => {
            setReceipt(value)
            if (!value) setFileName(undefined)
            else if (!fileName) setFileName('Receipt photo')
          }}
          label="Receipt photo"
        />

        <Field label="Notes" htmlFor="warranty-notes">
          <Textarea
            id="warranty-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Claim phone number, policy number, what is covered..."
          />
        </Field>

        {error ? <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p> : null}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {initial ? 'Save changes' : 'Add warranty'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
