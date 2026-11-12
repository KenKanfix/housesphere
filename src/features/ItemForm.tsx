import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  db,
  ITEM_CATEGORIES,
  now,
  uid,
  type Item,
  type ItemCategory,
} from '../lib/db'
import { toNumber, trimmed } from '../lib/form'
import { useToast } from '../components/toastContext'
import { Button, Field, Input, Modal, Select, Textarea } from '../components/ui'
import { PhotoInput } from '../components/PhotoInput'

export function ItemForm({
  initial,
  defaultRoomId,
  onClose,
}: {
  initial?: Item | null
  defaultRoomId?: string
  onClose: () => void
}) {
  const toast = useToast()
  const rooms = useLiveQuery(() => db.rooms.orderBy('name').toArray(), []) ?? []

  const [name, setName] = useState(initial?.name ?? '')
  const [roomId, setRoomId] = useState(initial?.roomId ?? defaultRoomId ?? '')
  const [category, setCategory] = useState<ItemCategory>(initial?.category ?? 'Appliance')
  const [brand, setBrand] = useState(initial?.brand ?? '')
  const [model, setModel] = useState(initial?.model ?? '')
  const [serial, setSerial] = useState(initial?.serial ?? '')
  const [purchaseDate, setPurchaseDate] = useState(initial?.purchaseDate ?? '')
  const [price, setPrice] = useState(initial?.price !== undefined ? String(initial.price) : '')
  const [photo, setPhoto] = useState<string | undefined>(initial?.photo)
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const effectiveRoomId = roomId || rooms[0]?.id || ''

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim()) {
      setError('Give the item a name.')
      return
    }
    if (!effectiveRoomId) {
      setError('Choose a room.')
      return
    }
    setSaving(true)
    try {
      const timestamp = now()
      const item: Item = {
        id: initial?.id ?? uid(),
        name: name.trim(),
        roomId: effectiveRoomId,
        category,
        brand: trimmed(brand),
        model: trimmed(model),
        serial: trimmed(serial),
        purchaseDate: purchaseDate || undefined,
        price: toNumber(price),
        photo,
        notes: trimmed(notes),
        createdAt: initial?.createdAt ?? timestamp,
        updatedAt: timestamp,
      }
      await db.items.put(item)
      toast(initial ? 'Item updated' : 'Item added to your inventory')
      onClose()
    } catch {
      setError('Could not save this item. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      onClose={onClose}
      title={initial ? 'Edit item' : 'Add inventory item'}
      description="Track the things you own, room by room."
      size="lg"
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Item name" htmlFor="item-name">
          <Input
            id="item-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. French door fridge"
            autoFocus
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Room" htmlFor="item-room">
            <Select id="item-room" value={effectiveRoomId} onChange={(event) => setRoomId(event.target.value)}>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Category" htmlFor="item-category">
            <Select id="item-category" value={category} onChange={(event) => setCategory(event.target.value as ItemCategory)}>
              {ITEM_CATEGORIES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Brand" htmlFor="item-brand">
            <Input id="item-brand" value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="Samsung" />
          </Field>
          <Field label="Model" htmlFor="item-model">
            <Input id="item-model" value={model} onChange={(event) => setModel(event.target.value)} placeholder="SRF5700SD" />
          </Field>
          <Field label="Serial number" htmlFor="item-serial">
            <Input id="item-serial" value={serial} onChange={(event) => setSerial(event.target.value)} placeholder="Optional" />
          </Field>
          <Field label="Purchase date" htmlFor="item-purchase">
            <Input id="item-purchase" type="date" value={purchaseDate} onChange={(event) => setPurchaseDate(event.target.value)} />
          </Field>
          <Field label="Purchase price" htmlFor="item-price">
            <Input
              id="item-price"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="0.00"
            />
          </Field>
        </div>

        <PhotoInput value={photo} onChange={setPhoto} label="Item photo" />

        <Field label="Notes" htmlFor="item-notes">
          <Textarea
            id="item-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Where it is, filter sizes, quirks, spare parts..."
          />
        </Field>

        {error ? <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p> : null}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {initial ? 'Save changes' : 'Add item'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
