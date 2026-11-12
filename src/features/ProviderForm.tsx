import { useState } from 'react'
import { Star } from 'lucide-react'
import { db, now, TRADES, uid, type Provider } from '../lib/db'
import { trimmed } from '../lib/form'
import { useToast } from '../components/toastContext'
import { Button, Field, Input, Modal, Select, Textarea } from '../components/ui'

export function ProviderForm({ initial, onClose }: { initial?: Provider | null; onClose: () => void }) {
  const toast = useToast()

  const [name, setName] = useState(initial?.name ?? '')
  const [trade, setTrade] = useState(initial?.trade ?? 'Electrician')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [website, setWebsite] = useState(initial?.website ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [rating, setRating] = useState(initial?.rating ?? 0)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim()) {
      setError('Give the provider a name.')
      return
    }
    setSaving(true)
    try {
      const timestamp = now()
      await db.providers.put({
        id: initial?.id ?? uid(),
        name: name.trim(),
        trade,
        phone: trimmed(phone),
        email: trimmed(email),
        website: trimmed(website),
        address: trimmed(address),
        rating: rating > 0 ? rating : undefined,
        notes: trimmed(notes),
        createdAt: initial?.createdAt ?? timestamp,
        updatedAt: timestamp,
      })
      toast(initial ? 'Provider updated' : 'Provider saved')
      onClose()
    } catch {
      setError('Could not save this provider. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      onClose={onClose}
      title={initial ? 'Edit provider' : 'Add service provider'}
      description="Keep your trusted trades and their contact details handy."
      size="lg"
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business name" htmlFor="provider-name">
            <Input
              id="provider-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Bright Spark Electrical"
              autoFocus
            />
          </Field>
          <Field label="Trade" htmlFor="provider-trade">
            <Select id="provider-trade" value={trade} onChange={(event) => setTrade(event.target.value)}>
              {TRADES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Phone" htmlFor="provider-phone">
            <Input
              id="provider-phone"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="0400 000 000"
            />
          </Field>
          <Field label="Email" htmlFor="provider-email">
            <Input
              id="provider-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
            />
          </Field>
          <Field label="Website" htmlFor="provider-website">
            <Input
              id="provider-website"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
              placeholder="https://"
            />
          </Field>
          <Field label="Address" htmlFor="provider-address">
            <Input
              id="provider-address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Optional"
            />
          </Field>
        </div>

        <Field label="Your rating">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                aria-label={`${value} star${value === 1 ? '' : 's'}`}
                onClick={() => setRating(rating === value ? 0 : value)}
                className="rounded p-0.5 text-amber transition-transform hover:scale-110"
              >
                <Star className="size-6" fill={value <= rating ? 'currentColor' : 'none'} />
              </button>
            ))}
            {rating > 0 ? <span className="ml-2 text-sm text-muted">{rating}/5</span> : <span className="ml-2 text-sm text-muted">No rating</span>}
          </div>
        </Field>

        <Field label="Notes" htmlFor="provider-notes">
          <Textarea
            id="provider-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Licence number, availability, how you found them..."
          />
        </Field>

        {error ? <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p> : null}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {initial ? 'Save changes' : 'Add provider'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
